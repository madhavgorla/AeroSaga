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
  Wifi,
  WifiOff,
  Plane,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  MapPin,
  Wind,
  Sliders,
  Check,
  CheckSquare,
  Square,
  X,
  Loader2,
  Send,
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

  // Calculate wind components along return flight corridor
  const { headwindKmh, crosswindKmh } = calculateWindComponents(
    wind.speedKmh,
    wind.directionDeg,
    returnBearingDeg
  );

  // Cruise air speed specification based on drone model
  const cruiseAirSpeedKmh =
    drone.model === 'HexaRotor Scout'
      ? 55
      : drone.model === 'OctoPayload Cargo'
      ? 45
      : 50;

  // Ground speed on return corridor adjusted for headwind or tailwind
  const effectiveReturnSpeedKmh = Math.max(15, cruiseAirSpeedKmh - headwindKmh);

  // Flight time required to return to Dispatch Hub Alpha
  const nominalHours = distToHomeKm / cruiseAirSpeedKmh;
  const nominalTimeToHomeMinutes = Math.round(nominalHours * 60);

  const windAdjustedHours = distToHomeKm / effectiveReturnSpeedKmh;
  const timeToHomeMinutes = Math.max(
    1,
    Math.round(windAdjustedHours * 60)
  );
  const windDelayMinutes = Math.max(
    0,
    timeToHomeMinutes - nominalTimeToHomeMinutes
  );

  // Dynamic discharge rate calculation
  const isLoaded = Boolean(drone.currentMissionId);
  const baseBurnRate = isLoaded ? 1.4 : 1.1; // % battery consumed per minute
  const headwindExtraBurn =
    headwindKmh > 0 ? (headwindKmh / cruiseAirSpeedKmh) * 0.4 : 0;
  const burnRatePerMin = Number(
    (baseBurnRate + headwindExtraBurn).toFixed(2)
  );

  // Battery required for safe return + 10% statutory reserve
  const rawBatteryNeeded = timeToHomeMinutes * burnRatePerMin;
  const batteryRequiredForRTB = Math.min(
    100,
    Math.round(rawBatteryNeeded + 10)
  );

  // Minutes of battery endurance remaining
  const minutesToEmpty = Math.max(
    0,
    Math.floor(drone.batteryPercent / burnRatePerMin)
  );
  const tteHours = Math.floor(minutesToEmpty / 60);
  const tteMins = minutesToEmpty % 60;
  const formattedTTE =
    tteHours > 0 ? `${tteHours}h ${tteMins}m` : `${tteMins}m`;

  // Safety evaluations
  const canReachHomeSafely = drone.batteryPercent >= batteryRequiredForRTB;
  const isReturnTimeExceedsBattery = timeToHomeMinutes > minutesToEmpty;

  const batteryDeficit = Math.max(
    0,
    batteryRequiredForRTB - drone.batteryPercent
  );
  const timeDeficitMinutes = Math.max(
    0,
    timeToHomeMinutes - minutesToEmpty
  );

  return {
    burnRatePerMin,
    minutesToEmpty,
    formattedTTE,
    distToHomeKm: Number(distToHomeKm.toFixed(1)),
    returnBearingDeg,
    headwindKmh,
    crosswindKmh,
    effectiveReturnSpeedKmh: Math.round(effectiveReturnSpeedKmh),
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
  onSignalReturnToHome?: (droneId: string) => Promise<void>;
  onBulkSignalOffline?: (droneIds: string[]) => Promise<void>;
  onBulkReturnToHome?: (droneIds: string[]) => Promise<void>;
  onBulkSignalReconnect?: (droneIds: string[]) => Promise<void>;
  onSelectMission?: (missionId: string) => void;
  onSimulateBatteryDrain?: (droneId: string, percent: number) => void;
  onInspectLocation?: (drone: Drone) => void;
}

export const DroneFleetGrid: React.FC<DroneFleetGridProps> = ({
  drones,
  onSignalOffline,
  onSignalReconnect,
  onSignalReturnToHome,
  onBulkSignalOffline,
  onBulkReturnToHome,
  onBulkSignalReconnect,
  onSelectMission,
  onSimulateBatteryDrain,
  onInspectLocation,
}) => {
  const { showToast } = useToast();
  const alertedDronesRef = useRef<Set<string>>(new Set());
  const [signalingDrone, setSignalingDrone] = useState<string | null>(null);

  // Checkbox selection state for bulk actions
  const [selectedDroneIds, setSelectedDroneIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState<boolean>(false);

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

  // Predictive Safety Monitor
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

  const toggleSelectDrone = (droneId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDroneIds((prev) => {
      const next = new Set(prev);
      if (next.has(droneId)) {
        next.delete(droneId);
      } else {
        next.add(droneId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDroneIds.size === drones.length) {
      setSelectedDroneIds(new Set());
    } else {
      setSelectedDroneIds(new Set(drones.map((d) => d.droneId)));
    }
  };

  const handleClearSelection = () => {
    setSelectedDroneIds(new Set());
  };

  const handleBulkReturnToHomeAction = async () => {
    if (selectedDroneIds.size === 0) return;
    const ids = Array.from(selectedDroneIds);
    setIsBulkActing(true);
    try {
      if (onBulkReturnToHome) {
        await onBulkReturnToHome(ids);
      } else if (onSignalReturnToHome) {
        await Promise.all(ids.map((id) => onSignalReturnToHome(id)));
      }
      setSelectedDroneIds(new Set());
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Bulk RTB Failed',
        description: err instanceof Error ? err.message : 'Could not execute return to home',
      });
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleBulkOfflineAction = async () => {
    if (selectedDroneIds.size === 0) return;
    const ids = Array.from(selectedDroneIds);
    setIsBulkActing(true);
    try {
      if (onBulkSignalOffline) {
        await onBulkSignalOffline(ids);
      } else {
        await Promise.all(ids.map((id) => onSignalOffline(id)));
      }
      setSelectedDroneIds(new Set());
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Bulk Offline Failed',
        description: err instanceof Error ? err.message : 'Could not signal offline',
      });
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleBulkReconnectAction = async () => {
    if (selectedDroneIds.size === 0) return;
    const ids = Array.from(selectedDroneIds);
    setIsBulkActing(true);
    try {
      if (onBulkSignalReconnect) {
        await onBulkSignalReconnect(ids);
      } else {
        await Promise.all(ids.map((id) => onSignalReconnect(id)));
      }
      setSelectedDroneIds(new Set());
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Bulk Reconnect Failed',
        description: err instanceof Error ? err.message : 'Could not reconnect',
      });
    } finally {
      setIsBulkActing(false);
    }
  };

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

  const handleRTB = async (droneId: string) => {
    if (!onSignalReturnToHome) return;
    setSignalingDrone(droneId);
    try {
      await onSignalReturnToHome(droneId);
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
    <div className="space-y-4 relative pb-16">
      {/* Live Atmospheric Wind Telemetry Ribbon */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col gap-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
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

      {/* Grid Header & Bulk Select Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSelectAll}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              selectedDroneIds.size === drones.length && drones.length > 0
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            {selectedDroneIds.size === drones.length && drones.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-sky-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {selectedDroneIds.size === drones.length
                ? 'Deselect All'
                : 'Select All Drones'}
            </span>
          </button>

          {selectedDroneIds.size > 0 && (
            <span className="text-xs font-mono-numbers text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-xl">
              {selectedDroneIds.size} of {drones.length} Selected
            </span>
          )}
        </div>

        <div className="text-xs font-mono text-slate-400">
          Click checkbox or card to multi-select for bulk commands
        </div>
      </div>

      {/* Drone Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {drones.map((drone) => {
          const isSelected = selectedDroneIds.has(drone.droneId);
          const isOffline = drone.status === 'OFFLINE_WAITING';
          const isInFlight = drone.status === 'IN_FLIGHT';
          const isBusy = signalingDrone === drone.droneId;
          const isCriticalBattery = drone.batteryPercent < 15;
          const metrics = computePredictiveMetrics(drone, wind);
          const hasDeficit = metrics.isReturnTimeExceedsBattery;

          return (
            <div
              key={drone.droneId}
              onClick={() => toggleSelectDrone(drone.droneId)}
              className={`flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
                isSelected
                  ? 'ring-2 ring-sky-500 border-sky-400/80 bg-sky-950/30 shadow-lg shadow-sky-950/40'
                  : hasDeficit || isCriticalBattery
                  ? 'border-red-500/60 bg-red-950/20 hover:border-red-400/70'
                  : !metrics.canReachHomeSafely
                  ? 'border-amber-500/50 bg-amber-950/15 hover:border-amber-400/70'
                  : isOffline
                  ? 'border-rose-800/40 bg-slate-900/60 hover:border-rose-700/60'
                  : isInFlight
                  ? 'border-sky-800/40 bg-slate-900/60 hover:border-sky-700/60'
                  : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80'
              }`}
            >
              <div>
                {/* Card Top: Checkbox + Drone ID + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Custom Styled Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelectDrone(drone.droneId, e)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? 'bg-sky-600 border-sky-400 text-white shadow-sm'
                          : 'border-slate-700 bg-slate-900/80 hover:border-sky-500/60 text-transparent'
                      }`}
                      title={isSelected ? `Deselect ${drone.droneId}` : `Select ${drone.droneId}`}
                      aria-label={`Select ${drone.droneId}`}
                    >
                      <Check className={`w-3.5 h-3.5 transition-opacity ${isSelected ? 'opacity-100 stroke-[3]' : 'opacity-0'}`} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-white truncate">
                          {drone.droneId}
                        </span>
                        <span className="text-xs text-slate-400 truncate hidden sm:inline">
                          {drone.model}
                        </span>
                      </div>

                      {/* Human-readable place location */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onInspectLocation) onInspectLocation(drone);
                        }}
                        className="mt-0.5 flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors text-left group/place"
                        title="Inspect place location details"
                      >
                        <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="truncate max-w-[150px] underline decoration-sky-500/30 underline-offset-2">
                          {getNearestPlace(drone.currentLocation.latitude, drone.currentLocation.longitude).formattedLocation}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border shrink-0 ${
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

                {/* Integrated Flight Telemetry & Return Analytics */}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectMission && drone.currentMissionId) {
                          onSelectMission(drone.currentMissionId);
                        }
                      }}
                      className="w-full flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-mono tabular-nums text-sky-300 hover:text-sky-200 transition-colors group"
                    >
                      <span className="truncate">Mission: {drone.currentMissionId}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300 transition-colors shrink-0" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div
                className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {!isOffline ? (
                  <button
                    disabled={isBusy}
                    onClick={() => handleOffline(drone.droneId)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/50 transition-colors disabled:opacity-40"
                    title="Simulate drone disconnection signal to Temporal workflow"
                  >
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isBusy ? 'Signaling...' : 'Signal Offline'}</span>
                  </button>
                ) : (
                  <button
                    disabled={isBusy}
                    onClick={() => handleReconnect(drone.droneId)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 transition-colors disabled:opacity-40"
                    title="Signal drone reconnected to resume Temporal workflow"
                  >
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBusy ? 'Signaling...' : 'Reconnect'}</span>
                  </button>
                )}

                {onSignalReturnToHome && (
                  <button
                    disabled={isBusy}
                    onClick={() => handleRTB(drone.droneId)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-sky-300 hover:text-white bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/50 transition-colors disabled:opacity-40 shrink-0"
                    title="Return this drone to Dispatch Hub Alpha"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                    <span>RTB</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Toolbar for Bulk Selection */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
          selectedDroneIds.size > 0
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-[#090f20]/95 backdrop-blur-xl border border-sky-500/40 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center gap-3 text-xs text-white">
          {/* Left Count & Clear */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
            <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[11px] font-bold font-mono flex items-center justify-center">
              {selectedDroneIds.size}
            </div>
            <span className="font-semibold text-slate-200 whitespace-nowrap">
              {selectedDroneIds.size === 1 ? 'Drone' : 'Drones'} Selected
            </span>
            <button
              onClick={handleClearSelection}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Return to Home Action */}
            <button
              disabled={isBulkActing}
              onClick={handleBulkReturnToHomeAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 whitespace-nowrap"
              title="Command selected drones to Return to Home (RTB)"
            >
              {isBulkActing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Return to Home</span>
            </button>

            {/* Signal Offline Action */}
            <button
              disabled={isBulkActing}
              onClick={handleBulkOfflineAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-slate-200 hover:text-rose-300 border border-slate-700 hover:border-rose-700/60 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              title="Signal offline / simulate signal loss for selected drones"
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Signal Offline</span>
            </button>

            {/* Reconnect Action */}
            <button
              disabled={isBulkActing}
              onClick={handleBulkReconnectAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950/70 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-700/60 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              title="Signal reconnected for selected drones"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reconnect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
