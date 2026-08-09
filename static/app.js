/**
 * Global Vessel Tracker - Client Application JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Store
    const state = {
        ships: new Map(), // MMSI -> { mmsi, lat, lon, sog, cog, lastUpdated, marker, pathLine, history }
        totalMessages: 0,
        messageRate: 0,
        recentMsgCount: 0,
        selectedMMSI: null,
        activeFilter: 'all',
        searchTerm: '',
        currentMapStyle: 'dark',
        trackedShipMMSI: null,
    };

    // DOM References
    const dom = {
        map: document.getElementById('map'),
        vesselsList: document.getElementById('vessels-list'),
        statShipsCount: document.getElementById('stat-ships-count'),
        statMsgCount: document.getElementById('stat-msg-count'),
        statRate: document.getElementById('stat-rate'),
        connectionStatus: document.getElementById('connection-status'),
        statusText: document.getElementById('status-text'),
        searchInput: document.getElementById('search-input'),
        logStream: document.getElementById('log-stream'),
        clearLogBtn: document.getElementById('clear-log-btn'),
        vesselCard: document.getElementById('vessel-card'),
        cardMmsi: document.getElementById('card-mmsi'),
        cardLat: document.getElementById('card-lat'),
        cardLon: document.getElementById('card-lon'),
        cardSpeed: document.getElementById('card-speed'),
        cardCog: document.getElementById('card-cog'),
        cardLastSeen: document.getElementById('card-last-seen'),
        closeCardBtn: document.getElementById('close-vessel-card'),
        trackShipBtn: document.getElementById('track-ship-btn'),
        recenterBtn: document.getElementById('recenter-btn'),
        sidebar: document.getElementById('sidebar'),
        toggleSidebarBtn: document.getElementById('toggle-sidebar'),
    };

    // 1. Leaflet Map Setup
    const map = L.map('map', {
        center: [20.0, 0.0],
        zoom: 3,
        zoomControl: false
    });

    // Zoom Control Top Right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Tile Layers
    const tileLayers = {
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18
        }),
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        })
    };

    tileLayers.dark.addTo(map);

    // 2. Custom Vessel Marker Generator
    function createShipIcon(cog = 0, isSelected = false) {
        const color = isSelected ? '#0ea5e9' : '#10b981';
        const svgHtml = `
            <div class="ship-marker-icon" style="transform: rotate(${cog}deg);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="ship-marker-svg" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
            </div>
        `;
        return L.divIcon({
            html: svgHtml,
            className: 'custom-ship-div-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }

    // 3. WebSocket Connection Controller
    let ws = null;

    function initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Try backend websocket first
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        logSystemMessage(`Initiating connection to ${wsUrl}`);
        updateStatus('connecting', 'Connecting...');

        try {
            ws = new WebSocket(wsUrl);
        } catch (e) {
            logSystemMessage(`Backend WebSocket unavailable. Fallback to direct AISStream.`);
            connectDirectAISStream();
            return;
        }

        ws.onopen = () => {
            updateStatus('connected', 'LIVE AIS FEED');
            logSystemMessage('Connected to server stream.');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleAISMessage(data);
            } catch (err) {
                console.error('Failed to parse message:', err);
            }
        };

        ws.onerror = (err) => {
            console.warn('Backend WS error, attempting direct stream connection...');
        };

        ws.onclose = () => {
            updateStatus('disconnected', 'Reconnecting...');
            // If local backend fails, try connecting directly to aisstream
            setTimeout(connectDirectAISStream, 3000);
        };
    }

    // Fallback: Direct Browser Connection to AISStream
    function connectDirectAISStream() {
        const directUrl = "wss://stream.aisstream.io/v0/stream";
        const apiKey = "7e517a6f641a59275f6bec6b5b6defef20237414";

        logSystemMessage(`Connecting directly to AISStream cloud...`);

        try {
            ws = new WebSocket(directUrl);
        } catch (err) {
            updateStatus('disconnected', 'Offline');
            return;
        }

        ws.onopen = () => {
            updateStatus('connected', 'DIRECT AIS FEED');
            logSystemMessage('Connected directly to AISStream.');

            const subMsg = {
                APIKey: apiKey,
                BoundingBoxes: [[[-90, -180], [90, 180]]],
                FilterMessageTypes: ["PositionReport"]
            };
            ws.send(JSON.stringify(subMsg));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleAISMessage(data);
            } catch (err) {
                console.error('Direct WS parse error:', err);
            }
        };

        ws.onclose = () => {
            updateStatus('disconnected', 'Disconnected');
            setTimeout(connectDirectAISStream, 5000);
        };
    }

    // 4. Handle Incoming AIS Message
    function handleAISMessage(data) {
        state.totalMessages++;
        state.recentMsgCount++;
        dom.statMsgCount.textContent = state.totalMessages.toLocaleString();

        const msgType = data.MessageType || (data.Message && Object.keys(data.Message)[0]);
        
        if (msgType === "PositionReport" || (data.Message && data.Message.PositionReport)) {
            const pos = data.Message ? data.Message.PositionReport : data;
            const mmsi = String(pos.UserID || pos.mmsi || pos.MMSI);
            const lat = parseFloat(pos.Latitude || pos.latitude || pos.lat);
            const lon = parseFloat(pos.Longitude || pos.longitude || pos.lon);
            const sog = parseFloat(pos.Sog || pos.SpeedOverGround || pos.sog || 0);
            const cog = parseFloat(pos.Cog || pos.CourseOverGround || pos.cog || 0);

            if (!isNaN(lat) && !isNaN(lon) && mmsi) {
                updateVesselState(mmsi, lat, lon, sog, cog);
                logStreamEntry(`MMSI: ${mmsi} | Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)} | SOG: ${sog}kn`);
            }
        }
    }

    // 5. Update Vessel Store & Map Markers
    function updateVesselState(mmsi, lat, lon, sog, cog) {
        const now = new Date();

        if (state.ships.has(mmsi)) {
            const ship = state.ships.get(mmsi);
            ship.lat = lat;
            ship.lon = lon;
            ship.sog = sog;
            ship.cog = cog;
            ship.lastUpdated = now;

            // Move Marker
            ship.marker.setLatLng([lat, lon]);
            ship.marker.setIcon(createShipIcon(cog, state.selectedMMSI === mmsi));

            // Record History
            ship.history.push([lat, lon]);
            if (ship.history.length > 50) ship.history.shift();

            if (ship.pathLine) {
                ship.pathLine.setLatLngs(ship.history);
            }
        } else {
            // New Ship
            const icon = createShipIcon(cog, false);
            const marker = L.marker([lat, lon], { icon }).addTo(map);

            const ship = {
                mmsi,
                lat,
                lon,
                sog,
                cog,
                lastUpdated: now,
                marker,
                history: [[lat, lon]],
                pathLine: null
            };

            marker.on('click', () => selectVessel(mmsi));
            state.ships.set(mmsi, ship);
        }

        // Auto follow if tracked
        if (state.trackedShipMMSI === mmsi) {
            map.panTo([lat, lon]);
        }

        // Refresh UI
        dom.statShipsCount.textContent = state.ships.size.toLocaleString();
        renderVesselsList();

        if (state.selectedMMSI === mmsi) {
            updateVesselCard(state.ships.get(mmsi));
        }
    }

    // 6. Select Vessel & Popup
    function selectVessel(mmsi) {
        state.selectedMMSI = mmsi;
        const ship = state.ships.get(mmsi);

        if (!ship) return;

        // Reset icon styles
        state.ships.forEach((s, key) => {
            s.marker.setIcon(createShipIcon(s.cog, key === mmsi));
        });

        // Pan map
        map.flyTo([ship.lat, ship.lon], Math.max(map.getZoom(), 6), { duration: 1 });

        // Draw track path
        if (ship.pathLine) {
            map.removeLayer(ship.pathLine);
        }
        ship.pathLine = L.polyline(ship.history, {
            color: '#0ea5e9',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 8'
        }).addTo(map);

        updateVesselCard(ship);
        dom.vesselCard.classList.remove('hidden');
    }

    function updateVesselCard(ship) {
        dom.cardMmsi.textContent = `MMSI: ${ship.mmsi}`;
        dom.cardLat.textContent = ship.lat.toFixed(5);
        dom.cardLon.textContent = ship.lon.toFixed(5);
        dom.cardSpeed.textContent = `${ship.sog.toFixed(1)} kn`;
        dom.cardCog.textContent = `${ship.cog.toFixed(1)}°`;
        dom.cardLastSeen.textContent = ship.lastUpdated.toLocaleTimeString();
    }

    // 7. Render Vessels List in Sidebar
    function renderVesselsList() {
        const filtered = Array.from(state.ships.values()).filter(ship => {
            const matchesSearch = !state.searchTerm || ship.mmsi.includes(state.searchTerm);
            if (!matchesSearch) return false;

            if (state.activeFilter === 'moving') return ship.sog > 0.5;
            if (state.activeFilter === 'anchored') return ship.sog <= 0.5;
            return true;
        });

        if (filtered.length === 0) {
            dom.vesselsList.innerHTML = `
                <li class="empty-state">
                    <i class="fa-solid fa-satellite-dish"></i>
                    <p>No vessels match criteria</p>
                </li>`;
            return;
        }

        dom.vesselsList.innerHTML = filtered.slice(0, 50).map(ship => `
            <li class="vessel-item ${state.selectedMMSI === ship.mmsi ? 'selected' : ''}" data-mmsi="${ship.mmsi}">
                <div class="vessel-item-info">
                    <h4>MMSI ${ship.mmsi}</h4>
                    <span>${ship.lat.toFixed(3)}, ${ship.lon.toFixed(3)}</span>
                </div>
                <div class="vessel-item-stats">
                    <div class="speed">${ship.sog.toFixed(1)} kn</div>
                    <div class="heading">${ship.cog.toFixed(0)}°</div>
                </div>
            </li>
        `).join('');

        // Attach click listeners
        dom.vesselsList.querySelectorAll('.vessel-item').forEach(el => {
            el.addEventListener('click', () => {
                const mmsi = el.getAttribute('data-mmsi');
                selectVessel(mmsi);
            });
        });
    }

    // 8. Event Listeners
    dom.closeCardBtn.addEventListener('click', () => {
        dom.vesselCard.classList.add('hidden');
        state.selectedMMSI = null;
    });

    dom.trackShipBtn.addEventListener('click', () => {
        if (state.selectedMMSI) {
            state.trackedShipMMSI = state.trackedShipMMSI === state.selectedMMSI ? null : state.selectedMMSI;
            dom.trackShipBtn.classList.toggle('active', state.trackedShipMMSI === state.selectedMMSI);
        }
    });

    dom.recenterBtn.addEventListener('click', () => {
        if (state.ships.size > 0) {
            const bounds = L.latLngBounds(Array.from(state.ships.values()).map(s => [s.lat, s.lon]));
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            map.setView([20, 0], 3);
        }
    });

    dom.searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value.trim();
        renderVesselsList();
    });

    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = btn.getAttribute('data-filter');
            renderVesselsList();
        });
    });

    document.querySelectorAll('.map-style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.getAttribute('data-style');
            if (style === state.currentMapStyle) return;

            document.querySelectorAll('.map-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            map.removeLayer(tileLayers[state.currentMapStyle]);
            tileLayers[style].addTo(map);
            state.currentMapStyle = style;
        });
    });

    dom.toggleSidebarBtn.addEventListener('click', () => {
        dom.sidebar.classList.toggle('collapsed');
    });

    dom.clearLogBtn.addEventListener('click', () => {
        dom.logStream.innerHTML = '';
    });

    // 9. Helpers & Message Rate Counter
    function updateStatus(type, text) {
        dom.connectionStatus.className = `status-badge ${type}`;
        dom.statusText.textContent = text;
    }

    function logSystemMessage(msg) {
        const div = document.createElement('div');
        div.className = 'log-entry system';
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        dom.logStream.prepend(div);
    }

    function logStreamEntry(msg) {
        if (dom.logStream.children.length > 40) {
            dom.logStream.removeChild(dom.logStream.lastChild);
        }
        const div = document.createElement('div');
        div.className = 'log-entry pos';
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        dom.logStream.prepend(div);
    }

    setInterval(() => {
        state.messageRate = state.recentMsgCount;
        dom.statRate.textContent = `${state.messageRate} /s`;
        state.recentMsgCount = 0;
    }, 1000);

    // Boot App
    initWebSocket();
});
