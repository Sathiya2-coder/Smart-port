# Smart-Port — Global AIS Vessel Tracker & Sonar Tactical Platform 🚢🌊

> **Next-Generation Maritime Intelligence, Real-Time AIS Fleet Tracking, Sonar HUD Scanner & AI Port Optimization System.**

---

## 🌟 Key Features

- 🛰️ **Live AIS Fleet Telemetry**: Real-time position, SOG (speed), COG (heading), vessel dimensions, ETA, and cargo categorization.
- 🗺️ **High-Performance Interactive Marine Cartography**: Built with Leaflet, Canvas rendering, and dark-theme tactical navigation tiles.
- 📡 **GSAP Sonar Scanner HUD**: True polar bearing projection with selectable detection ranges (`ALL FLEET`, `1.5k km`, `3k km`, `5k km`), category filtering, and instant click-to-route tracking.
- ⚓ **Port Capacity & Congestion Analytics**: Live monitoring of major maritime hubs (JNPT Mumbai, Chennai, Cochin, Vizag, Mundra, VOC Tuticorin, Colombo Transshipment Hub).
- 🤖 **AI Maritime Companion**: Real-time natural language maritime assistant for voyage advisory, berth congestion analysis, and weather impact.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS
- **Animations & HUD**: GSAP (GreenSock Animation Platform), Canvas API
- **Cartography**: Leaflet, Lucide Icons
- **Stream Protocol**: WebSocket Live AIS Stream (`wss://stream.aisstream.io/v0/stream`) with zero-latency fallback simulator

---

## 🛠️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Sathiya2-coder/Smart-port.git
cd Smart-port
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
```

---

## 📄 License
MIT License. Created with ❤️ for modern maritime technology.
