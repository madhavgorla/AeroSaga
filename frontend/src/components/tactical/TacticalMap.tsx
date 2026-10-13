import React, { useState } from 'react';
import type { Drone, Mission } from '../../types';
import { Plane, MapPin, Radio, ShieldAlert } from 'lucide-react';

interface TacticalMapProps {
  drones: Drone[];
  missions: Mission[];
  onSelectMission?: (missionId: string) => void;
  onSelectDrone?: (droneId: string) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  drones,
  missions,
  onSelectMission,
  onSelectDrone,
}) => {
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'in_flight' | 'offline'>('all');

  // Center coordinate: Dispatch Hub Alpha (16.5062, 80.6480)
  const centerLat = 16.514;
  const centerLng = 80.638;
  const latSpan = 0.04;
  const lngSpan = 0.04;

  const project = (lat: number, lng: number) => {
    // Project to percentage 0-100%
    const x = ((lng - (centerLng - lngSpan / 2)) / lngSpan) * 100;
    const y = ((centerLat + latSpan / 2 - lat) / latSpan) * 100;
    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(8, Math.min(92, y)),
    };
  };

  const dispatchHub = project(16.5062, 80.648);

  const filteredDrones = drones.filter((d) => {
    if (filter === 'in_flight') return d.status === 'IN_FLIGHT';
    if (filter === 'offline') return d.status === 'OFFLINE_WAITING';
    return true;
  });

  return (
    <div className="relative w-full h-[380px] lg:h-[440px] bg-[#060a14] rounded-xl border border-slate-800 overflow-hidden flex flex-col">
      {/* Map Header & Controls */}
      <div className="p-3.5 border-b border-slate-800/80 bg-[#070d1a]/80 backdrop-blur-sm flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <h3 className="text-xs font-semibold text-slate-200">
            Tactical Flight Airspace
          </h3>
          <span className="text-[11px] font-mono-numbers text-slate-500 hidden sm:inline">
            HUB ALPHA (16.5062°N, 80.6480°E)
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Drones ({drones.length})
          </button>
          <button
            onClick={() => setFilter('in_flight')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              filter === 'in_flight'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            In Flight
          </button>
          <button
            onClick={() => setFilter('offline')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              filter === 'offline'
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Offline
          </button>
        </div>
      </div>

      {/* Interactive Tactical Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden select-none bg-[radial-gradient(ellipse_at_50%_50%,#0f1c33_0%,#050812_85%)]">
        {/* Radar Range Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-[140px] h-[140px] rounded-full border border-sky-400/30" />
          <div className="w-[280px] h-[280px] rounded-full border border-sky-400/25 absolute" />
          <div className="w-[420px] h-[420px] rounded-full border border-sky-400/20 absolute" />
          <div className="w-[560px] h-[560px] rounded-full border border-sky-400/15 absolute" />
          {/* Crosshairs */}
          <div className="w-full h-[1px] bg-sky-500/15 absolute" />
          <div className="h-full w-[1px] bg-sky-500/15 absolute" />
        </div>

        {/* SVG Waypoint Lines & Flight Corridors */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="corridor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid-pattern)" />

          {/* Draw active mission paths */}
          {missions
            .filter((m) => ['IN_PROGRESS', 'SUSPENDED_OFFLINE', 'RECOVERING'].includes(m.status))
            .map((m) => {
              if (!m.waypoints || m.waypoints.length === 0) return null;
              const points = [
                dispatchHub,
                ...m.waypoints.map((wp) => project(wp.latitude, wp.longitude)),
              ];

              const pathStr = points.reduce(
                (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`,
                ''
              );

              const isSuspended = m.status === 'SUSPENDED_OFFLINE';

              return (
                <g key={m.missionId}>
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={isSuspended ? '#f43f5e' : '#38bdf8'}
                    strokeWidth={isSuspended ? '1.5' : '2'}
                    strokeDasharray={isSuspended ? '4 4' : 'none'}
                    strokeOpacity={0.65}
                  />
                  {points.map((pt, i) => (
                    <circle
                      key={i}
                      cx={`${pt.x}%`}
                      cy={`${pt.y}%`}
                      r={i === 0 ? 4 : 3}
                      fill={i === 0 ? '#10b981' : '#38bdf8'}
                      opacity={0.8}
                    />
                  ))}
                </g>
              );
            })}
        </svg>

        {/* Central Dispatch Hub Marker */}
        <div
          style={{ left: `${dispatchHub.x}%`, top: `${dispatchHub.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
        >
          <div className="relative">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950">
              <MapPin className="w-3 h-3" />
            </div>
            <div className="absolute -inset-1 rounded-full border border-emerald-500/30 animate-ping pointer-events-none" />
          </div>
          <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono-numbers bg-slate-900/90 border border-emerald-500/40 text-emerald-300 whitespace-nowrap shadow-md">
            HUB ALPHA
          </span>
        </div>

        {/* Drones Markers */}
        {filteredDrones.map((drone) => {
          const pos = project(drone.currentLocation.latitude, drone.currentLocation.longitude);
          const isOffline = drone.status === 'OFFLINE_WAITING';
          const isInFlight = drone.status === 'IN_FLIGHT';

          return (
            <div
              key={drone.droneId}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
              onMouseEnter={() => setHoveredEntity(drone.droneId)}
              onMouseLeave={() => setHoveredEntity(null)}
              onClick={() => {
                if (onSelectDrone) onSelectDrone(drone.droneId);
                if (drone.currentMissionId && onSelectMission) {
                  onSelectMission(drone.currentMissionId);
                }
              }}
            >
              {/* Drone Pin */}
              <div
                className={`relative flex items-center justify-center w-7 h-7 rounded-lg border shadow-lg transition-transform hover:scale-110 ${
                  isOffline
                    ? 'bg-rose-950/80 border-rose-500/70 text-rose-300'
                    : isInFlight
                    ? 'bg-sky-950/80 border-sky-400/70 text-sky-300'
                    : 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
                }`}
              >
                {isOffline ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : (
                  <Plane className="w-3.5 h-3.5" />
                )}
                {isOffline && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>

              {/* Tag below pin */}
              <div className="mt-1 flex flex-col items-center">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-numbers font-semibold bg-slate-900/90 border border-slate-700 text-slate-200 whitespace-nowrap shadow-md">
                  {drone.droneId}
                </span>
                {isInFlight && drone.speedKmh && (
                  <span className="text-[9px] font-mono-numbers text-sky-400">
                    {drone.speedKmh} km/h · {drone.altitudeMeters}m
                  </span>
                )}
              </div>

              {/* Hover Popup Card */}
              {hoveredEntity === drone.droneId && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2.5 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl text-[11px] pointer-events-none z-30">
                  <div className="flex items-center justify-between font-semibold border-b border-slate-800 pb-1 mb-1 text-slate-200">
                    <span>{drone.droneId}</span>
                    <span className="font-mono-numbers">{drone.batteryPercent}% bat</span>
                  </div>
                  <div className="space-y-0.5 text-slate-400 font-mono-numbers text-[10px]">
                    <div>Model: {drone.model}</div>
                    <div>Status: {drone.status}</div>
                    {drone.currentMissionId && (
                      <div className="text-sky-300">Mission: {drone.currentMissionId}</div>
                    )}
                    <div>
                      Coords: {drone.currentLocation.latitude.toFixed(4)},{' '}
                      {drone.currentLocation.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Map Legend & Disclaimer Footer */}
      <div className="px-4 py-2 bg-[#070d1a] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 font-mono-numbers">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Hub / Base</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>In Flight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span>Offline (Workflow Suspended)</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono-numbers">
          ◎ SIMULATED TACTICAL COORDINATES · NOT LIVE GPS
        </div>
      </div>
    </div>
  );
};
