import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { Radio, Shield, X, Anchor, Ship, MapPin, AlertTriangle, Crosshair } from 'lucide-react';

// ─── Indian Ocean Ports (same dataset as VesselMap) ─────────────────────────
const INDIAN_OCEAN_PORTS = [
  { id: 'voc-port', name: 'VO Chidambaranar Port', lat: 8.7533, lon: 78.1827, type: 'Container & Bulk Hub', currentShips: 10, occupancy: 71, congestion: 'MODERATE' },
  { id: 'chennai-port', name: 'Chennai Port', lat: 13.0827, lon: 80.2707, type: 'Major Container Gateway', currentShips: 18, occupancy: 72, congestion: 'LOW' },
  { id: 'jnpt-mumbai', name: 'JNPT Nhava Sheva', lat: 18.9500, lon: 72.9500, type: 'Mega Container Port', currentShips: 26, occupancy: 87, congestion: 'HIGH' },
  { id: 'cochin-port', name: 'Cochin Port', lat: 9.9667, lon: 76.2667, type: 'Transshipment & Bunkering', currentShips: 12, occupancy: 67, congestion: 'LOW' },
  { id: 'vizag-port', name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2185, type: 'Deepwater Iron Ore Hub', currentShips: 16, occupancy: 73, congestion: 'MODERATE' },
  { id: 'mundra-port', name: 'Mundra Port', lat: 22.7381, lon: 69.7042, type: 'Private Mega Port', currentShips: 22, occupancy: 75, congestion: 'MODERATE' },
  { id: 'paradip-port', name: 'Paradip Port', lat: 20.3167, lon: 86.6167, type: 'Coal & Fertilizer Hub', currentShips: 14, occupancy: 79, congestion: 'MODERATE' },
  { id: 'tuticorin', name: 'Thoothukudi Port', lat: 8.7533, lon: 78.1827, type: 'Container Hub', currentShips: 10, occupancy: 71, congestion: 'LOW' },
  { id: 'haldia-port', name: 'Haldia / Kolkata Port', lat: 22.0667, lon: 88.0833, type: 'River Port & Bulk Hub', currentShips: 11, occupancy: 69, congestion: 'LOW' },
  { id: 'colombo', name: 'Colombo Port', lat: 6.9271, lon: 79.8612, type: 'Transshipment Hub', currentShips: 30, occupancy: 91, congestion: 'CRITICAL' },
];

// ─── Distance between two lat/lon points (km) ────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RadarOverlay({
  active = false,
  onClose,
  shipsCount = 0,
  selectedMMSI = null,
  ships = new Map(),
  onSelectShip,
  onSelectPort
}) {
  const containerRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const ring3Ref = useRef(null);
  const radarSweepRef = useRef(null);
  const waveCanvasRef = useRef(null);

  const [rangeKm, setRangeKm] = useState('ALL');
  const [radarFilter, setRadarFilter] = useState('ALL'); // 'ALL' | 'SHIPS' | 'PORTS' | 'MOVING' | 'ANCHORED'
  const [userLocation, setUserLocation] = useState({ lat: 14.0000, lon: 78.0000 });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [hoveredTarget, setHoveredTarget] = useState(null);

  // Auto detect user GPS
  const detectUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationLoading(false);
        setLocationError(false);
      },
      () => {
        setLocationLoading(false);
        setLocationError(true);
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (active) detectUserLocation();
  }, [active, detectUserLocation]);

  // GSAP animations for radar sweep and rings
  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      if (radarSweepRef.current) {
        gsap.to(radarSweepRef.current, {
          rotate: 360,
          duration: 3.5,
          repeat: -1,
          ease: 'none'
        });
      }
      [ring1Ref, ring2Ref, ring3Ref].forEach((ref, idx) => {
        if (ref.current) {
          gsap.fromTo(
            ref.current,
            { scale: 0.95, opacity: 0.3 },
            {
              scale: 1.05,
              opacity: 0.8,
              duration: 2 + idx * 0.5,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut'
            }
          );
        }
      });
    });
    return () => ctx.revert();
  }, [active]);

  // Waveform canvas animation
  useEffect(() => {
    if (!active || !waveCanvasRef.current) return;
    const canvas = waveCanvasRef.current;
    const ctx = canvas.getContext('2d');
    let frameId;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin((x + t) * 0.05) * 8 * Math.sin(t * 0.02);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      t += 2;
      frameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameId);
  }, [active]);

  if (!active) return null;

  // Radar Circle Radius in Pixel Dimensions
  const RADAR_RADIUS = typeof window !== 'undefined' && window.innerWidth < 640 ? 150 : 220;

  // Effective radar range in km
  const shipList = Array.from(ships.values());
  const maxFleetDist = Math.max(
    ...shipList.map(s => haversineKm(userLocation.lat, userLocation.lon, s.lat, s.lon)),
    ...INDIAN_OCEAN_PORTS.map(p => haversineKm(userLocation.lat, userLocation.lon, p.lat, p.lon)),
    1200
  );
  const effectiveRange = rangeKm === 'ALL' ? Math.ceil(maxFleetDist * 1.1) : Number(rangeKm);

  // Compute nearby vessels relative to user location using true polar bearing projection
  const nearbyShips = (radarFilter === 'PORTS' ? [] : shipList)
    .filter(ship => {
      if (radarFilter === 'MOVING') return (ship.sog || 0) > 0.5;
      if (radarFilter === 'ANCHORED') return (ship.sog || 0) <= 0.5;
      return true;
    })
    .map((ship) => {
      const dist = haversineKm(userLocation.lat, userLocation.lon, ship.lat, ship.lon);
      const dLat = (ship.lat - userLocation.lat) * (Math.PI / 180);
      const dLon = (ship.lon - userLocation.lon) * (Math.PI / 180);
      const yLat = Math.sin(dLon) * Math.cos(ship.lat * (Math.PI / 180));
      const xLat = Math.cos(userLocation.lat * (Math.PI / 180)) * Math.sin(ship.lat * (Math.PI / 180)) -
        Math.sin(userLocation.lat * (Math.PI / 180)) * Math.cos(ship.lat * (Math.PI / 180)) * Math.cos(dLon);
      const bearing = Math.atan2(yLat, xLat);
      const normDist = Math.min(43, (dist / effectiveRange) * 43);
      const x = 50 + normDist * Math.sin(bearing);
      const y = 50 - normDist * Math.cos(bearing);
      return { ...ship, dist: Math.round(dist), x, y, inRange: rangeKm === 'ALL' ? true : dist <= effectiveRange };
    })
    .filter((s) => s.inRange);

  // Compute nearby ports relative to user location using true polar bearing projection
  const nearbyPorts = (radarFilter === 'SHIPS' || radarFilter === 'MOVING' || radarFilter === 'ANCHORED' ? [] : INDIAN_OCEAN_PORTS)
    .map((port) => {
      const dist = haversineKm(userLocation.lat, userLocation.lon, port.lat, port.lon);
      const dLat = (port.lat - userLocation.lat) * (Math.PI / 180);
      const dLon = (port.lon - userLocation.lon) * (Math.PI / 180);
      const yLat = Math.sin(dLon) * Math.cos(port.lat * (Math.PI / 180));
      const xLat = Math.cos(userLocation.lat * (Math.PI / 180)) * Math.sin(port.lat * (Math.PI / 180)) -
        Math.sin(userLocation.lat * (Math.PI / 180)) * Math.cos(port.lat * (Math.PI / 180)) * Math.cos(dLon);
      const bearing = Math.atan2(yLat, xLat);
      const normDist = Math.min(43, (dist / effectiveRange) * 43);
      const x = 50 + normDist * Math.sin(bearing);
      const y = 50 - normDist * Math.cos(bearing);
      return { ...port, dist: Math.round(dist), x, y, inRange: rangeKm === 'ALL' ? true : dist <= effectiveRange };
    })
    .filter((p) => p.inRange);

  const totalTargets = nearbyShips.length + nearbyPorts.length;

  const congestionColor = (c) => {
    if (c === 'HIGH' || c === 'CRITICAL') return '#f43f5e';
    if (c === 'MODERATE') return '#fbbf24';
    return '#34d399';
  };

  // Click Target -> Select & Open Live Map Route
  const handleSelectShipRoute = (mmsi) => {
    if (onSelectShip) onSelectShip(mmsi);
    if (onClose) onClose();
  };

  const handleSelectPortRoute = (portId) => {
    if (onSelectPort) onSelectPort(portId);
    if (onClose) onClose();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 bottom-0 top-16 z-[800] pointer-events-none flex flex-col items-center justify-between overflow-hidden bg-[#05070c]/95 backdrop-blur-2xl animate-fade-in"
    >
      {/* ── TOP DEDICATED CONTROL BAR (DIRECTLY BELOW MAIN HEADER) ───────────────── */}
      <div className="w-full px-4 sm:px-8 py-2.5 bg-slate-950/95 border-b border-white/15 z-[810] flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto shrink-0 shadow-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-white font-mono text-xs sm:text-sm font-bold">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>SONAR SCANNER HUD</span>
          </div>
          <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/20 font-bold">
            TARGETS: <strong className="text-emerald-400">{totalTargets}</strong> ({nearbyShips.length} ships · {nearbyPorts.length} ports)
          </span>

          {/* Quick Category Filter Bar */}
          <div className="flex items-center gap-1 font-mono text-[10px] pl-2 border-l border-white/20">
            {[
              { id: 'ALL', label: 'ALL TARGETS' },
              { id: 'SHIPS', label: 'SHIPS ONLY' },
              { id: 'PORTS', label: 'PORTS ONLY' },
              { id: 'MOVING', label: 'MOVING' },
              { id: 'ANCHORED', label: 'ANCHORED' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRadarFilter(tab.id)}
                className={`px-2 py-0.5 rounded-md font-bold transition-all border ${
                  radarFilter === tab.id
                    ? 'bg-sky-400 text-slate-950 border-sky-300 font-extrabold shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Range Selector Buttons */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">RADAR RANGE:</span>
          {['ALL', 1500, 3000, 5000].map(r => (
            <button
              key={r}
              onClick={() => setRangeKm(r)}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${rangeKm === r
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg'
                  : 'bg-white/5 border-white/20 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
            >
              {r === 'ALL' ? 'ALL FLEET' : `${r >= 1000 ? `${r / 1000}k` : r} km`}
            </button>
          ))}
        </div>

        {/* Right: Refresh & Exit Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={detectUserLocation}
            disabled={locationLoading}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 font-mono text-[10px] font-bold transition flex items-center gap-1"
          >
            <Radio className={`w-3 h-3 ${locationLoading ? 'animate-spin' : ''}`} />
            <span>{locationLoading ? 'LOCATING...' : 'REFRESH GPS'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white hover:text-slate-950 font-mono font-black text-xs uppercase tracking-wider transition shadow-md"
          >
            EXIT SCAN
          </button>
        </div>
      </div>

      {/* ── CENTER RADAR DISPLAY CANVAS (NEAT & UNCLUTTERED) ──────────────── */}
      <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden pointer-events-auto">
        <div
          className="relative rounded-full border border-white/30 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.15)]"
          style={{ width: RADAR_RADIUS * 2, height: RADAR_RADIUS * 2 }}
        >
          {/* Range rings */}
          <div ref={ring3Ref} className="absolute inset-0 rounded-full border border-white/20 transition-colors" />
          <div ref={ring2Ref} className="absolute rounded-full border border-white/30 transition-colors"
            style={{ inset: RADAR_RADIUS * 0.33 }} />
          <div ref={ring1Ref} className="absolute rounded-full border border-white/40 transition-colors"
            style={{ inset: RADAR_RADIUS * 0.62 }} />

          {/* Range labels */}
          <span className="absolute font-mono text-[8px] text-white/40 pointer-events-none font-bold"
            style={{ top: RADAR_RADIUS * 0.33 + 2, left: '50%', transform: 'translateX(-50%)' }}>
            {Math.round(rangeKm * 0.67)} km
          </span>
          <span className="absolute font-mono text-[8px] text-white/40 pointer-events-none font-bold"
            style={{ top: RADAR_RADIUS * 0.62 + 2, left: '50%', transform: 'translateX(-50%)' }}>
            {Math.round(rangeKm * 0.33)} km
          </span>
          <span className="absolute font-mono text-[8px] text-white/35 pointer-events-none font-bold"
            style={{ top: 2, right: 8 }}>
            {rangeKm} km
          </span>

          {/* Crosshair lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-[1px] bg-white/20" />
            <div className="h-full w-[1px] bg-white/20 absolute" />
            <div className="w-full h-[1px] bg-white/10 rotate-45" />
            <div className="w-full h-[1px] bg-white/10 -rotate-45" />
          </div>

          {/* User GPS Center Marker */}
          <div className="absolute z-30 flex flex-col items-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-[0_0_12px_#38bdf8] animate-ping opacity-75" />
            <div className="w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-white shadow-[0_0_12px_#38bdf8] absolute top-0" />
            <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-sky-400/60 font-mono text-[8px] font-extrabold text-sky-300 shadow-md">
              YOU
            </span>
          </div>

          {/* Sweep cone */}
          <div ref={radarSweepRef} className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div className="w-1/2 h-1/2 bg-gradient-to-br from-emerald-400/35 via-emerald-500/10 to-transparent origin-bottom-right rounded-tl-full shadow-[0_0_20px_#10b981]" />
          </div>

          {/* Port blips (amber gold) */}
          {nearbyPorts.map((port) => (
            <div
              key={port.id}
              className="absolute pointer-events-auto cursor-pointer z-20 group"
              style={{
                left: `${port.x}%`,
                top: `${port.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onMouseEnter={(e) => setHoveredTarget({ type: 'port', data: port, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredTarget(null)}
              onClick={() => handleSelectPortRoute(port.id)}
            >
              <div
                className="w-3 h-3 rounded-sm border-2 border-amber-400 bg-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.9)] relative z-10 hover:scale-125 transition-transform"
              />
              <span className="hidden group-hover:block absolute left-4 top-0 whitespace-nowrap font-mono text-[8px] font-bold text-amber-300 bg-slate-950/95 px-1.5 py-0.5 rounded shadow-lg z-30 pointer-events-none border border-amber-400/50">
                {port.name.split('(')[0].trim()} ({port.dist} km)
              </span>
            </div>
          ))}

          {/* Ship blips (vibrant cyan/emerald) */}
          {nearbyShips.map((ship) => (
            <div
              key={ship.mmsi}
              className="absolute pointer-events-auto cursor-pointer z-20 group"
              style={{
                left: `${ship.x}%`,
                top: `${ship.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onMouseEnter={(e) => setHoveredTarget({ type: 'ship', data: ship, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredTarget(null)}
              onClick={() => handleSelectShipRoute(ship.mmsi)}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse hover:scale-150 transition-transform" />
              <div className="hidden group-hover:block absolute left-4 top-0 whitespace-nowrap font-mono text-[9px] font-bold text-emerald-300 bg-slate-950/95 border border-emerald-500/40 px-2 py-1 rounded shadow-lg z-30 pointer-events-none">
                <div>{ship.name || `MMSI: ${ship.mmsi}`}</div>
                <div className="text-[8px] text-slate-400">{ship.sog?.toFixed(1)} kn • {ship.dist} km</div>
              </div>
            </div>
          ))}

          {/* Hovered Target Detail Card */}
          {hoveredTarget && (
            <div
              className="fixed pointer-events-none z-50 animate-fade-in"
              style={{
                left: Math.min(hoveredTarget.x + 16, window.innerWidth - 230),
                top: Math.min(hoveredTarget.y - 10, window.innerHeight - 190)
              }}
            >
              {hoveredTarget.type === 'ship' ? (
                <div style={{
                  background: '#020617',
                  border: '1.5px solid rgba(56,189,248,0.7)',
                  padding: 10, borderRadius: 12,
                  fontFamily: 'monospace', color: '#f8fafc', width: 220,
                  boxShadow: '0 0 20px rgba(0,0,0,0.95)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#00f0ff', fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Ship className="w-3 h-3 text-sky-400" /> {hoveredTarget.data.shipType || 'VESSEL'}
                    </span>
                    <span style={{ color: '#34d399', fontSize: 8, fontWeight: 'bold' }}>● AIS LIVE</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>
                    {hoveredTarget.data.name || `MMSI: ${hoveredTarget.data.mmsi}`}
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>
                    MMSI: <strong style={{ color: '#38bdf8' }}>{hoveredTarget.data.mmsi}</strong>
                  </div>
                  <div style={{ fontSize: 9, color: '#e2e8f0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4, marginTop: 4 }}>
                    LAT: <strong style={{ color: '#fff' }}>{hoveredTarget.data.lat?.toFixed(4)}°</strong> | LON: <strong style={{ color: '#fff' }}>{hoveredTarget.data.lon?.toFixed(4)}°</strong>
                  </div>
                  <div style={{ fontSize: 9, color: '#e2e8f0', marginTop: 2 }}>
                    SPEED: <strong style={{ color: '#34d399' }}>{hoveredTarget.data.sog?.toFixed(1)} kn</strong> | COG: <strong style={{ color: '#fbbf24' }}>{hoveredTarget.data.cog?.toFixed(0)}°</strong>
                  </div>
                  <div style={{ fontSize: 8, color: '#34d399', marginTop: 4, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Radio className="w-3 h-3 text-emerald-400" /> {hoveredTarget.data.dist} km from you
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#020617',
                  border: '1.5px solid rgba(251,191,36,0.6)',
                  padding: 10, borderRadius: 12,
                  fontFamily: 'monospace', color: '#f8fafc',
                  boxShadow: '0 0 20px rgba(0,0,0,0.95)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Anchor className="w-3 h-3 text-amber-400" /> PORT
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 'bold', color: congestionColor(hoveredTarget.data.congestion) }}>
                      ● {hoveredTarget.data.congestion}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 11, color: '#fff', marginBottom: 4 }}>
                    {hoveredTarget.data.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>
                    {hoveredTarget.data.type}
                  </div>
                  <div style={{ fontSize: 9, color: '#e2e8f0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4, marginTop: 4 }}>
                    Ships Docked: <strong style={{ color: '#38bdf8' }}>{hoveredTarget.data.currentShips}</strong>
                  </div>
                  <div style={{ fontSize: 8, color: '#34d399', marginTop: 4, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Radio className="w-3 h-3 text-emerald-400" /> {hoveredTarget.data.dist} km from you
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM DEDICATED TELEMETRY & LEGEND PANEL (NEAT & UNCLUTTERED) ────────── */}
      <div className="w-full px-4 sm:px-8 py-3 bg-slate-950/90 border-t border-white/15 z-50 pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-2xl">
        {/* AIS Sweep Protocol Status */}
        <div className="flex items-center gap-4 font-mono text-[10px] sm:text-xs text-slate-300">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>AIS SWEEP PROTOCOL</span>
            <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 text-[9px]">ACTIVE</span>
          </div>
          <span className="hidden md:inline text-slate-500">|</span>
          <div className="hidden md:block text-slate-400">
            FREQ: 161.975 MHz &amp; 162.025 MHz • BEAM: 3.5s/360°
          </div>
        </div>

        {/* Radar Legend Horizontal Strip */}
        <div className="flex items-center gap-4 font-mono text-[10px] text-slate-300">
          <span className="text-slate-400 font-bold uppercase text-[9px]">LEGEND:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white shadow-[0_0_6px_#38bdf8]" />
            <span className="text-sky-300 font-bold text-[9px]">You (GPS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-300" />
            <span className="text-[9px]">Live Vessel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm border-2 border-amber-400 bg-amber-400/20" />
            <span className="text-amber-300 text-[9px]">Port</span>
          </div>
        </div>
      </div>
    </div>
  );
}
