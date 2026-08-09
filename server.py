import asyncio
import json
import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import websockets

# Your AISStream API key
API_KEY = os.getenv("AIS_API_KEY", "7e517a6f641a59275f6bec6b5b6defef20237414")
AIS_WS_URL = "wss://stream.aisstream.io/v0/stream"

app = FastAPI(title="Global Vessel Tracker API")

# Active WebSocket connections from browser clients
active_websockets: set[WebSocket] = set()

# In-memory store of recent ship positions
ship_store = {}


async def broadcast_to_clients(data: dict):
    """Send JSON message to all connected web clients."""
    if not active_websockets:
        return
    message_str = json.dumps(data)
    disconnected = set()
    for client in active_websockets:
        try:
            await client.send_text(message_str)
        except Exception:
            disconnected.add(client)

    for client in disconnected:
        active_websockets.discard(client)


async def ais_stream_background_worker():
    """Background task connecting to AISStream cloud and broadcasting to browser clients."""
    while True:
        try:
            print(f"[AIS Worker] Connecting to {AIS_WS_URL}...")
            async with websockets.connect(AIS_WS_URL) as ws:
                subscribe_message = {
                    "APIKey": API_KEY,
                    "BoundingBoxes": [[[-90, -180], [90, 180]]],
                    "FilterMessageTypes": ["PositionReport"],
                }
                await ws.send(json.dumps(subscribe_message))
                print("[AIS Worker] Subscribed to global vessel position reports.")

                async for message_json in ws:
                    try:
                        data = json.loads(message_json)
                        msg_type = data.get("MessageType")

                        if msg_type == "PositionReport" and "Message" in data:
                            pos = data["Message"]["PositionReport"]
                            mmsi = str(pos.get("UserID"))
                            ship_store[mmsi] = pos
                            await broadcast_to_clients(data)
                    except Exception as parse_err:
                        print(f"[AIS Worker] Parse error: {parse_err}")

        except websockets.exceptions.ConnectionClosedError as closed_err:
            print(f"[AIS Worker] Connection closed: {closed_err}. Reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"[AIS Worker] Unexpected error: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)


@app.on_event("startup")
async def startup_event():
    # Start AISStream background consumer
    asyncio.create_task(ais_stream_background_worker())


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)

    # Immediately send currently cached ships to newly connected browser client
    for mmsi, pos in ship_store.items():
        initial_msg = {"MessageType": "PositionReport", "Message": {"PositionReport": pos}}
        await websocket.send_text(json.dumps(initial_msg))

    try:
        while True:
            # Keep connection open & listen for ping/pong or client commands
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_websockets.discard(websocket)
    except Exception:
        active_websockets.discard(websocket)


# Mount static directory for frontend CSS/JS
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def get_index():
    index_path = os.path.join(static_dir, "index.html")
    return FileResponse(index_path)


if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
