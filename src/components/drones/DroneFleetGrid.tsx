import React, { useState, useEffect, useRef } from 'react';
import type { Drone } from '../../types';
import { useToast } from '../ui/Toast';
import { getNearestPlace } from '../../services/landmarks';
import {
  windTelemetryService,
  WIND_PRESETS,
  calculateBearingDeg,
  calculateWindComponents,
  type WindTelemetry,
} from '../../services/windTelemetry';
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
  MapPin,
  Wind,
  Activity,
  Sliders,
  ChevronRight,
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

// Predictive energy & wind-adjusted return flight metrics interface
interface PredictiveEnergyMetrics {
  burnRatePerMin: number;
  minutesToEmpty: number;
  formattedTTE: string;
  distToHomeKm: number;
  returnBearingDeg: number;
  headwindKmh: number;
  crosswindKmh: number;
  effectiveReturnSpeedKmh: number;
  timeToHomeMinutes: number;
  nominalTimeToHomeMinutes: number;
  windDelayMinutes: number;
  batteryRequiredForRTB: number;
  canReachHomeSafely: boolean;
  isReturnTimeExceedsBattery: boolean;
  batteryDeficit: number;
  timeDeficitMinutes: number;
}

// Compute predictive wind-adjusted metrics for a drone
const computePredictiveMetrics = (
  drone: Drone,
  wind: WindTelemetry
): PredictiveEnergyMetrics => {
  const distToHomeKm = calculateDistanceKm(
    drone.currentLocation.latitude,
    drone.currentLocation.longitude,
    HUB_ALPHA_COORDS.latitude,
    HUB_ALPHA_COORDS.longitude
  );

  // Return bearing from drone's current position to Dispatch Hub Alpha
  const returnBearingDeg = Math.round(
    calculateBearingDeg(
      drone.currentLocation.latitude,
      drone.currentLocation.longitude,
      HUB_ALPHA_COORDS.latitude,
      HUB_ALPHA_COORDS.longitude
    )
  );

  // Wind vector decomposition along the return flight path
  const { headwindKmh, crosswindKmh } = calculateWindComponents(
    returnBearingDeg,
    wind.speedKmh,
    wind.directionDeg
  );

  // Base nominal airspeed is 45 km/h
  const nominalAirspeedKmh = 45;

  // Effective return ground speed into headwind (minimum forward penetration 12 km/h)
  const effectiveReturnSpeedKmh = Math.max(12, nominalAirspeedKmh - headwindKmh);

  // Return flight time: transit duration + 2 mins landing and descent approach
  const transitMinutes = (distToHomeKm / effectiveReturnSpeedKmh) * 60;
  const timeToHomeMinutes = Math.max(1, Math.round(transitMinutes + 2));

  // Nominal return flight time in calm wind (for comparison)
  const nominalTransitMinutes = (distToHomeKm / nominalAirspeedKmh) * 60;
  const nominalTimeToHomeMinutes = Math.max(1, Math.round(nominalTransitMinutes + 2));
  const windDelayMinutes = Math.max(0, timeToHomeMinutes - nominalTimeToHomeMinutes);

  // Base consumption rate (% per minute)
  let baseRate = 0.85;
  if (drone.status === 'AVAILABLE') baseRate = 0.05;
  else if (drone.status === 'OFFLINE_WAITING') baseRate = 0.75;
  else {
    const speedFactor = ((drone.speedKmh || 45) / 50) * 0.2;
    const altitudeFactor = ((drone.altitudeMeters || 100) / 100) * 0.1;
    baseRate = Math.max(0.65, baseRate + speedFactor + altitudeFactor);
  }

  // Aerodynamic wind resistance power penalty (fighting headwind and crosswind drag)
  let windPowerMultiplier = 1.0;
  if (drone.status !== 'AVAILABLE') {
    const headwindPenalty = Math.max(0, headwindKmh / 35) * 0.55;
    const crosswindPenalty = (crosswindKmh / 45) * 0.18;
    windPowerMultiplier = 1.0 + headwindPenalty + crosswindPenalty;
  }

  const burnRate = +(baseRate * windPowerMultiplier).toFixed(2);
  const minutesToEmpty = Math.floor(drone.batteryPercent / Math.max(0.05, burnRate));

  let formattedTTE = '';
  if (minutesToEmpty >= 60) {
    const hrs = Math.floor(minutesToEmpty / 60);
    const mins = minutesToEmpty % 60;
    formattedTTE = `${hrs}h ${mins}m`;
  } else {
    formattedTTE = `${Math.max(1, minutesToEmpty)} mins`;
  }

  // Required battery for return flight under wind conditions + 5% emergency safety reserve
  const batteryRequiredForRTB = Math.ceil(timeToHomeMinutes * burnRate + 5);

  // Core predictive alert criteria:
  // Does the estimated return flight time exceed remaining battery capacity (minutes to empty)?
  const isReturnTimeExceedsBattery =
    drone.status !== 'AVAILABLE' &&
    (timeToHomeMinutes > minutesToEmpty || drone.batteryPercent < batteryRequiredForRTB);

  const canReachHomeSafely = drone.status === 'AVAILABLE' || !isReturnTimeExceedsBattery;

  const timeDeficitMinutes = Math.max(0, timeToHomeMinutes - minutesToEmpty);
  const batteryDeficit = Math.max(0, batteryRequiredForRTB - drone.batteryPercent);

  return {
    burnRatePerMin: burnRate,
    minutesToEmpty,
    formattedTTE,
    distToHomeKm: +distToHomeKm.toFixed(2),
    returnBearingDeg,
    headwindKmh,
    crosswindKmh,
    effectiveReturnSpeedKmh,
    timeToHomeMinutes,
    nominalTimeToHomeMinutes,
    windDelayMinutes,
    batteryRequiredForRTB,
    canReachHomeSafely,
    isReturnTimeExceedsBattery,
    batteryDeficit,
    timeDeficitMinutes,
  };
};

interface DroneFleetGridProps {
  drones: Drone[];
  onSignalOffline: (droneId: string) => Promise<void>;
  onSignalReconnect: (droneId: string) => Promise<void>;
  onSelectMission?: (missionId: string) => void;
  onSimulateBatteryDrain?: (droneId: string, percent: number) => void;
  onInspectLocation?: (drone: Drone) => void;
}

export const DroneFleetGrid: React.FC<DroneFleetGridProps> = ({
  drones,
  onSignalOffline,
  onSignalReconnect,
  onSelectMission,
  onSimulateBatteryDrain,
  onInspectLocation,
}) => {
  const { showToast } = useToast();
  const alertedDronesRef = useRef<Set<string>>(new Set());
  const [signalingDrone, setSignalingDrone] = useState<string | null>(null);

  // Live Wind Telemetry state
  const [wind, setWind] = useState<WindTelemetry>(windTelemetryService.getWind());
  const [showWindControls, setShowWindControls] = useState<boolean>(false);

  // Subscribe to live wind telemetry
  useEffect(() => {
    const unsubscribe = windTelemetryService.subscribe((w) => {
      setWind(w);
    });
    return () => unsubscribe();
  }, []);

  // Predictive Safety Monitor: trigger toast warning whenever return flight time exceeds battery capacity
  useEffect(() => {
    drones.forEach((drone) => {
      if (drone.status === 'AVAILABLE') return;

      const metrics = computePredictiveMetrics(drone, wind);

      if (metrics.isReturnTimeExceedsBattery) {
        if (!alertedDronesRef.current.has(drone.droneId)) {
          alertedDronesRef.current.add(drone.droneId);
          showToast({
            type: 'error',
            title: `🚨 Wind RTB Deficit: ${drone.droneId}`,
            description: `${drone.droneId} return flight time (${metrics.timeToHomeMinutes} mins into ${metrics.headwindKmh > 0 ? `${metrics.headwindKmh} km/h headwind` : `${wind.speedKmh} km/h wind`}) exceeds remaining battery endurance (${metrics.minutesToEmpty} mins). Immediate emergency landing advised.`,
          });
        }
      } else {
        alertedDronesRef.current.delete(drone.droneId);
      }
    });
  }, [drones, wind, showToast]);

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

  // Count drones with wind return deficits
  const windDeficitDrones = drones.filter((d) => {
    if (d.status === 'AVAILABLE') return false;
    const m = computePredictiveMetrics(d, wind);
    return m.isReturnTimeExceedsBattery;
  });

  return (
    <div className="space-y-4">
      {/* Live Atmospheric Wind Telemetry Ribbon */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Wind className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  Atmospheric Wind Telemetry
                </span>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  · Sonic Link Active
                </span>
                {windDeficitDrones.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                    {windDeficitDrones.length} RTB Wind Deficit
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-mono tabular-nums mt-0.5">
                Current: <strong className="text-white font-medium">{wind.speedKmh} km/h</strong> from{' '}
                <strong className="text-sky-300 font-medium">{wind.directionCardinal} ({wind.directionDeg}°)</strong> · Gusts:{' '}
                <strong className="text-amber-300 font-medium">{wind.gustKmh} km/h</strong> · Turbulence:{' '}
                <strong className={wind.turbulenceLevel === 'SEVERE' ? 'text-red-400' : 'text-emerald-400'}>
                  {wind.turbulenceLevel}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWindControls(!showWindControls)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                showWindControls
                  ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
              title="Toggle wind speed simulator presets"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulate Wind</span>
            </button>
          </div>
        </div>

        {/* Expandable Wind Simulation Controls */}
        {showWindControls && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-[11px] font-medium">Presets:</span>
              {WIND_PRESETS.map((p) => {
                const isSelected = Math.abs(wind.speedKmh - p.speedKmh) < 2;
                return (
                  <button
                    key={p.id}
                    onClick={() => windTelemetryService.setWind(p.speedKmh, p.directionDeg, p.gustKmh)}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-colors border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-400 font-medium shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Interactive Wind Speed Slider */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-slate-400 text-[11px] font-medium whitespace-nowrap">Speed:</span>
              <input
                type="range"
                min="0"
                max="60"
                value={wind.speedKmh}
                onChange={(e) => windTelemetryService.setWind(Number(e.target.value), wind.directionDeg)}
                className="w-32 accent-sky-500 cursor-pointer"
              />
              <span className="w-16 font-mono tabular-nums text-sky-400 text-right">{wind.speedKmh} km/h</span>
            </div>
          </div>
        )}
      </div>

      {/* Drone Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {drones.map((drone) => {
          const isOffline = drone.status === 'OFFLINE_WAITING';
          const isInFlight = drone.status === 'IN_FLIGHT';
          const isBusy = signalingDrone === drone.droneId;
          const isCriticalBattery = drone.batteryPercent < 15;
          const metrics = computePredictiveMetrics(drone, wind);
          const hasDeficit = metrics.isReturnTimeExceedsBattery;

          return (
            <div
              key={drone.droneId}
              className={`flex flex-col justify-between p-4 rounded-xl border transition-colors bg-[#090e1a]/90 backdrop-blur-sm ${
                hasDeficit || isCriticalBattery
                  ? 'border-red-500/60 bg-red-950/20'
                  : !metrics.canReachHomeSafely
                  ? 'border-amber-500/50 bg-amber-950/15'
                  : isOffline
                  ? 'border-rose-800/40'
                  : isInFlight
                  ? 'border-sky-800/40'
                  : 'border-slate-800/80 hover:border-slate-700/80'
              }`}
            >
              <div>
                {/* Card Top: Drone ID + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-white">
                        {drone.droneId}
                      </span>
                      <span className="text-xs text-slate-400">
                        {drone.model}
                      </span>
                    </div>

                    {/* Human-readable place location */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onInspectLocation) onInspectLocation(drone);
                      }}
                      className="mt-1 flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors text-left group/place"
                      title="Inspect place location details"
                    >
                      <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate max-w-[170px] underline decoration-sky-500/30 underline-offset-2">
                        {getNearestPlace(drone.currentLocation.latitude, drone.currentLocation.longitude).formattedLocation}
                      </span>
                    </button>
                  </div>

                  {/* Clean Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                      hasDeficit
                        ? 'text-red-300 bg-red-500/15 border-red-500/30'
                        : isCriticalBattery
                        ? 'text-red-300 bg-red-500/15 border-red-500/30'
                        : !metrics.canReachHomeSafely
                        ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                        : isOffline
                        ? 'text-rose-300 bg-rose-500/10 border-rose-500/20'
                        : isInFlight
                        ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
                        : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasDeficit || isCriticalBattery
                          ? 'bg-red-400'
                          : !metrics.canReachHomeSafely
                          ? 'bg-amber-400'
                          : isOffline
                          ? 'bg-rose-400'
                          : isInFlight
                          ? 'bg-sky-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span>
                      {hasDeficit
                        ? 'Wind Deficit'
                        : isCriticalBattery
                        ? 'Low Battery'
                        : !metrics.canReachHomeSafely
                        ? 'Unsafe RTB'
                        : isOffline
                        ? 'Offline'
                        : isInFlight
                        ? 'In Flight'
                        : 'Available'}
                    </span>
                  </span>
                </div>

                {/* Battery Meter */}
                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-slate-400" />
                      <span>Battery Capacity</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-semibold ${
                          hasDeficit || isCriticalBattery
                            ? 'text-red-400'
                            : drone.batteryPercent > 50
                            ? 'text-emerald-400'
                            : drone.batteryPercent > 20
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {drone.batteryPercent}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        · TTE: ~{metrics.formattedTTE}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hasDeficit || isCriticalBattery
                          ? 'bg-red-500'
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

                {/* Integrated Flight Telemetry & Return Analytics (Flat, clean, unboxed) */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Speed / Alt</span>
                    <span className="text-slate-200">
                      {drone.speedKmh || 0} km/h · {drone.altitudeMeters || 0}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Return (Wind)</span>
                    <span className={hasDeficit ? 'text-red-400 font-semibold' : 'text-slate-200'}>
                      ~{metrics.timeToHomeMinutes}m
                      {metrics.headwindKmh > 0 && (
                        <span className="text-[10px] text-amber-400 font-normal ml-1">
                          (-{metrics.headwindKmh}km/h)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Return Safety Indicator Line */}
                <div className="mt-2 text-[11px]">
                  {hasDeficit ? (
                    <div className="flex items-center gap-1 text-red-300 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Exceeds endurance · Deficit -{metrics.timeDeficitMinutes}m</span>
                    </div>
                  ) : !metrics.canReachHomeSafely ? (
                    <div className="flex items-center gap-1 text-amber-300 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Low reserve return · Hub {metrics.distToHomeKm} km</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Safe RTB · Margin +{Math.max(0, metrics.minutesToEmpty - metrics.timeToHomeMinutes)}m</span>
                    </div>
                  )}
                </div>

                {/* Assigned Mission link */}
                {drone.currentMissionId && (
                  <div className="mt-2.5">
                    <button
                      onClick={() => {
                        if (onSelectMission && drone.currentMissionId) {
                          onSelectMission(drone.currentMissionId);
                        }
                      }}
                      className="w-full flex items-center justify-between py-1 px-2 rounded-md bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-mono tabular-nums text-sky-300 hover:text-sky-200 transition-colors group"
                    >
                      <span className="truncate">Mission: {drone.currentMissionId}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300 transition-colors shrink-0" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-2">
                {!isOffline ? (
                  <button
                    disabled={isBusy}
                    onClick={() => handleOffline(drone.droneId)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/50 transition-colors disabled:opacity-40"
                    title="Simulate drone disconnection signal to Temporal workflow"
                  >
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isBusy ? 'Signaling...' : 'Simulate Offline'}</span>
                  </button>
                ) : (
                  <button
                    disabled={isBusy}
                    onClick={() => handleReconnect(drone.droneId)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 transition-colors disabled:opacity-40"
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
    </div>
  );
};
