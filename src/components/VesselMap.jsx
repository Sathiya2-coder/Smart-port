import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { gsap } from 'gsap';
import { Anchor, X, Compass, ChevronDown, ChevronUp } from 'lucide-react';

function getVesselColor(shipType = '') {
  const typeLower = String(shipType).toLowerCase();

  if (typeLower.includes('tanker') || typeLower.includes('oil') || typeLower.includes('chemical') || typeLower.includes('lpg') || typeLower.includes('lng')) {
    return { fill: '#ff3366', glow: 'drop-shadow(0 0 10px rgba(255,51,102,0.95))' }; // Vibrant Red for Tankers
  }
  if (typeLower.includes('bulk') || typeLower.includes('ore') || typeLower.includes('grain') || typeLower.includes('coal')) {
    return { fill: '#10b981', glow: 'drop-shadow(0 0 10px rgba(16,185,129,0.95))' }; // Vibrant Emerald for Bulk Carriers
  }
  if (typeLower.includes('offshore') || typeLower.includes('supply') || typeLower.includes('tug') || typeLower.includes('support')) {
    return { fill: '#a855f7', glow: 'drop-shadow(0 0 10px rgba(168,85,247,0.95))' }; // Vibrant Purple for Offshore / Tugs
  }
  if (typeLower.includes('passenger') || typeLower.includes('ro-ro') || typeLower.includes('ferry') || typeLower.includes('feeder')) {
    return { fill: '#ec4899', glow: 'drop-shadow(0 0 10px rgba(236,72,153,0.95))' }; // Vibrant Pink for Passenger / Ferries
  }
  // Default Container / Cargo Vessel -> Vibrant Cyan / Sky Blue
  return { fill: '#00f0ff', glow: 'drop-shadow(0 0 10px rgba(0,240,255,0.95))' };
}

function getCategoryKey(shipType = '') {
  const typeLower = String(shipType).toLowerCase();
  if (typeLower.includes('tanker') || typeLower.includes('oil') || typeLower.includes('chemical') || typeLower.includes('lpg') || typeLower.includes('lng')) {
    return 'tanker';
  }
  if (typeLower.includes('bulk') || typeLower.includes('ore') || typeLower.includes('grain') || typeLower.includes('coal')) {
    return 'bulk';
  }
  if (typeLower.includes('offshore') || typeLower.includes('supply') || typeLower.includes('tug') || typeLower.includes('support')) {
    return 'offshore';
  }
  if (typeLower.includes('passenger') || typeLower.includes('ro-ro') || typeLower.includes('ferry') || typeLower.includes('feeder')) {
    return 'passenger';
  }
  return 'container';
}

function createShipIcon(cog = 0, isSelected = false, shipType = '', shipName = '', sog = 0) {
  // Round COG to nearest 5 degrees for clean SVG rendering
  const roundedCog = Math.round(cog / 5) * 5;
  const colorData = getVesselColor(shipType);

  const fill = isSelected ? '#34d399' : colorData.fill;
  const stroke = isSelected ? '#ffffff' : '#05070c';
  const glow = isSelected ? 'drop-shadow(0 0 16px rgba(52,211,153,1))' : colorData.glow;
  const size = isSelected ? 34 : 26;

  // Shorten ship name for badge (e.g. "MV MUNDRA GIANT" -> "MV MUNDRA")
  const displayName = shipName ? (shipName.length > 16 ? shipName.substring(0, 14) + '..' : shipName) : 'VESSEL';
  const speedText = typeof sog === 'number' ? `${sog.toFixed(1)}kn` : '';

  const svgHtml = `
    <div class="ship-marker-container flex flex-col items-center justify-center pointer-events-auto" style="transform: translate(-50%, -50%);">
      <div class="ship-marker-wrapper relative flex items-center justify-center">
        <div class="absolute inset-0 rounded-full ${isSelected ? 'bg-emerald-400/50 animate-ping' : 'bg-sky-400/20 animate-pulse'}" style="width:${size + 8}px; height:${size + 8}px; margin:-4px;"></div>
        <div class="ship-marker-inner relative flex items-center justify-center" style="transform: rotate(${roundedCog}deg); width: ${size}px; height: ${size}px; filter: ${glow};">
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer Vessel Hull */}
            <path d="M12 2L18.5 8.5V18.5C18.5 20 17 21 15.5 21H8.5C7 21 5.5 20 5.5 18.5V8.5L12 2Z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
            {/* Deck Bridge Cabin */}
            <rect x="9" y="11" width="6" height="5" rx="1" fill="${stroke}" opacity="0.85"/>
            {/* Vessel Bow Navigation Tip Dot */}
            <circle cx="12" cy="6" r="1.5" fill="#ffffff"/>
          </svg>
        </div>
      </div>
      <div class="mt-0.5 px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300' : 'bg-slate-950/90 border-white/20 text-slate-200'} border font-mono text-[8.5px] font-extrabold shadow-[0_2px_10px_rgba(0,0,0,0.9)] whitespace-nowrap tracking-tight flex items-center gap-1">
        <span>${displayName}</span>
        ${speedText ? `<span class="${isSelected ? 'text-white' : 'text-emerald-400'} font-bold">${speedText}</span>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-ship-marker bg-transparent border-0 shadow-none outline-none',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

// ⚓ Distinct Amber Gold Color Format for Major Ports (with Permanent Port Spot Label Badges)
function createPortIcon(portName = '', isSelected = false) {
  const fill = '#fbbf24'; // Glowing Amber Gold
  const glow = 'drop-shadow(0 0 16px rgba(251,191,36,1))';
  const size = isSelected ? 34 : 26;

  // Extract clean port name (e.g., "VO Chidambaranar Port", "Chennai Port", "JNPT Nhava Sheva")
  const shortName = portName ? portName.split('(')[0].trim() : 'PORT';

  const svgHtml = `
    <div class="port-marker-container flex flex-col items-center justify-center pointer-events-auto" style="transform: translate(-50%, -50%);">
      <div class="port-marker-wrapper relative flex items-center justify-center">
        <div class="absolute inset-0 rounded-xl bg-amber-400/40 animate-ping pointer-events-none"></div>
        <div class="port-marker-inner relative flex items-center justify-center rounded-xl bg-slate-950/95 border-2 border-amber-400 p-1" style="width: ${size}px; height: ${size}px; filter: ${glow};">
          <svg width="${size - 8}" height="${size - 8}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="5" r="2.5" stroke="${fill}" stroke-width="2.2"/>
            <path d="M12 7.5V19.5" stroke="${fill}" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M7 11.5H17" stroke="${fill}" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M5 15.5C5 19 8 20.5 12 20.5C16 20.5 19 19 19 15.5" stroke="${fill}" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div class="mt-1 px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-amber-400/60 font-mono text-[9px] font-extrabold text-amber-300 shadow-[0_2px_10px_rgba(0,0,0,0.9)] whitespace-nowrap tracking-tight">
        ${shortName}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-port-marker bg-transparent border-0 shadow-none outline-none',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

// Major Indian Ocean Ports Dataset (with Live Data Docked Capacity & Occupancy Analytics)
const INDIAN_OCEAN_PORTS = [
  {
    id: 'voc-port',
    name: 'VO Chidambaranar Port (Thoothukudi, India)',
    lat: 8.7533,
    lon: 78.1827,
    type: 'Container & Bulk Hub',
    capacity: 14,
    currentShips: 10,
    expectedArrivals: 4,
    departures: 2,
    occupancy: 71,
    availableBerths: 4,
    congestion: 'MODERATE',
    aiPrediction: 'HIGH CONGESTION in 30m',
    status: 'OPERATIONAL'
  },
  {
    id: 'chennai-port',
    name: 'Chennai Port (TN, India)',
    lat: 13.0827,
    lon: 80.2707,
    type: 'Major Container Gateway',
    capacity: 25,
    currentShips: 18,
    expectedArrivals: 7,
    departures: 3,
    occupancy: 72,
    availableBerths: 7,
    congestion: 'LOW',
    aiPrediction: 'MODERATE in 45m',
    status: 'OPERATIONAL'
  },
  {
    id: 'jnpt-mumbai',
    name: 'JNPT Nhava Sheva (Navi Mumbai, India)',
    lat: 18.9500,
    lon: 72.9500,
    type: 'Mega Container Port',
    capacity: 30,
    currentShips: 26,
    expectedArrivals: 9,
    departures: 4,
    occupancy: 87,
    availableBerths: 4,
    congestion: 'HIGH',
    aiPrediction: 'CRITICAL QUEUE in 20m',
    status: 'OPERATIONAL'
  },
  {
    id: 'cochin-port',
    name: 'Cochin Port (Kochi, Kerala, India)',
    lat: 9.9667,
    lon: 76.2667,
    type: 'Transshipment & Bunkering',
    capacity: 18,
    currentShips: 12,
    expectedArrivals: 5,
    departures: 3,
    occupancy: 67,
    availableBerths: 6,
    congestion: 'LOW',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  },
  {
    id: 'vizag-port',
    name: 'Visakhapatnam Port (Vizag, AP, India)',
    lat: 17.6868,
    lon: 83.2185,
    type: 'Deepwater Iron Ore Hub',
    capacity: 22,
    currentShips: 16,
    expectedArrivals: 6,
    departures: 2,
    occupancy: 73,
    availableBerths: 6,
    congestion: 'MODERATE',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  },
  {
    id: 'mundra-port',
    name: 'Mundra Port (Kutch, Gujarat, India)',
    lat: 22.7381,
    lon: 69.7042,
    type: 'Private Mega Port',
    capacity: 26,
    currentShips: 22,
    expectedArrivals: 8,
    departures: 5,
    occupancy: 85,
    availableBerths: 4,
    congestion: 'HIGH',
    aiPrediction: 'HIGH CONGESTION in 15m',
    status: 'OPERATIONAL'
  },
  {
    id: 'ennore-port',
    name: 'Kamarajar Port (Ennore, TN, India)',
    lat: 13.2500,
    lon: 80.3333,
    type: 'Energy & Coal Port',
    capacity: 12,
    currentShips: 8,
    expectedArrivals: 3,
    departures: 1,
    occupancy: 67,
    availableBerths: 4,
    congestion: 'LOW',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  },
  {
    id: 'paradip-port',
    name: 'Paradip Port (Odisha, India)',
    lat: 20.2618,
    lon: 86.6713,
    type: 'Bulk & Mineral Port',
    capacity: 20,
    currentShips: 14,
    expectedArrivals: 5,
    departures: 3,
    occupancy: 70,
    availableBerths: 6,
    congestion: 'MODERATE',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  },
  {
    id: 'colombo-port',
    name: 'Port of Colombo (Sri Lanka)',
    lat: 6.9400,
    lon: 79.8400,
    type: 'South Asia Transshipment Hub',
    capacity: 28,
    currentShips: 24,
    expectedArrivals: 10,
    departures: 6,
    occupancy: 86,
    availableBerths: 4,
    congestion: 'HIGH',
    aiPrediction: 'QUEUE IN 35m',
    status: 'OPERATIONAL'
  },
  {
    id: 'singapore-port',
    name: 'Port of Singapore (Malacca Strait)',
    lat: 1.2902,
    lon: 103.8519,
    type: 'Global Bunkering Hub',
    capacity: 67,
    currentShips: 58,
    expectedArrivals: 22,
    departures: 18,
    occupancy: 87,
    availableBerths: 9,
    congestion: 'CRITICAL',
    aiPrediction: 'HEAVY DOCKING QUEUE',
    status: 'OPERATIONAL'
  },
  {
    id: 'port-louis',
    name: 'Port Louis (Mauritius)',
    lat: -20.1609,
    lon: 57.5012,
    type: 'Indian Ocean Hub',
    capacity: 10,
    currentShips: 6,
    expectedArrivals: 2,
    departures: 1,
    occupancy: 60,
    availableBerths: 4,
    congestion: 'LOW',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  },
  {
    id: 'chittagong-port',
    name: 'Port of Chittagong (Bay of Bengal)',
    lat: 22.3569,
    lon: 91.7832,
    type: 'Bay of Bengal Terminal',
    capacity: 16,
    currentShips: 13,
    expectedArrivals: 4,
    departures: 2,
    occupancy: 81,
    availableBerths: 3,
    congestion: 'HIGH',
    aiPrediction: 'MODERATE',
    status: 'OPERATIONAL'
  },
  {
    id: 'port-blair',
    name: 'Port Blair (Andaman & Nicobar)',
    lat: 11.6234,
    lon: 92.7265,
    type: 'Island Logistics Hub',
    capacity: 8,
    currentShips: 4,
    expectedArrivals: 2,
    departures: 1,
    occupancy: 50,
    availableBerths: 4,
    congestion: 'LOW',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  },
  {
    id: 'mormugao-port',
    name: 'Mormugao Port (Goa, India)',
    lat: 15.4167,
    lon: 73.8000,
    type: 'Iron Ore Hub',
    capacity: 11,
    currentShips: 7,
    expectedArrivals: 3,
    departures: 2,
    occupancy: 64,
    availableBerths: 4,
    congestion: 'LOW',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  },
  {
    id: 'new-mangalore',
    name: 'New Mangalore Port (Karnataka, India)',
    lat: 12.9167,
    lon: 74.8000,
    type: 'LPG & Crude Terminal',
    capacity: 15,
    currentShips: 10,
    expectedArrivals: 4,
    departures: 2,
    occupancy: 67,
    availableBerths: 5,
    congestion: 'LOW',
    aiPrediction: 'STABLE FLOW',
    status: 'OPERATIONAL'
  }
];

export default function VesselMap({
  ships,
  selectedMMSI,
  onSelectVessel,
  mapStyle,
  trackedMMSI,
  targetPortId = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map()); // MMSI -> L.Marker
  const portMarkersRef = useRef(new Map()); // PortID -> L.Marker
  const pathLinesRef = useRef(new Map()); // MMSI -> L.Polyline
  const tileLayersRef = useRef({});

  // Constant Spot Coordinates State (Indian Ocean Regional Datum) & Selected Port Modal State
  const [spotCoords, setSpotCoords] = useState({ lat: 16.0000, lon: 74.5000 });
  const [selectedPort, setSelectedPort] = useState(null);

  // Filter: which vessel categories are visible on map
  const [visibleCategories, setVisibleCategories] = useState({
    container: true,
    tanker: true,
    bulk: true,
    offshore: true,
    passenger: true
  });
  const [showPorts, setShowPorts] = useState(true);
  const [filterLegendCollapsed, setFilterLegendCollapsed] = useState(false);

  const toggleCategory = (key) => {
    setVisibleCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Indian Ocean Maritime Territory Max Bounds (Locks focus centered over Indian Ocean region)
  const indianOceanBounds = L.latLngBounds(
    L.latLng(-45.0, 20.0),  // South-West (Southern Indian Ocean / East Africa / Red Sea)
    L.latLng(38.0, 130.0)   // North-East (Arabian Sea / Bay of Bengal / Malacca Strait / South China Sea)
  );

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [16.0, 74.5], // Perfectly centered over Indian Ocean, Subcontinent & Arabian Sea
      zoom: 5, // Ideal Regional View
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      preferCanvas: true, // Use Canvas renderer for maximum performance
      dragging: true,
      tap: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      bounceAtZoomLimits: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Track Cursor & Center Spot Coordinates
    const updateSpot = (lat, lon) => {
      setSpotCoords({
        lat: parseFloat(lat.toFixed(4)),
        lon: parseFloat(lon.toFixed(4))
      });
    };

    map.on('mousemove', (e) => {
      updateSpot(e.latlng.lat, e.latlng.lng);
    });

    map.on('move', () => {
      const center = map.getCenter();
      updateSpot(center.lat, center.lng);
    });

    tileLayersRef.current = {
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18
      }),
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      })
    };

    tileLayersRef.current.dark.addTo(map);
    mapInstanceRef.current = map;

    // Render Major Indian Ocean Port Markers (Distinct Amber / Gold Anchor Format)
    INDIAN_OCEAN_PORTS.forEach(port => {
      const icon = createPortIcon(port.name, false);
      const marker = L.marker([port.lat, port.lon], { icon, zIndexOffset: 50 }).addTo(map);

      // Click Port Marker: Open Port Modal & automatically close any active Vessel Detail Modal
      marker.on('click', () => {
        setSelectedPort(port);
        if (onSelectVessel) onSelectVessel(null); // Close active ship detail card
        map.closePopup(); // Close any active ship popup
        map.panTo([port.lat, port.lon], { animate: true, duration: 0.5 });
      });

      portMarkersRef.current.set(port.id, marker);
    });

    // Auto Recenter on Initial Mount & Layout Settle
    const autoRecenter = () => {
      if (mapInstanceRef.current && mapInstanceRef.current._loaded) {
        mapInstanceRef.current.invalidateSize({ pan: false });
        mapInstanceRef.current.setView([16.0, 74.5], 5, { animate: false });
      }
    };

    // Staggered settle checks ensuring 100% accurate centering on all devices
    requestAnimationFrame(autoRecenter);
    const t1 = setTimeout(autoRecenter, 100);
    const t2 = setTimeout(autoRecenter, 300);
    const t3 = setTimeout(autoRecenter, 700);

    // Automatic Native ResizeObserver to immediately recalculate Leaflet dimensions
    const resizeObserver = new ResizeObserver((entries) => {
      if (mapInstanceRef.current && mapInstanceRef.current._loaded) {
        mapInstanceRef.current.invalidateSize({ pan: false });
        mapInstanceRef.current.setView([16.0, 74.5], 5, { animate: false });
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle port marker visibility instantly using CSS display (avoids add/remove lifecycle issues)
  useEffect(() => {
    portMarkersRef.current.forEach((marker) => {
      const el = marker.getElement();
      if (el) el.style.display = showPorts ? '' : 'none';
    });
    if (!showPorts) setSelectedPort(null);
  }, [showPorts]);

  // Toggle vessel category visibility instantly using CSS display
  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const catKey = marker._catKey || 'container';
      const el = marker.getElement();
      if (el) el.style.display = visibleCategories[catKey] !== false ? '' : 'none';
    });
  }, [visibleCategories]);

  // 2. Map Style Switcher
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayersRef.current) return;

    Object.values(tileLayersRef.current).forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });

    const activeTile = tileLayersRef.current[mapStyle] || tileLayersRef.current.dark;
    activeTile.addTo(map);
    map.invalidateSize();
  }, [mapStyle]);

  // Handle Container Resize / Visibility Invalidation (Instant 0-delay Recenter on Load)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && map._container) {
      map.invalidateSize();
      if (!selectedMMSI && !trackedMMSI) {
        map.setView([16.0, 74.5], 5, { animate: false });
      }
    }
  }, []);

  // 3. Fast Incremental Marker Updates with GSAP Smooth Tweening
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMMSIs = new Set(ships.keys());

    ships.forEach((ship, mmsi) => {
      const isSelected = selectedMMSI === mmsi;
      const targetPosition = [ship.lat, ship.lon];

      if (markersRef.current.has(mmsi)) {
        const marker = markersRef.current.get(mmsi);
        const oldPos = marker.getLatLng();

        // Smooth GSAP Marker Coordinate Interpolation
        if (oldPos.lat !== ship.lat || oldPos.lng !== ship.lon) {
          if (marker._gsapTween) marker._gsapTween.kill();

          const posObj = { lat: oldPos.lat, lng: oldPos.lng };
          marker._gsapTween = gsap.to(posObj, {
            lat: ship.lat,
            lng: ship.lon,
            duration: 1.0,
            ease: 'power1.out',
            onUpdate: () => {
              marker.setLatLng([posObj.lat, posObj.lng]);
            }
          });
        }

        // Update icon if selection state changed
        if (marker._isSelected !== isSelected) {
          marker.setIcon(createShipIcon(ship.cog, isSelected, ship.shipType, ship.name, ship.sog));
          marker.setZIndexOffset(isSelected ? 3000 : 2000);
          marker._isSelected = isSelected;

          // Scale pop animation for marker element using GSAP
          const iconElem = marker.getElement();
          if (iconElem) {
            gsap.fromTo(
              iconElem,
              { scale: isSelected ? 1.4 : 0.8 },
              { scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
            );
          }
        }
      } else {
        const icon = createShipIcon(ship.cog, isSelected, ship.shipType, ship.name, ship.sog);
        const marker = L.marker(targetPosition, { icon, zIndexOffset: isSelected ? 3000 : 2000 }).addTo(map);
        marker._isSelected = isSelected;
        // Store category key for filter toggling
        marker._catKey = getCategoryKey(ship.shipType);
        // Apply current filter state immediately
        const catKey = getCategoryKey(ship.shipType);
        if (visibleCategories[catKey] === false) {
          setTimeout(() => {
            const el = marker.getElement();
            if (el) el.style.display = 'none';
          }, 0);
        }

        // Exact Ship Detail Popup Card (Shows at exact specific marker point on map)
        const shipPopupHtml = `
          <div style="background:#020617; border:1.5px solid rgba(56,189,248,0.7); padding:10px; border-radius:12px; font-family:monospace; color:#f8fafc; width:220px; box-shadow:0 0 20px rgba(0,0,0,0.95);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
              <span style="color:#00f0ff; font-weight:bold; font-size:9px; text-transform:uppercase;">${ship.shipType || 'VESSEL'}</span>
              <span style="color:#34d399; font-size:8px; font-weight:bold;">● AIS LIVE</span>
            </div>
            <div style="font-weight:800; font-size:12px; color:#ffffff; line-height:1.2; margin-bottom:4px;">${ship.name || `MMSI: ${mmsi}`}</div>
            <div style="font-size:9px; color:#94a3b8; margin-bottom:4px;">IMO: <strong style="color:#ffffff;">${ship.imo || '9785586'}</strong> | MMSI: <strong style="color:#38bdf8;">${mmsi}</strong></div>
            <div style="font-size:9px; color:#e2e8f0; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; margin-top:4px;">
              LAT: <strong style="color:#ffffff;">${ship.lat.toFixed(4)}° N</strong> | LON: <strong style="color:#ffffff;">${ship.lon.toFixed(4)}° E</strong>
            </div>
            <div style="font-size:9px; color:#e2e8f0; margin-top:2px;">
              SPEED: <strong style="color:#34d399;">${ship.sog.toFixed(1)} kn</strong> | COG: <strong style="color:#fbbf24;">${ship.cog.toFixed(0)}°</strong>
            </div>
            <div style="font-size:9px; color:#94a3b8; margin-top:4px;">
              DEST: <strong style="color:#38bdf8;">${ship.destination || 'Port'}</strong>
            </div>
          </div>
        `;

        marker.bindPopup(shipPopupHtml, {
          className: 'custom-vessel-popup',
          closeButton: false,
          autoPan: true,
          offset: L.point(0, -10)
        });

        marker.on('click', () => {
          setSelectedPort(null); // Close active port detail modal
          onSelectVessel(mmsi);
          marker.openPopup();
        });
        markersRef.current.set(mmsi, marker);

        // GSAP Drop-in entrance animation for new markers
        const iconElem = marker.getElement();
        if (iconElem) {
          gsap.fromTo(
            iconElem,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }
          );
        }
      }

      // Selected Ship Path History Line
      if (isSelected && ship.history && ship.history.length > 1) {
        if (pathLinesRef.current.has(mmsi)) {
          pathLinesRef.current.get(mmsi).setLatLngs(ship.history);
        } else {
          const polyline = L.polyline(ship.history, {
            color: '#ffffff',
            weight: 3,
            opacity: 0.9,
            dashArray: '6, 8'
          }).addTo(map);
          pathLinesRef.current.set(mmsi, polyline);
        }
      } else {
        if (pathLinesRef.current.has(mmsi)) {
          map.removeLayer(pathLinesRef.current.get(mmsi));
          pathLinesRef.current.delete(mmsi);
        }
      }

      if (trackedMMSI === mmsi) {
        map.panTo(targetPosition);
      }
    });

    // Remove old markers with GSAP shrink animation
    markersRef.current.forEach((marker, mmsi) => {
      if (!currentMMSIs.has(mmsi)) {
        if (marker._gsapTween) marker._gsapTween.kill();
        const iconElem = marker.getElement();
        if (iconElem) {
          gsap.to(iconElem, {
            scale: 0,
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
              map.removeLayer(marker);
              markersRef.current.delete(mmsi);
            }
          });
        } else {
          map.removeLayer(marker);
          markersRef.current.delete(mmsi);
        }

        if (pathLinesRef.current.has(mmsi)) {
          map.removeLayer(pathLinesRef.current.get(mmsi));
          pathLinesRef.current.delete(mmsi);
        }
      }
    });
  }, [ships, selectedMMSI, trackedMMSI, onSelectVessel]);

  // 4. Smooth Fly-To & Center map when a ship is selected from directory sidebar
  useEffect(() => {
    if (selectedMMSI) {
      setSelectedPort(null); // Clear port modal when a ship is selected from directory
    }
    const map = mapInstanceRef.current;
    if (!map || !map._loaded || !selectedMMSI || !ships.has(selectedMMSI)) return;

    const ship = ships.get(selectedMMSI);
    if (!ship || typeof ship.lat !== 'number' || typeof ship.lon !== 'number' || isNaN(ship.lat) || isNaN(ship.lon)) return;

    try {
      const size = map.getSize();
      if (!size || size.x === 0 || size.y === 0) return;
      const targetZoom = Math.max(map.getZoom(), 7);
      map.flyTo([ship.lat, ship.lon], targetZoom, {
        animate: true,
        duration: 1.0
      });
    } catch (e) {
      // Safe fallback if container is resizing
    }
  }, [selectedMMSI]);

  // 5. Smooth Fly-To & Center map to target selected port
  useEffect(() => {
    if (!targetPortId) return;
    const foundPort = INDIAN_OCEAN_PORTS.find(
      p => p.id === targetPortId || p.name.toLowerCase().includes(targetPortId.toLowerCase())
    );

    if (foundPort && typeof foundPort.lat === 'number' && typeof foundPort.lon === 'number' && !isNaN(foundPort.lat) && !isNaN(foundPort.lon)) {
      setSelectedPort(foundPort);
      const map = mapInstanceRef.current;
      if (map && map._loaded) {
        try {
          const size = map.getSize();
          if (size && size.x > 0 && size.y > 0) {
            map.flyTo([foundPort.lat, foundPort.lon], 7, {
              animate: true,
              duration: 1.0
            });
          }
        } catch (e) {
          // Safe fallback
        }
      }
    }
  }, [targetPortId]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Vessel Type Filter Legend (Top Left Overlay) — Desktop/Tablet only */}
      <div className="hidden sm:block absolute top-4 left-4 z-[800] pointer-events-auto">
        <div className="glass-island-nav p-2 sm:p-2.5 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md font-mono text-[10px] space-y-1 min-w-[180px] max-w-[210px]">
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest border-b border-white/10 pb-1 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>FLEET FILTER</span>
              <span className="text-emerald-400 font-extrabold">● LIVE</span>
            </div>
            <button
              onClick={() => setFilterLegendCollapsed(prev => !prev)}
              className="p-0.5 rounded hover:bg-white/15 text-slate-300 hover:text-white transition"
              title={filterLegendCollapsed ? "Expand Filter Options" : "Collapse Filter Options"}
            >
              {filterLegendCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!filterLegendCollapsed && (
            <>
              {[
                { key: 'container', color: '#00f0ff', label: 'Container / Cargo' },
                { key: 'tanker',    color: '#ff3366', label: 'Oil / LNG Tanker' },
                { key: 'bulk',      color: '#10b981', label: 'Bulk & Ore Carrier' },
                { key: 'offshore',  color: '#a855f7', label: 'Offshore & Support' },
                { key: 'passenger', color: '#ec4899', label: 'Passenger / Ro-Ro' },
              ].map(({ key, color, label }) => {
                const active = visibleCategories[key] !== false;
                return (
                  <button
                    key={key}
                    onClick={() => toggleCategory(key)}
                    title={active ? `Hide ${label}` : `Show ${label}`}
                    className="flex items-center gap-2 w-full rounded-lg px-1 py-0.5 transition-all duration-200 hover:bg-white/10 cursor-pointer select-none"
                    style={{ opacity: active ? 1 : 0.35 }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-200"
                      style={{
                        background: active ? color : '#475569',
                        boxShadow: active ? `0 0 8px ${color}` : 'none'
                      }}
                    />
                    <span className={`font-semibold transition-colors duration-200 ${active ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                      {label}
                    </span>
                    <span className="ml-auto text-[8px] font-bold" style={{ color: active ? '#34d399' : '#64748b' }}>
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setShowPorts(prev => !prev)}
                title={showPorts ? 'Hide Major Ports' : 'Show Major Ports'}
                className="flex items-center gap-2 w-full rounded-lg px-1 py-0.5 border-t border-white/10 pt-1 transition-all duration-200 hover:bg-white/10 cursor-pointer select-none"
                style={{ opacity: showPorts ? 1 : 0.35 }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-all duration-200"
                  style={{
                    background: showPorts ? '#fbbf24' : '#475569',
                    boxShadow: showPorts ? '0 0 8px #fbbf24' : 'none'
                  }}
                />
                <span className={`font-semibold transition-colors duration-200 ${showPorts ? 'text-amber-300' : 'text-slate-500 line-through'}`}>
                  Major Ports
                </span>
                <span className="ml-auto text-[8px] font-bold" style={{ color: showPorts ? '#fbbf24' : '#64748b' }}>
                  {showPorts ? 'ON' : 'OFF'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Constant Re-Center Spot Datum Indicator & Re-Center Button */}
      <div className="absolute bottom-6 left-6 z-[800] pointer-events-auto">
        <div className="glass-island-nav px-3.5 py-2 rounded-2xl flex items-center gap-3 border border-white/20 shadow-2xl backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="font-mono text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              RE-CENTER SPOT (INDIAN OCEAN)
            </span>
            <span className="text-white font-bold">
              16.0000° N, 74.5000° E
            </span>
          </div>
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([16.0, 74.5], 5, { animate: true, duration: 0.8 });
              }
            }}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/25 border border-white/20 text-[10px] font-mono font-bold text-white transition flex items-center gap-1.5 shrink-0 shadow-md"
            title="Re-Center Map to Constant Spot: 16.0° N, 74.5° E"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>RE-CENTER</span>
          </button>
        </div>
      </div>
      {/* Selected Port Live Capacity & AI Congestion Hardware Modal (100% visible, never cut off) */}
      {selectedPort && (
        <div className="absolute bottom-6 right-6 w-84 doppelrand-shell z-[850]">
          <div className="doppelrand-core p-4 border border-amber-400/50 relative shadow-2xl">
            <button
              onClick={() => setSelectedPort(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Title */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/40 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                <Anchor className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[8px] font-mono text-emerald-300 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE DATA DOCKED
                  </span>
                </div>
                <h3 className="font-mono font-extrabold text-sm text-white mt-0.5 truncate max-w-[190px]">
                  {selectedPort.name.split('(')[0].trim()}
                </h3>
              </div>
            </div>

            {/* Live Vessels Operations */}
            <div className="p-3 bg-slate-900/90 border border-white/10 rounded-xl mb-2.5 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Ships in Port:</span>
                <strong className="text-sky-400 font-bold">{selectedPort.currentShips} Vessels</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected Arrivals:</span>
                <strong className="text-amber-300 font-bold">{selectedPort.expectedArrivals}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Departures:</span>
                <strong className="text-rose-400 font-bold">{selectedPort.departures}</strong>
              </div>
            </div>

            {/* Berth Capacity & Occupancy Calculation */}
            <div className="p-3 bg-slate-900/90 border border-white/10 rounded-xl mb-2.5 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Max Berth Capacity:</span>
                <strong className="text-white font-bold">{selectedPort.capacity} Berths</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Occupancy:</span>
                <strong className="text-amber-300 font-bold text-sm">{selectedPort.occupancy}%</strong>
              </div>
              {/* Dynamic Progress Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden my-1">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${selectedPort.occupancy}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Berths Available:</span>
                <strong className="text-emerald-400 font-bold">{selectedPort.availableBerths} Free</strong>
              </div>
            </div>

            {/* Congestion Level & AI Prediction */}
            <div className="p-2.5 bg-slate-900/90 border border-white/10 rounded-xl mb-3 font-mono text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">CONGESTION LEVEL:</span>
                <strong className="text-rose-400 font-black tracking-wider">{selectedPort.congestion}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI PREDICTION:</span>
                <strong className="text-purple-400 font-bold">{selectedPort.aiPrediction}</strong>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[9px] text-slate-400">
              <span>LAT: {selectedPort.lat}° N | LON: {selectedPort.lon}° E</span>
              <span className="text-emerald-400 font-bold">UPDATED LIVE</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
