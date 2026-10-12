import React, { useState } from 'react';
import type { Drone } from '../../types';
import {
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Plane,
  Compass,
  ArrowUpRight,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

interface DroneFleetGridProps {
  drones: Drone[];
  onSignalOffline: (droneId: string) => Promise<void>;
  onSignalReconnect: (droneId: string) => Promise<void>;
  onSelectMission?: (missionId: string) => void;
}

export const DroneFleetGrid: React.FC<DroneFleetGridProps> = ({
  drones,
  onSignalOffline,
  onSignalReconnect,
  onSelectMission,
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

        return (
          <div
            key={drone.droneId}
            className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
              isOffline
                ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700/60'
                : isInFlight
                ? 'bg-sky-950/20 border-sky-900/50 hover:border-sky-700/60'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100 font-mono-numbers">
                      {drone.droneId}
                    </h4>
                    <span
                      className={`text-[10px] font-mono-numbers px-2 py-0.5 rounded border ${
                        isOffline
                          ? 'text-rose-300 bg-rose-950/80 border-rose-800/80'
                          : isInFlight
                          ? 'text-sky-300 bg-sky-950/80 border-sky-800/80'
                          : 'text-emerald-300 bg-emerald-950/80 border-emerald-800/80'
                      }`}
                    >
                      {isOffline ? 'OFFLINE WAITING' : isInFlight ? 'IN FLIGHT' : 'AVAILABLE'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{drone.model}</p>
                </div>

                <div className="p-2 rounded-lg bg-slate-800/60 text-slate-300">
                  <Plane className="w-4 h-4" />
                </div>
              </div>

              {/* Battery & Telemetry metrics */}
              <div className="mt-4 space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs font-mono-numbers mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      {drone.batteryPercent > 20 ? (
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      Battery
                    </span>
                    <span className="font-semibold text-slate-200">
                      {drone.batteryPercent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${drone.batteryPercent}%` }}
                      className={`h-full rounded-full ${
                        drone.batteryPercent > 50
                          ? 'bg-emerald-400'
                          : drone.batteryPercent > 20
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Telemetry rows */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-numbers text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block text-[9px]">SPEED</span>
                    <span>{drone.speedKmh || 0} km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">ALTITUDE</span>
                    <span>{drone.altitudeMeters || 0} m</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/60">
                    <span className="text-slate-500 block text-[9px]">COORDINATES</span>
                    <span className="truncate block">
                      {drone.currentLocation.latitude.toFixed(4)},{' '}
                      {drone.currentLocation.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                {drone.currentMissionId && (
                  <div className="pt-1">
                    <button
                      onClick={() => onSelectMission && onSelectMission(drone.currentMissionId!)}
                      className="w-full text-left flex items-center justify-between text-xs text-sky-400 hover:text-sky-300 font-mono-numbers"
                    >
                      <span>Active: {drone.currentMissionId}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Temporal Signal Simulation Actions */}
            <div className="mt-5 pt-3 border-t border-slate-800/80">
              <span className="block text-[9px] font-mono-numbers text-slate-500 mb-2 uppercase tracking-wider">
                Temporal Workflow Signals
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOffline(drone.droneId)}
                  disabled={isBusy || isOffline}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Send POST /api/drones/{id}/offline to pause workflow"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Go Offline</span>
                </button>

                <button
                  onClick={() => handleReconnect(drone.droneId)}
                  disabled={isBusy || !isOffline}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-sky-950/50 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Send POST /api/drones/{id}/reconnected to resume recovery"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reconnect</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
