import React from 'react';
import type { Drone } from '../../types';
import { getNearestPlace } from '../../services/landmarks';
import {
  MapPin,
  X,
  Compass,
  Plane,
  Building2,
  Camera,
} from 'lucide-react';

interface DroneLocationModalProps {
  drone: Drone | null;
  onClose: () => void;
  onViewCamera?: (droneId: string) => void;
  onTrackOnRadar?: (droneId: string) => void;
}

export const DroneLocationModal: React.FC<DroneLocationModalProps> = ({
  drone,
  onClose,
  onViewCamera,
}) => {
  if (!drone) return null;

  const placeInfo = getNearestPlace(
    drone.currentLocation.latitude,
    drone.currentLocation.longitude
  );

  const isCriticalBattery = drone.batteryPercent < 15;
  const isOffline = drone.status === 'OFFLINE_WAITING';
  const isInFlight = drone.status === 'IN_FLIGHT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#080d1a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <MapPin className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono-numbers">
                  {drone.droneId} Live Location
                </h3>
                <span className="text-[10px] text-slate-400 font-sans">
                  · {drone.model}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-numbers">
                Telemetry synchronized via 5.8 GHz Link
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-mono-numbers">
          {/* Prominent Place Location Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/50 via-slate-900/60 to-slate-900/40 border border-sky-500/30 shadow-inner">
            <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider block mb-1">
              CURRENT ESTIMATED LANDMARK PROXIMITY
            </span>
            <div className="flex items-start gap-2.5 text-white">
              <MapPin className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-base font-bold text-sky-200 font-sans">
                  {placeInfo.formattedLocation}
                </h4>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  {placeInfo.landmark.description}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-950/70 border border-sky-800/50 text-[10px] text-sky-300">
                  <Building2 className="w-3 h-3" />
                  <span>{placeInfo.zone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">EXACT GPS LATITUDE</span>
              <span className="text-slate-100 font-semibold text-xs">
                {drone.currentLocation.latitude.toFixed(6)}° N
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">EXACT GPS LONGITUDE</span>
              <span className="text-slate-100 font-semibold text-xs">
                {drone.currentLocation.longitude.toFixed(6)}° E
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">ALTITUDE (AGL)</span>
              <span className="text-slate-100 font-semibold text-xs">
                {drone.altitudeMeters || 0} meters
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">GROUND SPEED</span>
              <span className="text-slate-100 font-semibold text-xs">
                {drone.speedKmh || 0} km/h
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">BEARING / HEADING</span>
              <span className="text-sky-300 font-semibold text-xs flex items-center gap-1">
                <Compass className="w-3 h-3" />
                <span>{drone.headingDeg || 0}° ({placeInfo.direction})</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">BATTERY RESERVE</span>
              <span
                className={`font-semibold text-xs ${
                  isCriticalBattery
                    ? 'text-red-400 font-bold animate-pulse'
                    : drone.batteryPercent > 50
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {drone.batteryPercent}%
              </span>
            </div>
          </div>

          {/* Proximity Details */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Nearest Landmark:</span>
              <span className="text-white font-semibold">{placeInfo.placeName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Proximity Offset:</span>
              <span className="text-sky-300 font-semibold">
                {placeInfo.distanceMeters} meters away ({placeInfo.direction})
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Operational Flight State:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isInFlight
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : isOffline
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {drone.status}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-400 font-mono-numbers">
            Station Hub: <strong>Dispatch Hub Alpha</strong>
          </div>

          <div className="flex items-center gap-2">
            {onViewCamera && (
              <button
                onClick={() => {
                  onViewCamera(drone.droneId);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>View Optical Feed</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
