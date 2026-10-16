import React, { useState, useEffect, useRef } from 'react';
import type { Drone } from '../../types';
import { useToast } from '../ui/Toast';
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
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Flame,
  Timer,
  Navigation,
  Gauge,
} from 'lucide-react';

// Dispatch Hub Alpha Coordinates (Home Waypoint)
const HUB_ALPHA_COORDS = { latitude: 16.5062, longitude: 80.648 };

// Calculate distance in kilometers using the Haversine formula
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate consumption burn rate (% per minute)
const calculateBurnRatePercentPerMin = (drone: Drone): number => {
  if (drone.status === 'AVAILABLE') return 0.05; // Idle standby at hub
  if (drone.status === 'OFFLINE_WAITING') return 0.75; // Hovering station-keeping

  // Active flight consumption
  const speed = drone.speedKmh || 50;
  const altitude = drone.altitudeMeters || 100;
  const baseRate = 0.85;
  const speedFactor = (speed / 50) * 0.25;
  const altitudeFactor = (altitude / 100) * 0.1;

  return Math.min(2.5, Math.max(0.6, baseRate + speedFactor + altitudeFactor));
};

// Predictive energy metrics interface
interface PredictiveEnergyMetrics {
  burnRatePerMin: number;
  minutesToEmpty: number;
  formattedTTE: string;
  distToHomeKm: number;
  timeToHomeMinutes: number;
  batteryRequiredForRTB: number;
  canReachHomeSafely: boolean;
  batteryDeficit: number;
}

const computePredictiveMetrics = (drone: Drone): PredictiveEnergyMetrics => {
  const burnRate = calculateBurnRatePercentPerMin(drone);
  const minutesToEmpty = Math.floor(drone.batteryPercent / burnRate);

  let formattedTTE = '';
  if (minutesToEmpty >= 60) {
    const hrs = Math.floor(minutesToEmpty / 60);
    const mins = minutesToEmpty % 60;
    formattedTTE = `${hrs}h ${mins}m`;
  } else {
    formattedTTE = `${Math.max(1, minutesToEmpty)} mins`;
  }

  const distToHomeKm = calculateDistanceKm(
    drone.currentLocation.latitude,
    drone.currentLocation.longitude,
    HUB_ALPHA_COORDS.latitude,
    HUB_ALPHA_COORDS.longitude
  );

  // Flight time needed to return home (at nominal cruise speed ~48 km/h + 2 mins landing approach)
  const returnSpeedKmh = Math.max(35, drone.speedKmh || 48);
  const flightTimeMinutes = (distToHomeKm / returnSpeedKmh) * 60;
  const timeToHomeMinutes = Math.max(1, Math.round(flightTimeMinutes + 2));

  // Required battery = (time * burn rate) + 5% emergency safety reserve
  const batteryRequiredForRTB = Math.ceil(timeToHomeMinutes * burnRate + 5);
  const canReachHomeSafely =
    drone.status === 'AVAILABLE' ||
    (drone.batteryPercent >= batteryRequiredForRTB && minutesToEmpty >= timeToHomeMinutes);

  const batteryDeficit = Math.max(0, batteryRequiredForRTB - drone.batteryPercent);

  return {
    burnRatePerMin: +burnRate.toFixed(2),
    minutesToEmpty,
    formattedTTE,
    distToHomeKm: +distToHomeKm.toFixed(2),
    timeToHomeMinutes,
    batteryRequiredForRTB,
    canReachHomeSafely,
    batteryDeficit,
  };
};

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
  const { showToast } = useToast();
  const alertedDronesRef = useRef<Set<string>>(new Set());
  const [signalingDrone, setSignalingDrone] = useState<string | null>(null);

  // Predictive Safety Monitor: trigger toast warning if any drone cannot reach home safely
  useEffect(() => {
    drones.forEach((drone) => {
      // Don't warn for parked drones sitting at the hub
      if (drone.status === 'AVAILABLE') return;

      const metrics = computePredictiveMetrics(drone);

      if (!metrics.canReachHomeSafely) {
        if (!alertedDronesRef.current.has(drone.droneId)) {
          alertedDronesRef.current.add(drone.droneId);
          showToast({
            type: 'error',
            title: `🚨 RTB Infeasible: ${drone.droneId}`,
            description: `${drone.droneId} has ~${metrics.formattedTTE} of battery remaining, but requires ${metrics.timeToHomeMinutes} mins (${metrics.distToHomeKm} km) to reach Dispatch Hub Alpha. Battery deficit: -${metrics.batteryDeficit}%. Immediate landing recommended.`,
          });
        }
      } else {
        // If battery recovers, allow re-alerting if deficit returns
        alertedDronesRef.current.delete(drone.droneId);
      }
    });
  }, [drones, showToast]);

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
        const metrics = computePredictiveMetrics(drone);

        return (
          <div
            key={drone.droneId}
            className={`flex flex-col justify-between p-4.5 rounded-2xl border transition-all backdrop-blur-sm relative overflow-hidden ${
              !metrics.canReachHomeSafely
                ? 'bg-red-950/35 border-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.35)] ring-2 ring-red-500/60'
                : isCriticalBattery
                ? 'bg-red-950/30 border-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.3)] ring-2 ring-red-500/50'
                : isOffline
                ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700/60'
                : isInFlight
                ? 'bg-sky-950/20 border-sky-800/40 hover:border-sky-700/60'
                : 'bg-slate-900/40 border-slate-800/70 hover:border-slate-700/80'
            }`}
          >
            {/* Ambient Alert Glow Background for unsafe RTB or <15% battery */}
            {(!metrics.canReachHomeSafely || isCriticalBattery) && (
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
            )}

            <div>
              {/* Unsafe RTB Warning Banner */}
              {!metrics.canReachHomeSafely ? (
                <div className="mb-3 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/70 flex items-center justify-between text-red-200 text-xs font-mono-numbers shadow-sm animate-pulse">
                  <div className="flex items-center gap-1.5 font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>CANNOT REACH HOME SAFELY</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-red-900/90 text-[10px] text-red-100 font-semibold uppercase">
                    DEFICIT -{metrics.batteryDeficit}%
                  </span>
                </div>
              ) : isCriticalBattery ? (
                <div className="mb-3 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/60 flex items-center justify-between text-red-200 text-xs font-mono-numbers shadow-sm animate-pulse">
                  <div className="flex items-center gap-1.5 font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>CRITICAL BATTERY &lt; 15%</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-red-900/90 text-[10px] text-red-100 font-semibold uppercase">
                    RTB Mandatory
                  </span>
                </div>
              ) : null}

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
                    !metrics.canReachHomeSafely || isCriticalBattery
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
                      !metrics.canReachHomeSafely || isCriticalBattery
                        ? 'bg-red-400 animate-ping'
                        : isOffline
                        ? 'bg-rose-400 animate-pulse'
                        : isInFlight
                        ? 'bg-sky-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>
                    {!metrics.canReachHomeSafely
                      ? 'Unsafe RTB'
                      : isCriticalBattery
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
                    {!metrics.canReachHomeSafely || isCriticalBattery ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Battery className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>BATTERY CAPACITY</span>
                  </span>

                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      !metrics.canReachHomeSafely || isCriticalBattery
                        ? 'text-red-400 font-bold animate-pulse'
                        : drone.batteryPercent > 50
                        ? 'text-emerald-400'
                        : drone.batteryPercent > 20
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {drone.batteryPercent}%
                    {!metrics.canReachHomeSafely ? (
                      <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider">
                        (ALERT)
                      </span>
                    ) : isCriticalBattery ? (
                      <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider">
                        (CRITICAL)
                      </span>
                    ) : null}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      !metrics.canReachHomeSafely || isCriticalBattery
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

              {/* Predictive Consumption & RTB Reachability Module */}
              <div
                className={`mt-3 p-2.5 rounded-xl border text-xs font-mono-numbers space-y-1.5 transition-colors ${
                  !metrics.canReachHomeSafely
                    ? 'bg-red-950/40 border-red-500/70 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Timer className="w-3.5 h-3.5 text-sky-400" />
                    <span>EST. TIME TO EMPTY (TTE)</span>
                  </span>
                  <span
                    className={`font-bold ${
                      !metrics.canReachHomeSafely
                        ? 'text-red-400 animate-pulse'
                        : metrics.minutesToEmpty < 20
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    ~{metrics.formattedTTE}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>BURN: {metrics.burnRatePerMin}%/min</span>
                  <span>DIST TO HUB: {metrics.distToHomeKm} km</span>
                </div>

                {/* RTB Feasibility Indicator */}
                <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between">
                  {metrics.canReachHomeSafely ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>RTB SAFE · Needs ~{metrics.timeToHomeMinutes}m ({metrics.batteryRequiredForRTB}%)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>RTB INFEASIBLE · Deficit -{metrics.batteryDeficit}%</span>
                    </span>
                  )}

                  {!metrics.canReachHomeSafely && (
                    <span className="px-1.5 py-0.2 rounded bg-red-900/80 text-[9px] text-red-200 font-bold uppercase tracking-wider">
                      MAYDAY
                    </span>
                  )}
                </div>
              </div>

              {/* Live Telemetry Meters */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono-numbers bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70">
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
