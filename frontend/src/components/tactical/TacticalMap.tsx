import React, { useState, useEffect, useRef } from 'react';
import type { Drone, Mission } from '../../types';
import {
  Plane,
  MapPin,
  Radio,
  ShieldAlert,
  Compass,
  Navigation,
  Crosshair,
  Wifi,
  Satellite,
  Layers,
} from 'lucide-react';

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
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [followDroneId, setFollowDroneId] = useState<string | null>('DRONE-001');

  // Breadcrumbs history for live flight trail
  const [trailMap, setTrailMap] = useState<Record<string, Array<{ x: number; y: number }>>>({});

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

  // Update breadcrumb trails when drones move
  useEffect(() => {
    if (!isLiveActive) return;

    setTrailMap((prev) => {
      const next = { ...prev };
      drones.forEach((d) => {
        if (d.status === 'IN_FLIGHT') {
          const pt = project(d.currentLocation.latitude, d.currentLocation.longitude);
          const currentTrail = next[d.droneId] || [];
          // Avoid duplicate points close together
          const last = currentTrail[currentTrail.length - 1];
          if (!last || Math.hypot(last.x - pt.x, last.y - pt.y) > 0.4) {
            next[d.droneId] = [...currentTrail.slice(-16), pt];
          }
        }
      });
      return next;
    });
  }, [drones, isLiveActive]);

  const filteredDrones = drones.filter((d) => {
    if (filter === 'in_flight') return d.status === 'IN_FLIGHT';
    if (filter === 'offline') return d.status === 'OFFLINE_WAITING';
    return true;
  });

  const activeTrackingDrone =
    drones.find((d) => d.droneId === followDroneId) ||
    drones.find((d) => d.status === 'IN_FLIGHT') ||
    drones[0];

  return (
    <div className="relative w-full h-[400px] lg:h-[460px] bg-[#060a14] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col shadow-2xl">
      {/* Map Header & Controls */}
      <div className="p-3 border-b border-slate-800/80 bg-[#070d1a]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 z-20">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono-numbers text-emerald-400 font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${
                isLiveActive ? 'animate-ping' : 'opacity-40'
              }`}
            />
            <span>LIVE GPS STREAM</span>
          </div>

          <span className="text-[11px] font-mono-numbers text-slate-400 hidden md:inline">
            HUB ALPHA (16.5062°N, 80.6480°E)
          </span>
        </div>

        {/* Live Filter & Tracking Controls */}
        <div className="flex items-center gap-2">
          {/* Filter controls */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono-numbers">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({drones.length})
            </button>
            <button
              onClick={() => setFilter('in_flight')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'in_flight'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In Flight
            </button>
            <button
              onClick={() => setFilter('offline')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'offline'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Offline
            </button>
          </div>

          {/* Follow Drone Toggle */}
          <select
            value={followDroneId || ''}
            onChange={(e) => {
              setFollowDroneId(e.target.value);
              if (onSelectDrone) onSelectDrone(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-sky-300 px-2 py-1 font-mono-numbers focus:outline-none"
            title="Lock camera focus on drone"
          >
            <option value="">Tracking: None</option>
            {drones.map((d) => (
              <option key={d.droneId} value={d.droneId}>
                Track {d.droneId}
              </option>
            ))}
          </select>
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

        {/* SVG Waypoint Lines, Corridors & Breadcrumbs */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="corridor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeOpacity="0.4"
              />
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

          {/* Draw Live Breadcrumbs trail for in-flight drones */}
          {Object.entries(trailMap).map(([droneId, pts]) => {
            if (pts.length < 2) return null;
            const trailPath = pts.reduce(
              (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`,
              ''
            );
            return (
              <g key={`trail-${droneId}`}>
                <path
                  d={trailPath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                  strokeOpacity="0.5"
                />
                {pts.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={`${pt.x}%`}
                    cy={`${pt.y}%`}
                    r="1.5"
                    fill="#38bdf8"
                    opacity={(idx + 1) / pts.length * 0.6}
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

        {/* Moving Live Drones Markers */}
        {filteredDrones.map((drone) => {
          const pos = project(drone.currentLocation.latitude, drone.currentLocation.longitude);
          const isOffline = drone.status === 'OFFLINE_WAITING';
          const isInFlight = drone.status === 'IN_FLIGHT';
          const isSelected = followDroneId === drone.droneId;

          return (
            <div
              key={drone.droneId}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transition: 'left 1.2s ease-out, top 1.2s ease-out',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
              onMouseEnter={() => setHoveredEntity(drone.droneId)}
              onMouseLeave={() => setHoveredEntity(null)}
              onClick={() => {
                setFollowDroneId(drone.droneId);
                if (onSelectDrone) onSelectDrone(drone.droneId);
                if (drone.currentMissionId && onSelectMission) {
                  onSelectMission(drone.currentMissionId);
                }
              }}
            >
              {/* Drone Pin Icon with Heading Rotation */}
              <div
                className={`relative p-1.5 rounded-full border transition-transform duration-300 ${
                  isOffline
                    ? 'bg-rose-950 border-rose-500 text-rose-400 shadow-lg shadow-rose-950'
                    : isInFlight
                    ? 'bg-sky-950 border-sky-400 text-sky-300 shadow-lg shadow-sky-950'
                    : 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950'
                } ${isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-black' : ''}`}
              >
                <div
                  style={{
                    transform: `rotate(${drone.headingDeg || 0}deg)`,
                    transition: 'transform 0.6s ease',
                  }}
                >
                  <Plane className="w-3.5 h-3.5" />
                </div>

                {/* Pulsing beacon ring for in-flight drones */}
                {isInFlight && (
                  <div className="absolute -inset-1 rounded-full border border-sky-400 animate-ping pointer-events-none" />
                )}

                {/* Offline warning pulse */}
                {isOffline && (
                  <div className="absolute -inset-1 rounded-full border border-rose-500 animate-pulse pointer-events-none" />
                )}
              </div>

              {/* Drone Tag Label */}
              <div className="mt-1 flex flex-col items-center">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono-numbers whitespace-nowrap border shadow-md ${
                    isOffline
                      ? 'bg-rose-950/90 border-rose-800 text-rose-300'
                      : isInFlight
                      ? 'bg-slate-900/90 border-sky-700 text-sky-200'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300'
                  }`}
                >
                  {drone.droneId}
                </span>

                {/* Live speed / alt badge */}
                {isInFlight && (
                  <span className="text-[9px] font-mono-numbers text-sky-400 bg-black/70 px-1 rounded mt-0.5 whitespace-nowrap">
                    {drone.speedKmh || 52}km/h · {drone.altitudeMeters || 115}m
                  </span>
                )}
              </div>

              {/* Hover Telemetry Card */}
              {hoveredEntity === drone.droneId && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 p-2.5 rounded-xl bg-[#090f20]/95 border border-slate-700/80 shadow-2xl z-30 pointer-events-none backdrop-blur-md">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-mono-numbers font-semibold text-white">
                    <span>{drone.droneId}</span>
                    <span
                      className={`text-[10px] ${
                        isOffline
                          ? 'text-rose-400'
                          : isInFlight
                          ? 'text-sky-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {drone.status}
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-1 text-[10px] font-mono-numbers text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">LIVE GPS:</span>
                      <span className="text-sky-300">
                        {drone.currentLocation.latitude.toFixed(5)}°N,{' '}
                        {drone.currentLocation.longitude.toFixed(5)}°E
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ALTITUDE:</span>
                      <span>{drone.altitudeMeters || 0} m AGL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SPEED:</span>
                      <span>{drone.speedKmh || 0} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">HEADING:</span>
                      <span>{drone.headingDeg || 0}° HDG</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">BATTERY:</span>
                      <span className="text-emerald-400 font-semibold">
                        {drone.batteryPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-Time Live Location Telemetry Ribbon */}
      <div className="p-3 bg-[#060a14] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono-numbers">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {activeTrackingDrone ? activeTrackingDrone.droneId : 'FLEET RADAR'}
            </span>
          </div>

          {activeTrackingDrone && (
            <div className="flex items-center gap-3 text-slate-300 text-[11px]">
              <span className="text-sky-300 font-medium">
                {activeTrackingDrone.currentLocation.latitude.toFixed(5)}°N,{' '}
                {activeTrackingDrone.currentLocation.longitude.toFixed(5)}°E
              </span>
              <span className="text-slate-500">·</span>
              <span>ALT: {activeTrackingDrone.altitudeMeters || 0}m AGL</span>
              <span className="text-slate-500">·</span>
              <span>SPD: {activeTrackingDrone.speedKmh || 0} km/h</span>
              <span className="text-slate-500">·</span>
              <span>HDG: {activeTrackingDrone.headingDeg || 42}°</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Satellite className="w-3.5 h-3.5 text-emerald-400" />
          <span>19 Satellites Locked</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">5.8 GHz Link Active</span>
        </div>
      </div>
    </div>
  );
};
