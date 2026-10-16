import React, { useState } from 'react';
import type { Drone } from '../../types';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Wifi,
  WifiOff,
  Plane,
  Compass,
  ArrowUpRight,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface DroneFleetGridProps {
  drones: Drone[];
  onSignalOffline: (droneId: string) => Promise<void>;
  onSignalReconnect: (droneId: string) => Promise<void>;
  onSelectMission?: (missionId: string) => void;
  onSimulateBatteryDrain?: (droneId: string, percent: number) => void;
}

export const DroneFleetGrid: React.FC<DroneFleetGridProps> = ({
  drones,
  onSignalOffline,
  onSignalReconnect,
  onSelectMission,
  onSimulateBatteryDrain,
}) => {
  const [signalingDrone, setSignalingDrone] = useState<string | null>(null);

  const handleOffline = async (droneId: string) => {
    setSignalingDrone(droneId);
    try {
      await onSignalOffline(droneId);
    } finally {
      setSignalingDrone(null);
    }
  };

  const handleReconnect = async (droneId: string) => {
    setSignalingDrone(droneId);
    try {
      await onSignalReconnect(droneId);
    } finally {
      setSignalingDrone(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {drones.map((drone) => {
        const isOffline = drone.status === 'OFFLINE_WAITING';
        const isInFlight = drone.status === 'IN_FLIGHT';
        const isBusy = signalingDrone === drone.droneId;
        const isCriticalBattery = drone.batteryPercent < 15;

        return (
          <div
            key={drone.droneId}
            className={`flex flex-col justify-between p-4.5 rounded-2xl border transition-all backdrop-blur-sm relative overflow-hidden ${
              isCriticalBattery
                ? 'bg-red-950/30 border-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.35)] ring-2 ring-red-500/60'
                : isOffline
                ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700/60'
                : isInFlight
                ? 'bg-sky-950/20 border-sky-800/40 hover:border-sky-700/60'
                : 'bg-slate-900/40 border-slate-800/70 hover:border-slate-700/80'
            }`}
          >
            {/* Ambient Critical Glow Background for <15% battery */}
            {isCriticalBattery && (
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
            )}

            <div>
              {/* Critical Battery Warning Header Banner */}
              {isCriticalBattery && (
                <div className="mb-3 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/60 flex items-center justify-between text-red-200 text-xs font-mono-numbers shadow-sm animate-pulse">
                  <div className="flex items-center gap-1.5 font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>CRITICAL BATTERY &lt; 15%</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-red-900/90 text-[10px] text-red-100 font-semibold uppercase">
                    RTB Mandatory
                  </span>
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono-numbers">
                      {drone.droneId}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      · {drone.model}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-numbers mt-0.5">
                    {drone.currentLocation.latitude.toFixed(4)}°N,{' '}
                    {drone.currentLocation.longitude.toFixed(4)}°E
                  </div>
                </div>

                {/* Status indicator pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono-numbers border ${
                    isCriticalBattery
                      ? 'text-red-300 bg-red-500/20 border-red-500/50 animate-pulse'
                      : isOffline
                      ? 'text-rose-300 bg-rose-500/10 border-rose-500/20'
                      : isInFlight
                      ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
                      : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCriticalBattery
                        ? 'bg-red-400 animate-ping'
                        : isOffline
                        ? 'bg-rose-400 animate-pulse'
                        : isInFlight
                        ? 'bg-sky-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>
                    {isCriticalBattery
                      ? 'Low Battery'
                      : isOffline
                      ? 'Offline'
                      : isInFlight
                      ? 'In Flight'
                      : 'Available'}
                  </span>
                </span>
              </div>

              {/* Battery Meter with Visual Warning */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono-numbers">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    {isCriticalBattery ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Battery className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>BATTERY CAPACITY</span>
                  </span>

                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isCriticalBattery
                        ? 'text-red-400 font-bold animate-pulse'
                        : drone.batteryPercent > 50
                        ? 'text-emerald-400'
                        : drone.batteryPercent > 20
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {drone.batteryPercent}%
                    {isCriticalBattery && (
                      <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider">
                        (CRITICAL)
                      </span>
                    )}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCriticalBattery
                        ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse'
                        : drone.batteryPercent > 50
                        ? 'bg-emerald-500'
                        : drone.batteryPercent > 20
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(4, drone.batteryPercent)}%` }}
                  />
                </div>
              </div>

              {/* Live Telemetry Meters */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono-numbers bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70">
                <div>
                  <span className="text-slate-400 block text-[10px]">GROUND SPEED</span>
                  <span className="text-slate-200 font-semibold">
                    {drone.speedKmh || 0} km/h
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ALTITUDE</span>
                  <span className="text-slate-200 font-semibold">
                    {drone.altitudeMeters || 0}m AGL
                  </span>
                </div>
              </div>

              {/* Assigned Mission link */}
              {drone.currentMissionId && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      if (onSelectMission && drone.currentMissionId) {
                        onSelectMission(drone.currentMissionId);
                      }
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-sky-950/30 border border-sky-800/30 hover:border-sky-600/50 text-xs font-mono-numbers text-sky-300 transition-colors group"
                  >
                    <span className="truncate">Mission: {drone.currentMissionId}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2">
              {!isOffline ? (
                <button
                  disabled={isBusy}
                  onClick={() => handleOffline(drone.droneId)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-colors disabled:opacity-40"
                  title="Simulate drone disconnection signal to Temporal workflow"
                >
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isBusy ? 'Signaling...' : 'Go Offline'}</span>
                </button>
              ) : (
                <button
                  disabled={isBusy}
                  onClick={() => handleReconnect(drone.droneId)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 transition-colors disabled:opacity-40"
                  title="Signal drone reconnected to resume Temporal workflow"
                >
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isBusy ? 'Signaling...' : 'Reconnect'}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
