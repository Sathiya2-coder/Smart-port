import React, { useEffect, useRef } from 'react';
import {
  Ship,
  Compass,
  Radio,
  Activity,
  Globe,
  Map as MapIcon,
  Shield,
  ArrowUpRight,
  Zap,
  Terminal,
  Layers,
  ChevronDown,
  Navigation,
  Anchor,
  Cpu,
  BarChart3,
  Brain,
  CheckCircle2,
  ArrowDown
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GsapCounter from './GsapCounter';

gsap.registerPlugin(ScrollTrigger);

export default function HomePage({
  shipsCount = 0,
  totalMessages = 0,
  messageRate = 0,
  onLaunchMap,
  onActivateRadar
}) {
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const bentoRef = useRef(null);

  // GSAP Initial Page Entrance Animation (Ensures 100% Permanent Visibility)
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current.children,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative z-10 w-full overflow-x-hidden text-slate-100 font-sans">
      {/* Calligraphic Script Hero Section (Matching Reference Image) */}
      <section className="min-h-[75vh] flex flex-col items-center justify-center pt-16 pb-12 px-6 text-center relative max-w-5xl mx-auto">
        <div ref={heroRef} className="flex flex-col items-center gap-4">
          {/* Cursive Sub-Eyebrow */}
          <span className="font-script text-4xl sm:text-5xl md:text-6xl text-emerald-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] tracking-wide">
            Next-Gen Maritime Intelligence
          </span>

          {/* Grand Display Title */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold font-serif italic text-white leading-[1.0] tracking-tight drop-shadow-[0_15px_35px_rgba(0,0,0,0.95)] my-1">
            Smart Ship Port
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-2xl drop-shadow-md mb-2">
            Real-time global vessel tracking, live AIS stream telemetry, tactical Sonar HUD scanning, and automated harbor berth allocation.
          </p>

          {/* Centered Clean White & Glass Buttons */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              onClick={onLaunchMap}
              className="bg-white text-slate-950 font-extrabold px-9 py-3.5 uppercase tracking-widest text-xs shadow-2xl hover:bg-slate-100 hover:scale-105 transition-all duration-300 rounded-sm"
            >
              LAUNCH LIVE MAP
            </button>

            <button
              onClick={onActivateRadar}
              className="bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-md text-emerald-300 font-bold px-7 py-3.5 uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-slate-950 transition-all duration-300 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              SONAR RADAR HUD
            </button>
          </div>
        </div>
      </section>

      {/* Enterprise Metrics Bar */}
      <section className="px-6 lg:px-12 py-6 max-w-7xl mx-auto">
        <div ref={statsRef} className="doppelrand-shell">
          <div className="doppelrand-core p-6 grid grid-cols-2 md:grid-cols-4 gap-6 border border-white/10">
            <div className="flex flex-col items-start text-left pl-4 border-l-2 border-emerald-400">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold">
                ACTIVE FLEET
              </span>
              <GsapCounter value={shipsCount} className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1" />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">Live Merchant Vessels</span>
            </div>

            <div className="flex flex-col items-start text-left pl-4 border-l-2 border-emerald-400">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold">
                TELEMETRY THROUGHPUT
              </span>
              <GsapCounter value={totalMessages} className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 mt-1" />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">Ingested AIS Messages</span>
            </div>

            <div className="flex flex-col items-start text-left pl-4 border-l-2 border-emerald-400">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold">
                STREAM REFRESH RATE
              </span>
              <GsapCounter value={messageRate} suffix=" /s" className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-300 mt-1" />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">Real-Time Ingestion</span>
            </div>

            <div className="flex flex-col items-start text-left pl-4 border-l-2 border-emerald-400">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold">
                INDIAN OCEAN HUBS
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1">10 Ports</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">Active Berths &amp; Gates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid Section */}
      <section className="px-6 lg:px-12 py-12 max-w-7xl mx-auto">
        <div className="text-left mb-10">
          <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-300">
            SMART PORT CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white mt-2">
            Mission-Critical Maritime Navigation &amp; Allocation
          </h2>
        </div>

        <div ref={bentoRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 - Large Bento */}
          <div className="md:col-span-2 doppelrand-shell group hover:border-emerald-500/40 transition-all duration-300">
            <div className="doppelrand-core p-7 h-full flex flex-col justify-between border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-4 shadow-md">
                  <Navigation className="w-5.5 h-5.5" />
                </div>
                <h3 className="text-xl font-bold font-display text-white">
                  Real-Time Vessel Navigation &amp; Vector Interpolation
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-xl">
                  GSAP vector engines smoothly transition live latitude, longitude, and true heading angles across nautical map tiles, providing ultra-precise navigation tracks without visual stuttering.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between font-mono text-xs text-white font-bold">
                <span>GSAP TWEEN: 1.0s</span>
                <span className="text-emerald-400">60 FPS SMOOTH</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="doppelrand-shell group hover:border-emerald-500/40 transition-all duration-300">
            <div className="doppelrand-core p-7 h-full flex flex-col justify-between border border-white/10">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-4 shadow-md">
                  <Radio className="w-5.5 h-5.5 text-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">
                  Tactical Sonar Radar HUD
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  360° rotating radar beam sweeps, multi-category target filters, and 1-click trajectory route tracking on the live map.
                </p>
              </div>
              <button
                onClick={onActivateRadar}
                className="mt-6 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 hover:text-emerald-300 transition"
              >
                <span>OPEN HUD SCANNER</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="doppelrand-shell group hover:border-amber-400/40 transition-all duration-300">
            <div className="doppelrand-core p-7 h-full flex flex-col justify-between border border-white/10">
              <div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 mb-4 shadow-md">
                  <Anchor className="w-5.5 h-5.5 text-amber-300" />
                </div>
                <h3 className="text-lg font-bold font-display text-white">
                  Automated Berth &amp; Gate Allocation
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Live monitoring of Indian Ocean port congestion, berth turnaround schedules, and automated pilot dispatch allocations.
                </p>
              </div>
              <div className="mt-6 font-mono text-[10px] text-amber-300 font-bold">
                BERTH ALLOCATION: OPTIMIZED
              </div>
            </div>
          </div>

          {/* Card 4 - Large Bento */}
          <div className="md:col-span-2 doppelrand-shell group hover:border-sky-500/40 transition-all duration-300">
            <div className="doppelrand-core p-7 h-full flex flex-col justify-between border border-white/10 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div>
                <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-4 shadow-md">
                  <Layers className="w-5.5 h-5.5 text-sky-400" />
                </div>
                <h3 className="text-xl font-bold font-display text-white">
                  Multi-Layer Tactical Marine Cartography
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-xl">
                  Switch instantly between dark mode nautical cartography, Esri High-Resolution Satellite imagery, and OpenStreetMap street layers with hardware-accelerated rendering.
                </p>
              </div>
              <button
                onClick={onLaunchMap}
                className="mt-6 text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5 hover:text-sky-300 transition"
              >
                <span>LAUNCH NAVIGATION MAP</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* System Zig-Zag End-to-End Workflow Chart Section */}
      <section className="px-6 lg:px-12 py-16 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center mb-16">
          <span className="font-script text-3xl sm:text-4xl text-emerald-400 block drop-shadow-md">
            System Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif italic font-bold text-white mt-1">
            End-to-End Smart Port Data Workflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-mono mt-2 max-w-xl mx-auto">
            How raw sensor signals and vessel pings flow through our near real-time ingestion pipeline, predictive AI models, and prescriptive decision layer.
          </p>
        </div>

        {/* Central Vertical Spine Container (Zig-Zag Layout) */}
        <div className="relative pl-6 md:pl-0 space-y-12 before:absolute before:left-3 md:before:left-1/2 md:before:-translate-x-1/2 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 via-amber-300 before:to-sky-400">

          {/* STEP 1: DATA INGESTION (LEFT) */}
          <div className="relative flex flex-col md:flex-row items-center">
            {/* Center Timeline Node Badge */}
            <div className="absolute -left-6 md:left-1/2 md:-translate-x-1/2 top-4 w-8 h-8 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center font-mono text-xs font-black text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20">
              01
            </div>

            {/* Left Card */}
            <div className="w-full md:w-[46%] md:mr-auto">
              <div className="doppelrand-shell hover:border-emerald-500/50 transition-all duration-300">
                <div className="doppelrand-core p-6 border border-white/15 flex flex-col gap-4 bg-slate-900/90">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <Radio className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          INPUT LAYER
                        </span>
                        <h3 className="text-lg font-bold font-serif italic text-white mt-0.5">
                          Step 1: Data Ingestion Stream
                        </h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30">
                      AIS + IoT
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Collects continuous live AIS vessel pings, IoT container status, weather radar feeds, and customs clearance paperwork data streams.
                  </p>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>INGESTION PROTOCOL</span>
                    <span className="text-emerald-400 font-bold">Thoothukudi Port Stream</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: PROCESSING & BUFFERING (RIGHT) */}
          <div className="relative flex flex-col md:flex-row items-center">
            {/* Center Timeline Node Badge */}
            <div className="absolute -left-6 md:left-1/2 md:-translate-x-1/2 top-4 w-8 h-8 rounded-full bg-slate-950 border-2 border-white flex items-center justify-center font-mono text-xs font-black text-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20">
              02
            </div>

            {/* Right Card */}
            <div className="w-full md:w-[46%] md:ml-auto">
              <div className="doppelrand-shell hover:border-white/50 transition-all duration-300">
                <div className="doppelrand-core p-6 border border-white/15 flex flex-col gap-4 bg-slate-900/90">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-white/15 border border-white/30 text-white">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-white/20 text-white border border-white/40">
                          PROCESSING LAYER
                        </span>
                        <h3 className="text-lg font-bold font-serif italic text-white mt-0.5">
                          Step 2: Processing &amp; Buffering Engine
                        </h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-white font-bold bg-slate-950 px-2 py-1 rounded border border-white/30">
                      &lt;100ms LATENCY
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    High-throughput WebSockets &amp; zero-overhead memory buffers clean, structure, and normalize raw telemetry pings in near real-time.
                  </p>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>MEMORY SYSTEM</span>
                    <span className="text-white font-bold">Zero-Overhead Memory</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: AI PREDICTION ENGINE (LEFT) */}
          <div className="relative flex flex-col md:flex-row items-center">
            {/* Center Timeline Node Badge */}
            <div className="absolute -left-6 md:left-1/2 md:-translate-x-1/2 top-4 w-8 h-8 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center font-mono text-xs font-black text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)] z-20">
              03
            </div>

            {/* Left Card */}
            <div className="w-full md:w-[46%] md:mr-auto">
              <div className="doppelrand-shell hover:border-amber-500/50 transition-all duration-300">
                <div className="doppelrand-core p-6 border border-white/15 flex flex-col gap-4 bg-slate-900/90">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          PREDICTION ENGINE
                        </span>
                        <h3 className="text-lg font-bold font-serif italic text-white mt-0.5">
                          Step 3: AI Prediction Engine
                        </h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/80 px-2 py-1 rounded border border-amber-500/30">
                      GEMINI 2.5 FLASH
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Google Gemini 2.5 Flash API + ML algorithms model berth delays, yard stacking density, and container dwell times 6 hours ahead.
                  </p>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>FORECAST HORIZON</span>
                    <span className="text-amber-300 font-bold">6-Hour Ahead Prediction</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: PRESCRIPTIVE DECISION LAYER (RIGHT) */}
          <div className="relative flex flex-col md:flex-row items-center">
            {/* Center Timeline Node Badge */}
            <div className="absolute -left-6 md:left-1/2 md:-translate-x-1/2 top-4 w-8 h-8 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center font-mono text-xs font-black text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20">
              04
            </div>

            {/* Right Card */}
            <div className="w-full md:w-[46%] md:ml-auto">
              <div className="doppelrand-shell hover:border-emerald-500/50 transition-all duration-300">
                <div className="doppelrand-core p-6 border border-white/15 flex flex-col gap-4 bg-slate-900/90">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          DECISION LAYER
                        </span>
                        <h3 className="text-lg font-bold font-serif italic text-white mt-0.5">
                          Step 4: Prescriptive Decision &amp; XAI
                        </h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30">
                      REROUTE ADVISORY
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Converts AI predictions into clear recommended manager actions, backed by XAI factor weights and financial cost avoided estimates.
                  </p>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>EXPLAINABLE AI</span>
                    <span className="text-emerald-400 font-bold">XAI Factor Weights</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5: DASHBOARD & EXECUTION (LEFT) */}
          <div className="relative flex flex-col md:flex-row items-center">
            {/* Center Timeline Node Badge */}
            <div className="absolute -left-6 md:left-1/2 md:-translate-x-1/2 top-4 w-8 h-8 rounded-full bg-slate-950 border-2 border-sky-400 flex items-center justify-center font-mono text-xs font-black text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.6)] z-20">
              05
            </div>

            {/* Left Card */}
            <div className="w-full md:w-[46%] md:mr-auto">
              <div className="doppelrand-shell hover:border-sky-500/50 transition-all duration-300">
                <div className="doppelrand-core p-6 border border-white/15 flex flex-col gap-4 bg-slate-900/90">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          EXECUTION LAYER
                        </span>
                        <h3 className="text-lg font-bold font-serif italic text-white mt-0.5">
                          Step 5: Manager Action &amp; Execution
                        </h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-950/80 px-2 py-1 rounded border border-sky-500/30">
                      1-CLICK ACTION
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Port manager approves alerts and triggers 1-click reroutes directly to automated harbor cranes and physical gate controllers.
                  </p>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>GATE INTEGRATION</span>
                    <span className="text-sky-400 font-bold">1-Click Signal Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Professional Footer */}
      <footer className="px-6 lg:px-12 py-10 border-t border-white/10 text-left font-mono text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-white">
            <img src="/logo.png" alt="Smart Ship Port" className="w-6 h-6 rounded-md object-contain border border-white/20" />
            <span className="font-bold font-display uppercase tracking-wider">SMART SHIP PORT — NAVIGATION &amp; ALLOCATION</span>
          </div>
          <div>POWERED BY GSAP MOTION &amp; LIVE AIS DATA STREAM</div>
        </div>
      </footer>
    </div>
  );
}
