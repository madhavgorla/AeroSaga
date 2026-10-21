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
      {/* Live Atmospheric Wind Telemetry Ribbon & Interactive Wind Controller */}
      <div className="p-3.5 rounded-2xl bg-[#080d1a]/95 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Wind className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-numbers font-bold text-white uppercase tracking-wider">
                  ATMOSPHERIC WIND TELEMETRY
                </span>
                <span className="flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-mono-numbers font-bold bg-sky-950 border border-sky-800 text-sky-300">
                  <Activity className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
                  <span>SONIC ANEMOMETER LINK</span>
                </span>
                {windDeficitDrones.length > 0 && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-mono-numbers font-bold bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse">
                    ⚠️ {windDeficitDrones.length} RTB WIND DEFICIT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-mono-numbers mt-0.5">
                Current: <strong className="text-white">{wind.speedKmh} km/h</strong> from{' '}
                <strong className="text-sky-300">{wind.directionCardinal} ({wind.directionDeg}°)</strong> · Gusts:{' '}
                <strong className="text-amber-300">{wind.gustKmh} km/h</strong> · Turbulence:{' '}
                <strong className={wind.turbulenceLevel === 'SEVERE' ? 'text-red-400' : 'text-emerald-400'}>
                  {wind.turbulenceLevel}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWindControls(!showWindControls)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-numbers transition-colors border ${
                showWindControls
                  ? 'bg-sky-600 text-white border-sky-500 font-bold shadow-sm'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500'
              }`}
              title="Toggle wind speed simulator presets"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulate Wind Telemetry</span>
            </button>
          </div>
        </div>

        {/* Expandable Wind Simulation Controls */}
        {showWindControls && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-numbers animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-[11px]">WIND PRESETS:</span>
              {WIND_PRESETS.map((p) => {
                const isSelected = Math.abs(wind.speedKmh - p.speedKmh) < 2;
                return (
                  <button
                    key={p.id}
                    onClick={() => windTelemetryService.setWind(p.speedKmh, p.directionDeg, p.gustKmh)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-400 font-bold shadow-sm'
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
              <span className="text-slate-400 text-[11px] whitespace-nowrap">SPEED SLIDER:</span>
              <input
                type="range"
                min="0"
                max="60"
                value={wind.speedKmh}
                onChange={(e) => windTelemetryService.setWind(Number(e.target.value), wind.directionDeg)}
                className="w-36 accent-sky-500 cursor-pointer"
              />
              <span className="w-16 font-bold text-sky-400 text-right">{wind.speedKmh} km/h</span>
            </div>
          </div>
        )}
      </div>

      {/* Drone Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {drones.map((drone) => {
          const isOffline = drone.status === 'OFFLINE_WAITING';
          const isInFlight = drone.status === 'IN_FLIGHT';
          const isBusy = signalingDrone === drone.droneId;
          const isCriticalBattery = drone.batteryPercent < 15;
          const metrics = computePredictiveMetrics(drone, wind);

          return (
            <div
              key={drone.droneId}
              className={`flex flex-col justify-between p-4.5 rounded-2xl border transition-all backdrop-blur-sm relative overflow-hidden ${
                metrics.isReturnTimeExceedsBattery
                  ? 'bg-red-950/40 border-red-500/90 shadow-[0_0_26px_rgba(239,68,68,0.4)] ring-2 ring-red-500/70'
                  : !metrics.canReachHomeSafely
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
              {/* Ambient Alert Glow Background for wind deficit or critical battery */}
              {(metrics.isReturnTimeExceedsBattery || isCriticalBattery) && (
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-600/25 rounded-full blur-2xl pointer-events-none" />
              )}

              <div>
                {/* PREDICTIVE WIND-ADJUSTED RTB ALERT BANNER */}
                {metrics.isReturnTimeExceedsBattery ? (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/25 border border-red-500/80 flex flex-col gap-1 text-red-200 text-xs font-mono-numbers shadow-lg animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-red-300">
                        <Wind className="w-4 h-4 text-red-400 shrink-0" />
                        <span>RETURN TIME EXCEEDS BATTERY</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-red-900 text-white text-[9px] font-bold uppercase tracking-wider">
                        DEFICIT -{metrics.timeDeficitMinutes}M
                      </span>
                    </div>
                    <p className="text-[10px] text-red-100 font-sans leading-tight">
                      Return flight time (<strong>{metrics.timeToHomeMinutes}m</strong> into{' '}
                      <strong>{metrics.headwindKmh > 0 ? `${metrics.headwindKmh} km/h headwind` : `${wind.speedKmh} km/h wind`}</strong>)
                      exceeds battery capacity (<strong>{metrics.minutesToEmpty}m</strong>).
                    </p>
                  </div>
                ) : !metrics.canReachHomeSafely ? (
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

                    {/* Clickable Place Location Tag */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onInspectLocation) onInspectLocation(drone);
                      }}
                      className="mt-1 flex items-center gap-1 text-[11px] font-sans font-medium text-sky-300 hover:text-white transition-colors text-left group/place"
                      title="Click to view place location details"
                    >
                      <MapPin className="w-3 h-3 text-sky-400 shrink-0 group-hover/place:scale-110 transition-transform" />
                      <span className="truncate max-w-[170px] underline decoration-sky-500/40 underline-offset-2">
                        {getNearestPlace(drone.currentLocation.latitude, drone.currentLocation.longitude).formattedLocation}
                      </span>
                    </button>
                  </div>

                  {/* Status indicator pill */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono-numbers border ${
                      metrics.isReturnTimeExceedsBattery
                        ? 'text-red-300 bg-red-500/25 border-red-500/70 animate-pulse font-bold'
                        : !metrics.canReachHomeSafely || isCriticalBattery
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
                        metrics.isReturnTimeExceedsBattery
                          ? 'bg-red-400 animate-ping'
                          : !metrics.canReachHomeSafely || isCriticalBattery
                          ? 'bg-red-400 animate-ping'
                          : isOffline
                          ? 'bg-rose-400 animate-pulse'
                          : isInFlight
                          ? 'bg-sky-400 animate-pulse'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span>
                      {metrics.isReturnTimeExceedsBattery
                        ? 'Wind Deficit'
                        : !metrics.canReachHomeSafely
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
                      {metrics.isReturnTimeExceedsBattery || isCriticalBattery ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Battery className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>BATTERY CAPACITY</span>
                    </span>

                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        metrics.isReturnTimeExceedsBattery
                          ? 'text-red-400 font-bold animate-pulse'
                          : drone.batteryPercent > 50
                          ? 'text-emerald-400'
                          : drone.batteryPercent > 20
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {drone.batteryPercent}%
                      {metrics.isReturnTimeExceedsBattery ? (
                        <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider">
                          (DEFICIT)
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
                        metrics.isReturnTimeExceedsBattery || isCriticalBattery
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

                {/* WIND-ADJUSTED RETURN FLIGHT PREDICTIVE MODULE */}
                <div
                  className={`mt-3 p-2.5 rounded-xl border text-xs font-mono-numbers space-y-1.5 transition-colors ${
                    metrics.isReturnTimeExceedsBattery
                      ? 'bg-red-950/50 border-red-500/80 shadow-md'
                      : !metrics.canReachHomeSafely
                      ? 'bg-red-950/40 border-red-500/70 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800/70'
                  }`}
                >
                  {/* Estimated Return Flight Time vs Time to Empty */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Wind className="w-3.5 h-3.5 text-sky-400" />
                      <span>EST. RETURN TIME (WIND):</span>
                    </span>
                    <span
                      className={`font-bold ${
                        metrics.isReturnTimeExceedsBattery
                          ? 'text-red-400 animate-pulse'
                          : 'text-slate-100'
                      }`}
                    >
                      ~{metrics.timeToHomeMinutes} mins
                      {metrics.windDelayMinutes > 0 && (
                        <span className="text-[10px] text-amber-400 font-normal ml-1">
                          (+{metrics.windDelayMinutes}m wind)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Timer className="w-3.5 h-3.5 text-sky-400" />
                      <span>BATTERY ENDURANCE (TTE):</span>
                    </span>
                    <span
                      className={`font-bold ${
                        metrics.isReturnTimeExceedsBattery
                          ? 'text-red-400 animate-pulse'
                          : metrics.minutesToEmpty < 20
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      ~{metrics.formattedTTE}
                    </span>
                  </div>

                  {/* Wind Component Breakdown */}
                  <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {metrics.headwindKmh > 0 ? (
                        <span className="text-amber-300 font-semibold">
                          HEADWIND: -{metrics.headwindKmh} km/h
                        </span>
                      ) : metrics.headwindKmh < 0 ? (
                        <span className="text-emerald-300 font-semibold">
                          TAILWIND: +{Math.abs(metrics.headwindKmh)} km/h
                        </span>
                      ) : (
                        <span>CROSSWIND: {metrics.crosswindKmh} km/h</span>
                      )}
                    </span>
                    <span>HUB DIST: {metrics.distToHomeKm} km</span>
                  </div>

                  {/* Predictive Alert Status Ribbon */}
                  <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between">
                    {metrics.isReturnTimeExceedsBattery ? (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>EXCEEDS CAPACITY · Deficit -{metrics.timeDeficitMinutes}m ({metrics.batteryDeficit}%)</span>
                      </span>
                    ) : metrics.canReachHomeSafely ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>SAFE RTB · Margin +{Math.max(0, metrics.minutesToEmpty - metrics.timeToHomeMinutes)}m</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>LOW RESERVE RTB</span>
                      </span>
                    )}

                    {metrics.isReturnTimeExceedsBattery && (
                      <span className="px-1.5 py-0.2 rounded bg-red-900/90 text-[9px] text-red-200 font-bold uppercase tracking-wider">
                        CRITICAL
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
    </div>
  );
};
