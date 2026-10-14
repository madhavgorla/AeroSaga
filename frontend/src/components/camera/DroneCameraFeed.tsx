import React, { useState, useEffect } from 'react';
import type { Drone, Mission } from '../../types';
import daylightImage from '../../assets/drone-camera-daylight.jpg';
import thermalImage from '../../assets/drone-camera-thermal.jpg';
import {
  Camera,
  Eye,
  Maximize2,
  Minimize2,
  Radio,
  Flame,
  Moon,
  Sun,
  ZoomIn,
  ZoomOut,
  Target,
  Download,
  Crosshair,
  Wifi,
  Compass,
} from 'lucide-react';

interface DroneCameraFeedProps {
  drones: Drone[];
  activeDroneId?: string;
  onSelectDrone?: (droneId: string) => void;
  isCompact?: boolean;
}

export const DroneCameraFeed: React.FC<DroneCameraFeedProps> = ({
  drones,
  activeDroneId,
  onSelectDrone,
  isCompact = false,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    activeDroneId || drones[0]?.droneId || 'DRONE-001'
  );
  const [cameraMode, setCameraMode] = useState<'daylight' | 'thermal' | 'night'>('daylight');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [recSeconds, setRecSeconds] = useState<number>(884); // 14m 44s
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Sync selectedId when activeDroneId changes
  useEffect(() => {
    if (activeDroneId) {
      setSelectedId(activeDroneId);
    }
  }, [activeDroneId]);

  // Timer loop for video feed HUD
  useEffect(() => {
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDrone = drones.find((d) => d.droneId === selectedId) || drones[0];

  const formatRecTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCaptureSnapshot = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      // Trigger subtle simulated screenshot
      const link = document.createElement('a');
      link.download = `AeroSaga-Feed-${selectedId}-${new Date().toISOString().slice(0, 19)}.jpg`;
      link.href = cameraMode === 'thermal' ? thermalImage : daylightImage;
      link.click();
    }, 300);
  };

  return (
    <div
      className={`relative rounded-2xl border border-slate-800/80 bg-[#070b16] overflow-hidden flex flex-col shadow-2xl transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 max-h-[92vh]'
          : isCompact
          ? 'h-[300px]'
          : 'h-[380px] lg:h-[440px]'
      }`}
    >
      {/* Top HUD Toolbar */}
      <div className="p-3 border-b border-slate-800/60 bg-[#080d1a]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono-numbers text-rose-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>LIVE 4K GIMBAL</span>
          </div>

          {/* Drone Selector Switcher */}
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              if (onSelectDrone) onSelectDrone(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 px-2.5 py-1 font-mono-numbers focus:outline-none focus:border-sky-500"
          >
            {drones.map((d) => (
              <option key={d.droneId} value={d.droneId}>
                {d.droneId} ({d.status})
              </option>
            ))}
          </select>
        </div>

        {/* Camera Mode & Lens Controls */}
        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[11px] font-medium font-mono-numbers">
            <button
              onClick={() => setCameraMode('daylight')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                cameraMode === 'daylight'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Optical Daylight 4K"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">Optical</span>
            </button>

            <button
              onClick={() => setCameraMode('thermal')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                cameraMode === 'thermal'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="FLIR Thermal Infrared"
            >
              <Flame className="w-3 h-3" />
              <span className="hidden sm:inline">Thermal</span>
            </button>

            <button
              onClick={() => setCameraMode('night')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                cameraMode === 'night'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Night Reconnaissance NVG"
            >
              <Moon className="w-3 h-3" />
              <span className="hidden sm:inline">NVG</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-mono-numbers text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              className="p-1 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-semibold text-sky-400">
              {zoomLevel}x
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
              className="p-1 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Snapshot Button */}
          <button
            onClick={handleCaptureSnapshot}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Capture Telemetry Frame Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Feed'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Optical Viewport with Live HUD Elements */}
      <div className="relative flex-1 w-full h-full overflow-hidden select-none bg-black flex items-center justify-center">
        {/* Shutter flash animation on capture */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300 pointer-events-none" />
        )}

        {/* Live Video Camera Image Stream with Zoom and Filter */}
        <div
          className={`w-full h-full relative transition-transform duration-300 ${
            cameraMode === 'night' ? 'brightness-125 contrast-125 hue-rotate-90 saturate-200' : ''
          }`}
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={cameraMode === 'thermal' ? thermalImage : daylightImage}
            alt="Live Drone Optical Feed"
            className="w-full h-full object-cover object-center"
          />

          {/* Night Vision green phosphor scanline overlay */}
          {cameraMode === 'night' && (
            <div className="absolute inset-0 bg-emerald-950/30 mix-blend-color-burn pointer-events-none" />
          )}
        </div>

        {/* HUD OVERLAY LAYER (Crisp Aerospace Crosshairs & Gauges) */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 text-xs font-mono-numbers z-10 text-white/90">
          {/* Top HUD Line */}
          <div className="flex items-start justify-between">
            {/* Top Left: REC & Resolution */}
            <div className="space-y-0.5 bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/10 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-bold text-white tracking-widest">
                  REC {formatRecTime(recSeconds)}
                </span>
                <span className="text-[10px] text-slate-400">4K UHD</span>
              </div>
              <div className="text-[10px] text-slate-400">
                SENSOR: SONY IMX586 1/2" CMOS · 48MP
              </div>
            </div>

            {/* Top Right: Signal & Latency */}
            <div className="space-y-0.5 bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/10 text-right text-[11px]">
              <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-semibold">
                <Wifi className="w-3.5 h-3.5" />
                <span>5.8 GHz O3 LINK: 99.4%</span>
              </div>
              <div className="text-[10px] text-slate-400">
                LATENCY: 18ms · BITRATE: 64 Mbps
              </div>
            </div>
          </div>

          {/* Center Target Acquisition Crosshair & Artificial Horizon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Outer Gimbal Reticle */}
            <div className="relative w-48 h-48 border border-white/20 rounded-full flex items-center justify-center">
              {/* Center Crosshairs */}
              <div className="w-8 h-[1px] bg-sky-400/80 absolute" />
              <div className="h-8 w-[1px] bg-sky-400/80 absolute" />
              <div className="w-2 h-2 border border-sky-400 rounded-sm absolute" />

              {/* Pitch Ladder notches */}
              <div className="w-12 h-[1px] bg-white/40 absolute -top-10" />
              <div className="w-12 h-[1px] bg-white/40 absolute -bottom-10" />

              {/* Target Lock Box on Warehouse Pad */}
              <div className="absolute -top-6 -right-12 border-2 border-emerald-400/90 w-16 h-16 rounded animate-pulse flex flex-col justify-between p-1">
                <span className="text-[9px] font-bold text-emerald-400 bg-black/60 px-1 rounded">
                  PAD B-02
                </span>
                <span className="text-[8px] text-emerald-300 font-mono">
                  LOCK 98%
                </span>
              </div>
            </div>
          </div>

          {/* Bottom HUD Line */}
          <div className="flex items-end justify-between">
            {/* Bottom Left: GPS Coordinates & Speed */}
            <div className="bg-black/50 backdrop-blur-sm p-2.5 rounded-lg border border-white/10 space-y-1 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="text-sky-300 font-bold">
                  ALT: {activeDrone?.altitudeMeters || 82}m AGL
                </span>
                <span className="text-white">
                  SPD: {activeDrone?.speedKmh || 42} km/h
                </span>
                <span className="text-amber-300">
                  BAT: {activeDrone?.batteryPercent || 78}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                GPS: {activeDrone?.currentLocation.latitude.toFixed(5)}°N,{' '}
                {activeDrone?.currentLocation.longitude.toFixed(5)}°E
              </div>
            </div>

            {/* Bottom Right: Gimbal Angle & Heading */}
            <div className="bg-black/50 backdrop-blur-sm p-2.5 rounded-lg border border-white/10 text-right space-y-1 text-[11px]">
              <div className="flex items-center justify-end gap-2 text-slate-200">
                <span>GIMBAL: -45° PITCH</span>
                <span className="text-sky-400 font-bold">044° HDG (NE)</span>
              </div>
              <div className="text-[10px] text-slate-400">
                PAYLOAD: SECURED · ALT HOLD ACTIVE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Footer Banner */}
      <div className="px-4 py-2 bg-[#060a14] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono-numbers">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>Target Drop Zone Alpha</span>
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline text-slate-400">
            Live Optical Telemetry Link
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          MODE: {cameraMode.toUpperCase()} ({zoomLevel}X OPTICAL)
        </div>
      </div>
    </div>
  );
};
