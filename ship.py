import asyncio
import json
import os
from datetime import datetime, timezone
import websockets

# Your AISStream API key
API_KEY = os.getenv("AIS_API_KEY", "7e517a6f641a59275f6bec6b5b6defef20237414")

async def connect_ais_stream():
    url = "wss://stream.aisstream.io/v0/stream"
    async with websockets.connect(url) as websocket:
        subscribe_message = {
            "APIKey": API_KEY,  # Required !
            "BoundingBoxes": [[[-90, -180], [90, 180]]],  # Required!
            # Optional: Filter specific MMSI numbers. Comment out to receive data for ALL ships globally.
            "FiltersShipMMSI": ["368207620", "367719770", "211476060"],
            "FilterMessageTypes": ["PositionReport"]  # Optional!
        }

        subscribe_message_json = json.dumps(subscribe_message)
        await websocket.send(subscribe_message_json)
        print("Connected to AISStream WebSocket. Listening for vessel position reports...", flush=True)

        try:
            async for message_json in websocket:
                message = json.loads(message_json)
                message_type = message.get("MessageType")

                if message_type == "PositionReport":
                    # the message parameter contains a key of the message type which contains the message itself
                    ais_message = message['Message']['PositionReport']
                    print(
                        f"[{datetime.now(timezone.utc)}] "
                        f"ShipId (MMSI): {ais_message['UserID']} | "
                        f"Lat: {ais_message['Latitude']} | "
                        f"Lon: {ais_message['Longitude']}",
                        flush=True
                    )
        except websockets.exceptions.ConnectionClosedError as e:
            print(f"Connection closed: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(connect_ais_stream())
