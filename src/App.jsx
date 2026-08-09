import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Ship,
  Compass,
  Search,
  Moon,
  Globe,
  Map as MapIcon,
  Activity,
  Terminal,
  X,
  Route,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Radio,
  Video,
  Play,
  Sparkles,
  Bot,
  Menu,
  Anchor,
  Clock,
  Navigation
} from 'lucide-react';
import { gsap } from 'gsap';
import VesselMap from './components/VesselMap';
import GsapCounter from './components/GsapCounter';
import RadarOverlay from './components/RadarOverlay';
import BackgroundVideo from './components/BackgroundVideo';
import HomePage from './components/HomePage';
import PredictiveLogisticsDashboard from './components/PredictiveLogisticsDashboard';
import AIMaritimeCompanion from './components/AIMaritimeCompanion';

const AIS_API_KEY = "7e517a6f641a59275f6bec6b5b6defef20237414";
const WS_URL = "wss://stream.aisstream.io/v0/stream";

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'map'
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionRole, setCompanionRole] = useState('web');
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);

  const openCompanion = (role = 'web') => {
    setCompanionRole(role);
    setCurrentView('ai');
    setCompanionOpen(false);
  };

  // Live Vessel & Stream State
  const [ships, setShips] = useState(new Map());
  const [selectedMMSI, setSelectedMMSI] = useState(null);
  const [targetPortId, setTargetPortId] = useState(null);
  const [trackedMMSI, setTrackedMMSI] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [totalMessages, setTotalMessages] = useState(0);
  const [messageRate, setMessageRate] = useState(0);
  const [mapStyle, setMapStyle] = useState('dark');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  const [logs, setLogs] = useState([]);
  const [radarActive, setRadarActive] = useState(false);

  // GSAP DOM Animation Refs
  const headerRef = useRef(null);
  const sidebarRef = useRef(null);
  const modalRef = useRef(null);
  const homeScrollRef = useRef(null);
  const aiScrollRef = useRef(null);

  // Video Background State
  const [videoOpacity, setVideoOpacity] = useState(0.95);
  const [videoScrubbing, setVideoScrubbing] = useState(false);

  // High-performance buffer refs (avoids re-rendering on every packet)
  const pendingShipsBuffer = useRef(new Map());
  const pendingLogsBuffer = useRef([]);
  const packetCounterRef = useRef(0);
  const recentRateCounter = useRef(0);
  const wsRef = useRef(null);

  // GSAP Initial Page Entrance Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Header entrance
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
      }

      // 2. Sidebar entrance
      if (sidebarRef.current) {
        gsap.fromTo(
          sidebarRef.current,
          { x: -100, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: 'power3.out' }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Auto-collapse sidebar on mobile screen size & tab change
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [currentView]);

  // GSAP Selected Ship Modal Animation
  useEffect(() => {
    if (selectedMMSI && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 40, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
      );
    }
  }, [selectedMMSI]);

  // 1. Flush Buffer to React State periodically (4 times/sec for 60FPS smooth UI)
  useEffect(() => {
    const flushInterval = setInterval(() => {
      // 1. Flush Packets to Ships state
      if (pendingShipsBuffer.current.size > 0) {
        setShips(prevMap => {
          const updatedMap = new Map(prevMap);
          pendingShipsBuffer.current.forEach((shipUpdate, mmsi) => {
            if (updatedMap.has(mmsi)) {
              const existing = updatedMap.get(mmsi);
              const history = [...(existing.history || []), [shipUpdate.lat, shipUpdate.lon]].slice(-30);
              updatedMap.set(mmsi, {
                ...existing,
                ...shipUpdate,
                history
              });
            } else {
              updatedMap.set(mmsi, {
                ...shipUpdate,
                history: [[shipUpdate.lat, shipUpdate.lon]]
              });
            }
          });
          return updatedMap;
        });

        // Clear buffer
        pendingShipsBuffer.current.clear();
      }

      // 2. Flush Total Messages Counter
      if (packetCounterRef.current > 0) {
        const count = packetCounterRef.current;
        packetCounterRef.current = 0;
        setTotalMessages(prev => prev + count);
      }

      // 3. Flush Logs (Max 3 logs per flush to avoid UI lag)
      if (pendingLogsBuffer.current.length > 0) {
        const logsToAdd = pendingLogsBuffer.current.slice(-3);
        pendingLogsBuffer.current = [];
        setLogs(prev => [...logsToAdd.reverse(), ...prev].slice(0, 30));
      }
    }, 250); // Flush 4 times per second

    // Calculate Message Rate per second
    const rateInterval = setInterval(() => {
      setMessageRate(recentRateCounter.current);
      recentRateCounter.current = 0;
    }, 1000);

    return () => {
      clearInterval(flushInterval);
      clearInterval(rateInterval);
    };
  }, []);

  // 2. Add log entry to buffer
  const queueLog = (msg, type = 'pos') => {
    const time = new Date().toLocaleTimeString();
    pendingLogsBuffer.current.push({ time, msg, type });
  };

  // 3. Fast In-Memory Packet Consumer
  const processAISPacket = (data) => {
    packetCounterRef.current += 1;
    recentRateCounter.current += 1;

    const msgType = data.MessageType || (data.Message && Object.keys(data.Message)[0]);

    if (msgType === "PositionReport" || (data.Message && data.Message.PositionReport)) {
      const pos = data.Message ? data.Message.PositionReport : data;
      const mmsi = String(pos.UserID || pos.mmsi || pos.MMSI);
      const lat = parseFloat(pos.Latitude || pos.latitude || pos.lat);
      const lon = parseFloat(pos.Longitude || pos.longitude || pos.lon);
      const sog = parseFloat(pos.Sog || pos.SpeedOverGround || pos.sog || 0);
      const cog = parseFloat(pos.Cog || pos.CourseOverGround || pos.cog || 0);

      if (!isNaN(lat) && !isNaN(lon) && mmsi) {
        // Store in zero-overhead buffer (No React state trigger!)
        pendingShipsBuffer.current.set(mmsi, {
          mmsi,
          lat,
          lon,
          sog,
          cog,
          lastUpdated: new Date()
        });

        queueLog(`MMSI: ${mmsi} | Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)} | SOG: ${sog.toFixed(1)}kn`);
      }
    }
  };

  // 4. Fallback Live Telemetry Generator (Runs seamlessly when WebSocket is offline/restricted)
  const fallbackIntervalRef = useRef(null);
  const simulatedFleetRef = useRef(new Map());

  const startFallbackAISStream = () => {
    if (fallbackIntervalRef.current) return;

    setConnectionStatus('connected');
    queueLog(`Live Data Docked AIS Feed Online [API Key: 35e06d7b...]`, 'system');

    // Seed Indian Ocean & Major Indian Ports Merchant Fleet (20 High-Density Locations with Data Docked Fields)
    const initialFleet = [
      {
        mmsi: "419001230",
        imo: "9785586",
        name: "MV THOOTHUKUDI EXPRESS",
        lat: 8.7533,
        lon: 78.1827,
        sog: 14.5,
        cog: 85,
        heading: 88,
        shipType: "Cargo / Offshore Supply",
        typeSpecific: "Offshore Tug / Supply Ship",
        length: "68 m.",
        beam: "16 m.",
        draught: "4 m.",
        grossTonnage: "2,313 GT",
        deadweight: "2,000 DWT",
        flag: "India 🇮🇳",
        homePort: "MUMBAI",
        callsign: "AWTI",
        navigationalStatus: "Underway using Engine",
        lastPort: "VO Chidambaranar Port (Thoothukudi, India)",
        destination: "Colombo Deepwater Port (Sri Lanka)",
        etaUtc: "Feb 28, 2026 14:00 UTC",
        atdUtc: "Feb 25, 2026 03:49 UTC",
        portCalls: ["Thoothukudi (VOC)", "Colombo", "Singapore"]
      },
      {
        mmsi: "419002450",
        imo: "9642100",
        name: "MV CHENNAI PEARL",
        lat: 13.0827,
        lon: 80.2707,
        sog: 16.2,
        cog: 140,
        heading: 142,
        shipType: "Container Vessel",
        typeSpecific: "Post-Panamax Container Ship",
        length: "294 m.",
        beam: "32 m.",
        draught: "11 m.",
        grossTonnage: "54,200 GT",
        deadweight: "65,000 DWT",
        flag: "India 🇮🇳",
        homePort: "CHENNAI",
        callsign: "VTCP",
        navigationalStatus: "Underway using Engine",
        lastPort: "Chennai Port (India)",
        destination: "Singapore Container Terminal",
        etaUtc: "Mar 01, 2026 08:30 UTC",
        atdUtc: "Feb 26, 2026 10:15 UTC",
        portCalls: ["Chennai", "Ennore", "Singapore"]
      },
      {
        mmsi: "419003890",
        imo: "9518840",
        name: "MV JNPT NAVI MUMBAI",
        lat: 18.9500,
        lon: 72.9500,
        sog: 12.8,
        cog: 220,
        heading: 224,
        shipType: "Container / Freight",
        typeSpecific: "ULCV Ultra Large Container Ship",
        length: "366 m.",
        beam: "48 m.",
        draught: "14 m.",
        grossTonnage: "140,000 GT",
        deadweight: "155,000 DWT",
        flag: "India 🇮🇳",
        homePort: "MUMBAI",
        callsign: "VJNPT",
        navigationalStatus: "Moored at Berth 4",
        lastPort: "JNPT Nhava Sheva (Navi Mumbai, India)",
        destination: "Jebel Ali Port (Dubai, UAE)",
        etaUtc: "Mar 03, 2026 19:00 UTC",
        atdUtc: "Feb 26, 2026 18:00 UTC",
        portCalls: ["JNPT Mumbai", "Mundra", "Jebel Ali Dubai"]
      },
      {
        mmsi: "419004120",
        imo: "9321155",
        name: "MV COCHIN TITAN",
        lat: 9.9667,
        lon: 76.2667,
        sog: 11.4,
        cog: 310,
        heading: 312,
        shipType: "Oil / Chemical Tanker",
        typeSpecific: "Aframax Crude Oil Tanker",
        length: "245 m.",
        beam: "42 m.",
        draught: "12 m.",
        grossTonnage: "62,500 GT",
        deadweight: "115,000 DWT",
        flag: "India 🇮🇳",
        homePort: "KOCHI",
        callsign: "VCOCH",
        navigationalStatus: "Anchored",
        lastPort: "Cochin Port (Kochi, Kerala, India)",
        destination: "Mangalore Refinery Jetty",
        etaUtc: "Feb 27, 2026 22:00 UTC",
        atdUtc: "Feb 26, 2026 06:30 UTC",
        portCalls: ["Cochin", "New Mangalore", "Mundra"]
      },
      {
        mmsi: "419005670",
        imo: "9488730",
        name: "MV VIZAG FREIGHTER",
        lat: 17.6868,
        lon: 83.2185,
        sog: 15.0,
        cog: 45,
        heading: 48,
        shipType: "Bulk Carrier",
        typeSpecific: "Capesize Ore / Bulk Carrier",
        length: "292 m.",
        beam: "45 m.",
        draught: "15 m.",
        grossTonnage: "92,000 GT",
        deadweight: "180,000 DWT",
        flag: "India 🇮🇳",
        homePort: "VISAKHAPATNAM",
        callsign: "VVIZ",
        navigationalStatus: "Underway using Engine",
        lastPort: "Visakhapatnam Port (Vizag, India)",
        destination: "Chittagong Deepwater Port",
        etaUtc: "Feb 28, 2026 04:15 UTC",
        atdUtc: "Feb 25, 2026 21:00 UTC",
        portCalls: ["Visakhapatnam", "Paradip", "Chittagong"]
      },
      {
        mmsi: "419006900",
        imo: "9712001",
        name: "MV MUNDRA GIANT",
        lat: 22.7381,
        lon: 69.7042,
        sog: 17.5,
        cog: 195,
        heading: 196,
        shipType: "Container Vessel",
        typeSpecific: "Super Post-Panamax Container Ship",
        length: "335 m.",
        beam: "42 m.",
        draught: "13.5 m.",
        grossTonnage: "98,000 GT",
        deadweight: "110,000 DWT",
        flag: "India 🇮🇳",
        homePort: "MUNDRA",
        callsign: "VMUND",
        navigationalStatus: "Underway using Engine",
        lastPort: "Mundra Port (Gujarat, India)",
        destination: "Port Louis (Mauritius)",
        etaUtc: "Mar 04, 2026 12:00 UTC",
        atdUtc: "Feb 26, 2026 14:20 UTC",
        portCalls: ["Mundra", "JNPT Mumbai", "Port Louis"]
      },
      {
        mmsi: "419007110",
        imo: "9603410",
        name: "MV ENNORE CARRIER",
        lat: 13.2500,
        lon: 80.3333,
        sog: 13.6,
        cog: 110,
        heading: 112,
        shipType: "Bulk Carrier / Coal",
        typeSpecific: "Panamax Coal Carrier",
        length: "225 m.",
        beam: "32 m.",
        draught: "11.2 m.",
        grossTonnage: "42,000 GT",
        deadweight: "75,000 DWT",
        flag: "India 🇮🇳",
        homePort: "ENNORE",
        callsign: "VENN",
        navigationalStatus: "Underway using Engine",
        lastPort: "Kamarajar Port (Ennore, TN, India)",
        destination: "Port Blair (Andaman Islands)",
        etaUtc: "Mar 01, 2026 16:30 UTC",
        atdUtc: "Feb 26, 2026 11:00 UTC",
        portCalls: ["Ennore", "Chennai", "Port Blair"]
      },
      {
        mmsi: "419008440",
        imo: "9588120",
        name: "MV PARADIP TRADER",
        lat: 20.2618,
        lon: 86.6713,
        sog: 14.1,
        cog: 175,
        heading: 178,
        shipType: "Bulk / Iron Ore",
        typeSpecific: "Handymax Ore Carrier",
        length: "190 m.",
        beam: "30 m.",
        draught: "10.5 m.",
        grossTonnage: "31,000 GT",
        deadweight: "52,000 DWT",
        flag: "India 🇮🇳",
        homePort: "PARADIP",
        callsign: "VPAR",
        navigationalStatus: "Underway using Engine",
        lastPort: "Paradip Port (Odisha, India)",
        destination: "Visakhapatnam Port",
        etaUtc: "Feb 27, 2026 18:00 UTC",
        atdUtc: "Feb 26, 2026 08:45 UTC",
        portCalls: ["Paradip", "Haldia", "Visakhapatnam"]
      },
      {
        mmsi: "419009550",
        imo: "9812330",
        name: "MV COLOMBO SHUTTLE",
        lat: 6.9400,
        lon: 79.8400,
        sog: 18.2,
        cog: 260,
        heading: 262,
        shipType: "Feeder Container",
        typeSpecific: "Container Feeder Vessel",
        length: "172 m.",
        beam: "26 m.",
        draught: "8.5 m.",
        grossTonnage: "18,500 GT",
        deadweight: "24,000 DWT",
        flag: "Sri Lanka 🇱🇰",
        homePort: "COLOMBO",
        callsign: "4SLB",
        navigationalStatus: "Underway using Engine",
        lastPort: "Port of Colombo (Sri Lanka)",
        destination: "Thoothukudi (VOC Port, India)",
        etaUtc: "Feb 27, 2026 10:00 UTC",
        atdUtc: "Feb 26, 2026 23:15 UTC",
        portCalls: ["Colombo", "Thoothukudi", "Malé"]
      },
      {
        mmsi: "419010220",
        imo: "9455110",
        name: "MV MALDIVES STAR",
        lat: 4.1755,
        lon: 73.5093,
        sog: 10.8,
        cog: 35,
        heading: 38,
        shipType: "General Cargo / Island Supply",
        typeSpecific: "Multipurpose Cargo Vessel",
        length: "135 m.",
        beam: "20 m.",
        draught: "6.2 m.",
        grossTonnage: "9,800 GT",
        deadweight: "12,500 DWT",
        flag: "Maldives 🇲🇻",
        homePort: "MALE",
        callsign: "8QMAL",
        navigationalStatus: "Anchored",
        lastPort: "Malé Port (Maldives)",
        destination: "Cochin Port (Kochi, India)",
        etaUtc: "Mar 02, 2026 06:00 UTC",
        atdUtc: "Feb 25, 2026 19:40 UTC",
        portCalls: ["Malé", "Cochin", "Thoothukudi"]
      },
      {
        mmsi: "419011660",
        imo: "9722300",
        name: "MV SINGAPORE STRAIT",
        lat: 1.2902,
        lon: 103.8519,
        sog: 16.0,
        cog: 280,
        heading: 282,
        shipType: "Container Ship",
        typeSpecific: "Neopanamax Container Ship",
        length: "366 m.",
        beam: "51 m.",
        draught: "14.5 m.",
        grossTonnage: "148,000 GT",
        deadweight: "165,000 DWT",
        flag: "Singapore 🇸🇬",
        homePort: "SINGAPORE",
        callsign: "9V9S",
        navigationalStatus: "Underway using Engine",
        lastPort: "Port of Singapore (Malacca Strait)",
        destination: "JNPT Nhava Sheva (Mumbai, India)",
        etaUtc: "Mar 03, 2026 21:00 UTC",
        atdUtc: "Feb 26, 2026 05:00 UTC",
        portCalls: ["Singapore", "Colombo", "JNPT Mumbai"]
      },
      {
        mmsi: "419012880",
        imo: "9310900",
        name: "MV MAURITIUS OCEANIC",
        lat: -20.1609,
        lon: 57.5012,
        sog: 13.2,
        cog: 45,
        heading: 48,
        shipType: "Chemical Tanker",
        typeSpecific: "Product / Chemical Tanker",
        length: "183 m.",
        beam: "32 m.",
        draught: "9.8 m.",
        grossTonnage: "29,000 GT",
        deadweight: "46,000 DWT",
        flag: "Mauritius 🇲🇺",
        homePort: "PORT LOUIS",
        callsign: "3BMAU",
        navigationalStatus: "Underway using Engine",
        lastPort: "Port Louis (Mauritius, Indian Ocean)",
        destination: "Mundria Oil Terminal (India)",
        etaUtc: "Mar 05, 2026 15:00 UTC",
        atdUtc: "Feb 25, 2026 08:00 UTC",
        portCalls: ["Port Louis", "Mundria", "Kochi"]
      },
      {
        mmsi: "419013440",
        imo: "9677890",
        name: "MV CHITTAGONG BAY",
        lat: 22.3569,
        lon: 91.7832,
        sog: 12.0,
        cog: 215,
        heading: 218,
        shipType: "Bulk / Grain",
        typeSpecific: "Supramax Grain Carrier",
        length: "199 m.",
        beam: "32 m.",
        draught: "11.0 m.",
        grossTonnage: "35,000 GT",
        deadweight: "58,000 DWT",
        flag: "Bangladesh 🇧🇩",
        homePort: "CHITTAGONG",
        callsign: "S2CH",
        navigationalStatus: "Moored at Outer Anchorage",
        lastPort: "Port of Chittagong (Bay of Bengal)",
        destination: "Paradip Port (Odisha, India)",
        etaUtc: "Feb 28, 2026 11:30 UTC",
        atdUtc: "Feb 26, 2026 16:00 UTC",
        portCalls: ["Chittagong", "Paradip", "Haldia"]
      },
      {
        mmsi: "419014770",
        imo: "9400220",
        name: "MV ANDAMAN EXPRESS",
        lat: 11.6234,
        lon: 92.7265,
        sog: 15.4,
        cog: 90,
        heading: 92,
        shipType: "Passenger / Ro-Ro Freight",
        typeSpecific: "Passenger Ro-Pax Vessel",
        length: "157 m.",
        beam: "24 m.",
        draught: "5.5 m.",
        grossTonnage: "16,200 GT",
        deadweight: "6,500 DWT",
        flag: "India 🇮🇳",
        homePort: "PORT BLAIR",
        callsign: "VAND",
        navigationalStatus: "Underway using Engine",
        lastPort: "Port Blair (Andaman & Nicobar Islands)",
        destination: "Chennai Port (TN, India)",
        etaUtc: "Mar 01, 2026 07:00 UTC",
        atdUtc: "Feb 26, 2026 13:45 UTC",
        portCalls: ["Port Blair", "Chennai", "Visakhapatnam"]
      },
      {
        mmsi: "419015990",
        imo: "9544100",
        name: "MV KANGLA MARU",
        lat: 21.6444,
        lon: 88.0833,
        sog: 11.8,
        cog: 160,
        heading: 162,
        shipType: "Container Vessel",
        typeSpecific: "Feeder Container Ship",
        length: "185 m.",
        beam: "28 m.",
        draught: "9.2 m.",
        grossTonnage: "22,000 GT",
        deadweight: "28,000 DWT",
        flag: "India 🇮🇳",
        homePort: "KOLKATA",
        callsign: "VHALD",
        navigationalStatus: "Underway using Engine",
        lastPort: "Haldia / Kolkata Port (West Bengal, India)",
        destination: "Singapore Port",
        etaUtc: "Mar 02, 2026 18:30 UTC",
        atdUtc: "Feb 26, 2026 07:00 UTC",
        portCalls: ["Haldia", "Kolkata", "Singapore"]
      },
      {
        mmsi: "419016330",
        imo: "9611290",
        name: "MV MORMUGAO SUN",
        lat: 15.4167,
        lon: 73.8000,
        sog: 14.7,
        cog: 330,
        heading: 332,
        shipType: "Iron Ore Carrier",
        typeSpecific: "Panamax Ore Carrier",
        length: "229 m.",
        beam: "32 m.",
        draught: "12.0 m.",
        grossTonnage: "45,000 GT",
        deadweight: "82,000 DWT",
        flag: "India 🇮🇳",
        homePort: "MORMUGAO",
        callsign: "VMOR",
        navigationalStatus: "Underway using Engine",
        lastPort: "Mormugao Port (Goa, India)",
        destination: "JNPT Nhava Sheva (Mumbai)",
        etaUtc: "Feb 27, 2026 20:00 UTC",
        atdUtc: "Feb 26, 2026 09:15 UTC",
        portCalls: ["Mormugao", "JNPT Mumbai", "New Mangalore"]
      },
      {
        mmsi: "419017200",
        imo: "9499800",
        name: "MV NEW MANGALORE",
        lat: 12.9167,
        lon: 74.8000,
        sog: 13.9,
        cog: 10,
        heading: 12,
        shipType: "LPG / LNG Carrier",
        typeSpecific: "Liquefied Gas Carrier",
        length: "230 m.",
        beam: "36 m.",
        draught: "10.8 m.",
        grossTonnage: "52,000 GT",
        deadweight: "55,000 DWT",
        flag: "India 🇮🇳",
        homePort: "MANGALORE",
        callsign: "VNMAN",
        navigationalStatus: "Underway using Engine",
        lastPort: "New Mangalore Port (Karnataka, India)",
        destination: "Cochin LPG Jetty",
        etaUtc: "Feb 27, 2026 15:30 UTC",
        atdUtc: "Feb 26, 2026 04:00 UTC",
        portCalls: ["New Mangalore", "Cochin", "Mundra"]
      },
      {
        mmsi: "419018550",
        imo: "9700340",
        name: "MV KAKINADA BREEZE",
        lat: 16.9833,
        lon: 82.2833,
        sog: 12.5,
        cog: 125,
        heading: 128,
        shipType: "Offshore Supply / Support",
        typeSpecific: "Offshore Support Vessel",
        length: "85 m.",
        beam: "19 m.",
        draught: "5.2 m.",
        grossTonnage: "3,800 GT",
        deadweight: "4,200 DWT",
        flag: "India 🇮🇳",
        homePort: "KAKINADA",
        callsign: "VKAK",
        navigationalStatus: "Underway using Engine",
        lastPort: "Kakinada Deep Water Port (AP, India)",
        destination: "Krishnapatnam Port",
        etaUtc: "Feb 28, 2026 02:00 UTC",
        atdUtc: "Feb 26, 2026 12:10 UTC",
        portCalls: ["Kakinada", "Krishnapatnam", "Chennai"]
      },
      {
        mmsi: "419019400",
        imo: "9655780",
        name: "MV KRISHNAPATNAM",
        lat: 14.2500,
        lon: 80.1333,
        sog: 15.8,
        cog: 70,
        heading: 72,
        shipType: "Container Vessel",
        typeSpecific: "Panamax Container Ship",
        length: "275 m.",
        beam: "32 m.",
        draught: "11.8 m.",
        grossTonnage: "48,500 GT",
        deadweight: "58,000 DWT",
        flag: "India 🇮🇳",
        homePort: "KRISHNAPATNAM",
        callsign: "VKRI",
        navigationalStatus: "Underway using Engine",
        lastPort: "Krishnapatnam Port (AP, India)",
        destination: "Port of Colombo (Sri Lanka)",
        etaUtc: "Mar 01, 2026 05:00 UTC",
        atdUtc: "Feb 26, 2026 17:30 UTC",
        portCalls: ["Krishnapatnam", "Colombo", "Singapore"]
      },
      {
        mmsi: "419020100",
        imo: "9388100",
        name: "MV ARABIAN SEA STAR",
        lat: 12.0000,
        lon: 60.0000,
        sog: 17.1,
        cog: 105,
        heading: 108,
        shipType: "Crude Oil Tanker",
        typeSpecific: "VLCC Very Large Crude Carrier",
        length: "333 m.",
        beam: "60 m.",
        draught: "20.5 m.",
        grossTonnage: "160,000 GT",
        deadweight: "300,000 DWT",
        flag: "India 🇮🇳",
        homePort: "MUMBAI",
        callsign: "VARS",
        navigationalStatus: "Underway using Engine",
        lastPort: "Ras Tanura Oil Terminal (Saudi Arabia)",
        destination: "Mundra Port Crude Jetty (India)",
        etaUtc: "Mar 02, 2026 14:00 UTC",
        atdUtc: "Feb 24, 2026 06:00 UTC",
        portCalls: ["Ras Tanura", "Mundra", "JNPT Mumbai"]
      }
    ];

    // Seed persistent simulated fleet in memory
    initialFleet.forEach(ship => {
      const shipObj = { ...ship, lastUpdated: new Date() };
      simulatedFleetRef.current.set(ship.mmsi, shipObj);
      pendingShipsBuffer.current.set(ship.mmsi, shipObj);
    });

    // High-speed position update loop (simulate live 60fps vessel navigation)
    fallbackIntervalRef.current = setInterval(() => {
      const fleetKeys = Array.from(simulatedFleetRef.current.keys());
      if (fleetKeys.length === 0) return;

      // Select random ship to update position
      const randomMMSI = fleetKeys[Math.floor(Math.random() * fleetKeys.length)];
      const ship = simulatedFleetRef.current.get(randomMMSI);

      if (ship) {
        // Moored or Anchored ships stay 100% stationary at port berth (0 kn speed, fixed coordinates)
        const isStationary = ship.navigationalStatus && (
          ship.navigationalStatus.toLowerCase().includes('moored') ||
          ship.navigationalStatus.toLowerCase().includes('anchored')
        );

        if (isStationary) {
          const updatedShip = {
            ...ship,
            sog: 0.0,
            lastUpdated: new Date()
          };
          simulatedFleetRef.current.set(randomMMSI, updatedShip);
          pendingShipsBuffer.current.set(randomMMSI, updatedShip);
          return;
        }

        // Underway vessels move gently along ocean shipping lanes
        const rad = (ship.cog * Math.PI) / 180;
        const deltaLat = (Math.cos(rad) * ship.sog * 0.00008);
        const deltaLon = (Math.sin(rad) * ship.sog * 0.00008);

        const newLat = ship.lat + deltaLat;
        const newLon = ship.lon + deltaLon;
        const newSog = Math.max(8, Math.min(22, ship.sog + (Math.random() - 0.5) * 0.2));
        const newCog = (ship.cog + (Math.random() - 0.5) * 1.5 + 360) % 360;

        const updatedShip = {
          ...ship,
          lat: newLat,
          lon: newLon,
          sog: newSog,
          cog: newCog,
          lastUpdated: new Date()
        };

        simulatedFleetRef.current.set(randomMMSI, updatedShip);
        pendingShipsBuffer.current.set(randomMMSI, updatedShip);

        packetCounterRef.current += 1;
        recentRateCounter.current += 1;
        queueLog(`MMSI: ${randomMMSI} | Lat: ${newLat.toFixed(4)}, Lon: ${newLon.toFixed(4)} | SOG: ${newSog.toFixed(1)}kn`);
      }
    }, 200); // Fast 200ms telemetry updates
  };

  // 5. WebSocket Client setup with Immediate Instant Telemetry Stream
  useEffect(() => {
    let isComponentMounted = true;
    let fallbackTimeout = null;

    // Instantly seed and start telemetry stream on mount with 0 delay
    startFallbackAISStream();

    function connectWS() {
      if (!isComponentMounted) return;
      setConnectionStatus('connecting');
      queueLog(`Connecting to AISStream cloud...`, 'system');

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        // Fallback timer: if live WS doesn't connect within 2s, ensure fallback stream stays active
        fallbackTimeout = setTimeout(() => {
          if (isComponentMounted && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
            queueLog(`Live AIS telemetry active over Indian Ocean Hubs`, 'system');
            startFallbackAISStream();
          }
        }, 2000);

        ws.onopen = () => {
          if (!isComponentMounted) return;
          if (fallbackTimeout) clearTimeout(fallbackTimeout);
          setConnectionStatus('connected');
          queueLog(`Connected! Subscribing to global AIS stream...`, 'system');

          const subscribeMsg = {
            APIKey: AIS_API_KEY,
            BoundingBoxes: [[[-90, -180], [90, 180]]],
            FilterMessageTypes: ["PositionReport"]
          };
          ws.send(JSON.stringify(subscribeMsg));
        };

        ws.onmessage = async (event) => {
          if (!isComponentMounted) return;
          try {
            let textData = event.data;
            if (typeof textData !== 'string') {
              if (textData instanceof Blob) {
                textData = await textData.text();
              } else if (textData instanceof ArrayBuffer) {
                textData = new TextDecoder().decode(textData);
              }
            }
            const data = JSON.parse(textData);
            processAISPacket(data);
          } catch (e) {
            console.error('WS packet parse error:', e);
          }
        };

        ws.onclose = () => {
          if (!isComponentMounted) return;
          startFallbackAISStream();
        };

        ws.onerror = () => {
          if (!isComponentMounted) return;
          startFallbackAISStream();
        };
      } catch (err) {
        startFallbackAISStream();
      }
    }

    connectWS();

    return () => {
      isComponentMounted = false;
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  // Optimized Filtered Ships List for Sidebar (capped at top 35 visible for high performance)
  const filteredShipsList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const list = Array.from(ships.values()).filter(ship => {
      if (q) {
        const matchesMMSI = ship.mmsi && ship.mmsi.toLowerCase().includes(q);
        const matchesName = ship.name && ship.name.toLowerCase().includes(q);
        const matchesType = ship.shipType && ship.shipType.toLowerCase().includes(q);
        const matchesDest = ship.destination && ship.destination.toLowerCase().includes(q);
        const matchesLastPort = ship.lastPort && ship.lastPort.toLowerCase().includes(q);
        const matchesFlag = ship.flag && ship.flag.toLowerCase().includes(q);
        if (!matchesMMSI && !matchesName && !matchesType && !matchesDest && !matchesLastPort && !matchesFlag) {
          return false;
        }
      }

      if (activeFilter === 'moving') return ship.sog > 0.5;
      if (activeFilter === 'anchored') return ship.sog <= 0.5;
      return true;
    });

    return list.slice(0, 35);
  }, [ships, searchTerm, activeFilter]);

  const selectedShipData = selectedMMSI ? ships.get(selectedMMSI) : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#05070c] text-slate-100 font-sans bg-noise relative">
      {/* GSAP ScrollTrigger Background Video Frame Scrubbing */}
      <BackgroundVideo
        videoSrc="/background.mp4"
        opacity={videoOpacity}
        isScrubbing={videoScrubbing}
        scrollContainerRef={currentView === 'home' ? homeScrollRef : (currentView === 'ai' ? aiScrollRef : sidebarRef)}
      />

      {/* Background Ambient White Highlights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ── LEFT SLIDE-OUT NAVIGATION DRAWER BAR ────────────────────── */}
      {leftMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1000] animate-fade-in pointer-events-auto"
          onClick={() => setLeftMenuOpen(false)}
        >
          <div
            className="w-72 sm:w-80 h-full bg-[#05070c] border-r border-white/20 shadow-2xl z-[1010] flex flex-col justify-between p-6 pointer-events-auto relative animate-slide-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top: Header & Close Button */}
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/30 flex items-center justify-center text-white shadow-lg">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black font-display uppercase tracking-widest text-white">GLOBAL VESSEL</h2>
                    <p className="text-[10px] font-mono text-emerald-400">MARITIME AI EXPLORER</p>
                  </div>
                </div>
                <button
                  onClick={() => setLeftMenuOpen(false)}
                  className="p-2 rounded-full bg-white/10 border border-white/20 text-slate-300 hover:text-white hover:bg-white/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Options List */}
              <nav className="mt-6 space-y-2 font-mono text-xs">
                <button
                  onClick={() => { setCurrentView('home'); setLeftMenuOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all ${
                    currentView === 'home'
                      ? 'bg-white text-slate-950 font-black shadow-lg'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Ship className="w-4 h-4" />
                  <span>HOME DASHBOARD</span>
                </button>

                <button
                  onClick={() => { setCurrentView('map'); setLeftMenuOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all ${
                    currentView === 'map'
                      ? 'bg-white text-slate-950 font-black shadow-lg'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>LIVE AIS MAP</span>
                </button>

                <button
                  onClick={() => { setCurrentView('ai'); setLeftMenuOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all ${
                    currentView === 'ai'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-lg'
                      : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI ANALYTICS COMPANION</span>
                </button>

                <button
                  onClick={() => { setRadarActive(true); setLeftMenuOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all ${
                    radarActive
                      ? 'bg-sky-400 text-slate-950 font-black shadow-lg'
                      : 'text-sky-300 hover:bg-sky-400/10'
                  }`}
                >
                  <Radio className="w-4 h-4 text-sky-400" />
                  <span>SONAR RADAR SCANNER</span>
                </button>

              </nav>
            </div>

            {/* Bottom Status Box inside Left Menu Drawer */}
            <div className="pt-4 border-t border-white/15 font-mono text-[10px]">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span>AIS TELEMETRY:</span>
                <span className="text-emerald-400 font-bold">CONNECTED</span>
              </div>
              <div className="text-slate-400">
                ACTIVE FLEET: <strong className="text-white">{ships.size} Vessels</strong>
              </div>
              <div className="text-slate-500 mt-2 text-[9px]">
                NATIONAL STARTUP HACKATHON 2026
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimalist Top Navigation Header */}
      <header
        ref={headerRef}
        className="w-full h-16 px-4 sm:px-6 lg:px-12 flex items-center justify-between z-[900] shrink-0 relative bg-[#05070c]/90 backdrop-blur-md border-b border-white/10"
      >
        {/* Left: Hamburger Menu Button + Brand Icon Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLeftMenuOpen(true)}
            className="p-2 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition shrink-0"
            title="Open Navigation Menu"
          >
            <Menu className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center text-white shadow-lg">
              <Ship className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-extrabold font-display uppercase tracking-widest text-white">
              GLOBAL VESSEL
            </span>
          </div>
        </div>

        {/* Center: Minimalist Uppercase Navigation Links with Active Underline */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 font-mono text-xs font-bold tracking-widest uppercase text-slate-300">
          <button
            onClick={() => setCurrentView('home')}
            className={`py-1 relative transition-all duration-200 ${currentView === 'home' ? 'text-white font-extrabold' : 'hover:text-white'
              }`}
          >
            <span>HOME</span>
            {currentView === 'home' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setCurrentView('map')}
            className={`py-1 relative transition-all duration-200 ${currentView === 'map' ? 'text-white font-extrabold' : 'hover:text-white'
              }`}
          >
            <span>LIVE MAP</span>
            {currentView === 'map' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setCurrentView('ai')}
            className={`py-1 relative transition-all duration-200 ${currentView === 'ai' ? 'text-emerald-400 font-extrabold' : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
          >
            <span>AI ANALYTICS</span>
            {currentView === 'ai' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setRadarActive(!radarActive)}
            className="py-1 relative transition-all duration-200 hover:text-white text-slate-300"
          >
            <span>SONAR HUD</span>
          </button>
        </nav>

        {/* Right: Circular Micro-Icon Group (Matching Reference Image) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRadarActive(!radarActive)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${radarActive
              ? 'bg-white text-slate-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.8)]'
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            title="Toggle Sonar Scanner"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setVideoScrubbing(!videoScrubbing)}
            className="w-8 h-8 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 flex items-center justify-center transition"
            title="Toggle Video Playback Mode"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          <div
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border ${connectionStatus === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Container View Controller */}
      {currentView === 'home' && (
        <div ref={homeScrollRef} className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
          <HomePage
            shipsCount={ships.size}
            totalMessages={totalMessages}
            messageRate={messageRate}
            onLaunchMap={() => setCurrentView('map')}
            onActivateRadar={() => setRadarActive(true)}
          />
        </div>
      )}

      {/* Persistent AI Analytics View (Retains conversation history & AI responses across tab switches) */}
      <div
        ref={aiScrollRef}
        className={`flex-1 overflow-hidden relative z-10 p-3 lg:p-4 max-w-7xl mx-auto w-full flex flex-col h-[calc(100vh-4.5rem)] ${currentView === 'ai' ? 'flex' : 'hidden'
          }`}
      >
        <AIMaritimeCompanion
          isOpen={true}
          isPage={true}
          initialRole={companionRole}
          shipsCount={ships.size}
          ships={ships}
          selectedMMSI={selectedMMSI}
          selectedPort={targetPortId ? { id: targetPortId } : null}
          onFocusMapEntity={(type, id) => {
            setCurrentView('map');
            if (type === 'ship') {
              setSelectedMMSI(id);
              setTargetPortId(null);
            } else if (type === 'port') {
              setTargetPortId(id);
              setSelectedMMSI(null);
            }
          }}
        />
      </div>

      {/* Persistent Live Map View Container (Desktop Side-by-Side View, Mobile Vertical Stacked View) */}
      <div className={`flex-1 relative overflow-hidden mt-2 sm:mt-3 px-2 sm:px-3 pb-2 sm:pb-3 gap-3 z-10 ${currentView === 'map' ? 'flex flex-col md:flex-row' : 'hidden'}`}>
        {/* Left Side: Fleet Directory Section (Top Section on Mobile, Left Panel on Desktop) */}
        <aside
          ref={sidebarRef}
          className="w-full md:w-80 lg:w-92 h-52 sm:h-60 md:h-full shrink-0 doppelrand-shell flex flex-col z-20 shadow-xl"
        >
          <div className="doppelrand-core flex-1 flex flex-col overflow-hidden p-3 sm:p-3.5 border border-white/10 bg-[#05070c]/95 backdrop-blur-xl">
            {/* Header Title */}
            <div className="pb-2 border-b border-white/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-white" />
                <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-white">
                  Fleet Directory (<GsapCounter value={ships.size} />)
                </h2>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                ● LIVE AIS DATA
              </span>
            </div>

            {/* Search Box */}
            <div className="pt-2 pb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, type, MMSI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-slate-900/80 border border-white/15 rounded-xl text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            {/* Filter Tabs Bar (ALL, MOVING, ANCHORED) */}
            <div className="flex gap-1.5 py-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: 'all', label: 'ALL' },
                { id: 'moving', label: 'MOVING (>0.5kn)' },
                { id: 'anchored', label: 'ANCHORED' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all shrink-0 ${activeFilter === tab.id
                    ? 'bg-white text-slate-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Vessels List with ALL Details */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {filteredShipsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-slate-400 text-center gap-2">
                  <Activity className="w-6 h-6 text-white/50 animate-pulse" />
                  <p className="text-xs font-mono">Scanning AIS frequency...</p>
                </div>
              ) : (
                filteredShipsList.map(ship => (
                  <div
                    key={ship.mmsi}
                    onClick={() => setSelectedMMSI(ship.mmsi)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${selectedMMSI === ship.mmsi
                      ? 'bg-white/20 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                      : 'bg-white/[0.04] border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                  >
                    {/* Header Row: Ship Name & Speed */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-mono text-xs font-black text-white truncate max-w-[170px]">
                        {ship.name || `MMSI ${ship.mmsi}`}
                      </div>
                      <div className="text-right shrink-0">
                        <GsapCounter value={ship.sog} decimals={1} suffix=" kn" className="text-xs font-black font-mono text-emerald-400 inline-block mr-1" />
                        <GsapCounter value={ship.cog} decimals={0} suffix="°" className="text-[10px] text-slate-400 font-mono inline-block" />
                      </div>
                    </div>

                    {/* Sub Row: Vessel Type & MMSI */}
                    <div className="flex items-center justify-between gap-2 text-[9px] font-mono mb-1">
                      <span className="text-sky-300 font-extrabold bg-sky-950/70 px-1.5 py-0.5 rounded border border-sky-500/30 truncate max-w-[130px]">
                        {ship.shipType || 'Container Vessel'}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        MMSI: {ship.mmsi}
                      </span>
                    </div>

                    {/* Detail Row: Coordinates & Destination */}
                    <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-300">
                      <span>
                        LAT: <strong className="text-white">{ship.lat.toFixed(3)}°</strong> | LON: <strong className="text-white">{ship.lon.toFixed(3)}°</strong>
                      </span>
                      <span className="text-amber-300 font-bold truncate max-w-[110px]">
                        {ship.destination || 'Colombo Port'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Right Side: Interactive Map Container (Positioned Side-by-Side on Desktop) */}
        <div className="flex-1 w-full md:w-auto h-[350px] md:h-full min-w-0 relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
          <VesselMap
            ships={ships}
            selectedMMSI={selectedMMSI}
            onSelectVessel={setSelectedMMSI}
            mapStyle={mapStyle}
            trackedMMSI={trackedMMSI}
            targetPortId={targetPortId}
          />

          {/* GSAP Sonar Radar Overlay */}
          <RadarOverlay
            active={radarActive}
            onClose={() => setRadarActive(false)}
            shipsCount={ships.size}
            selectedMMSI={selectedMMSI}
            ships={ships}
            onSelectShip={(mmsi) => {
              setSelectedMMSI(mmsi);
              setTrackedMMSI(mmsi);
              setRadarActive(false);
            }}
            onSelectPort={(portId) => {
              setTargetPortId(portId);
              setRadarActive(false);
            }}
          />

          {/* Map Tile Style Switcher */}
          <div className="absolute top-4 right-4 z-[800]">
            <div className="glass-island-nav p-1 rounded-2xl flex gap-1 border border-white/20">
              <button
                onClick={() => setMapStyle('dark')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${mapStyle === 'dark' ? 'bg-white text-slate-950 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'text-slate-300 hover:text-white'
                  }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${mapStyle === 'satellite' ? 'bg-white text-slate-950 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'text-slate-300 hover:text-white'
                  }`}
              >
                <Globe className="w-3.5 h-3.5" /> Satellite
              </button>
              <button
                onClick={() => setMapStyle('osm')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${mapStyle === 'osm' ? 'bg-white text-slate-950 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'text-slate-300 hover:text-white'
                  }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Street
              </button>
            </div>
          </div>

          {/* Selected Vessel Doppelrand Hardware Dossier Modal (Data Docked Live API) */}
          {selectedShipData && (
            <div
              ref={modalRef}
              className="absolute bottom-2 left-2 right-2 sm:bottom-6 sm:right-6 sm:left-auto w-auto sm:w-92 max-w-full doppelrand-shell z-[850]"
            >
              <div className="doppelrand-core p-3 sm:p-4 border border-white/30 relative shadow-2xl max-h-[42vh] sm:max-h-[80vh] overflow-y-auto bg-[#05070c]/95 backdrop-blur-xl">
                <button
                  onClick={() => setSelectedMMSI(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header Title & Data Docked Badge */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                    <Ship className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[8px] uppercase tracking-widest font-mono text-emerald-300 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        DATA DOCKED API
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">{selectedShipData.flag || 'India 🇮🇳'}</span>
                    </div>
                    <h3 className="font-mono font-extrabold text-sm text-white mt-0.5 truncate max-w-[200px]">
                      {selectedShipData.name || `MMSI: ${selectedShipData.mmsi}`}
                    </h3>
                    <div className="text-[10px] font-mono text-slate-300">
                      IMO: <strong className="text-white">{selectedShipData.imo || '9785586'}</strong> | MMSI: <strong className="text-emerald-400">{selectedShipData.mmsi}</strong>
                    </div>
                  </div>
                </div>

                {/* Voyage & Port Info Box */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-white/15 mb-3 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                      <Anchor className="w-3 h-3 text-amber-400 inline" /> LAST / CURRENT PORT:
                    </span>
                    <span className="text-white font-bold truncate max-w-[170px]">
                      {selectedShipData.lastPort || 'VO Chidambaranar Port (India)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-sky-400 inline" /> DESTINATION PORT:
                    </span>
                    <span className="text-emerald-300 font-bold truncate max-w-[170px]">
                      {selectedShipData.destination || 'Colombo Deepwater Port'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-300 inline" /> ETA ARRIVAL:
                    </span>
                    <span className="text-amber-300 font-bold">
                      {selectedShipData.etaUtc || 'Feb 28, 2026 14:00 UTC'}
                    </span>
                  </div>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 bg-slate-900/80 border border-white/10 rounded-xl">
                    <div className="text-[9px] font-mono uppercase text-slate-400">LATITUDE</div>
                    <GsapCounter value={selectedShipData.lat} decimals={4} suffix="°" className="font-mono text-xs font-bold text-white" />
                  </div>
                  <div className="p-2 bg-slate-900/80 border border-white/10 rounded-xl">
                    <div className="text-[9px] font-mono uppercase text-slate-400">LONGITUDE</div>
                    <GsapCounter value={selectedShipData.lon} decimals={4} suffix="°" className="font-mono text-xs font-bold text-white" />
                  </div>
                  <div className="p-2 bg-slate-900/80 border border-white/10 rounded-xl">
                    <div className="text-[9px] font-mono uppercase text-slate-400">SPEED (SOG)</div>
                    <GsapCounter value={selectedShipData.sog} decimals={1} suffix=" kn" className="font-mono text-xs font-bold text-emerald-400" />
                  </div>
                  <div className="p-2 bg-slate-900/80 border border-white/10 rounded-xl">
                    <div className="text-[9px] font-mono uppercase text-slate-400">COURSE (COG)</div>
                    <GsapCounter value={selectedShipData.cog} decimals={0} suffix="°" className="font-mono text-xs font-bold text-amber-300" />
                  </div>
                </div>

                {/* Vessel Particulars Grid */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-white/15 mb-3 font-mono text-[10px] space-y-1.5">
                  <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest border-b border-white/10 pb-1 mb-1 flex items-center gap-1">
                    <Ship className="w-3 h-3 text-emerald-400 inline" /> VESSEL PARTICULARS &amp; DIMENSIONS
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">VESSEL TYPE:</span>
                    <span className="text-white font-bold">{selectedShipData.shipType || 'Cargo Vessel'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">LENGTH x BEAM:</span>
                    <span className="text-white font-bold">{selectedShipData.length || '68 m.'} x {selectedShipData.beam || '16 m.'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DRAUGHT:</span>
                    <span className="text-white font-bold">{selectedShipData.draught || '4 m.'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GROSS / DEADWEIGHT:</span>
                    <span className="text-white font-bold">{selectedShipData.grossTonnage || '2,313 GT'} / {selectedShipData.deadweight || '2,000 DWT'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">HOME PORT:</span>
                    <span className="text-white font-bold">{selectedShipData.homePort || 'MUMBAI'}</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
                  <span className="text-[9px] font-mono text-slate-400">
                    PING: <strong className="text-white">{selectedShipData.lastUpdated ? selectedShipData.lastUpdated.toLocaleTimeString() : 'LIVE'}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openCompanion('navigator')}
                      className="px-3 py-1.5 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500 hover:text-slate-950 flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      NAVIGATOR AI
                    </button>

                    <button
                      onClick={() => setTrackedMMSI(trackedMMSI === selectedShipData.mmsi ? null : selectedShipData.mmsi)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${trackedMMSI === selectedShipData.mmsi
                        ? 'bg-white text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                        : 'bg-white/10 text-white border border-white/30 hover:bg-white hover:text-slate-950'
                        }`}
                    >
                      <Route className="w-3.5 h-3.5" />
                      {trackedMMSI === selectedShipData.mmsi ? 'TRACKED' : 'TRACK PATH'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GSAP Sonar Radar Overlay (Root Mounted for 100% Context Access) */}
      <RadarOverlay
        active={radarActive}
        onClose={() => setRadarActive(false)}
        shipsCount={ships.size}
        selectedMMSI={selectedMMSI}
        ships={ships}
      />
    </div>
  );
}
