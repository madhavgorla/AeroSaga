import React, { useState, useEffect, useRef } from 'react';
import type { Mission, Waypoint } from '../../types';
import { Modal } from '../ui/Modal';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Download,
  Gauge,
  Compass,
  Battery,
  Radio,
  MapPin,
  CheckCircle2,
  Plane,
} from 'lucide-react';

interface FlightReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
}

export const FlightReplayModal: React.FC<FlightReplayModalProps> = ({
  isOpen,
  onClose,
  mission,
}) => {
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Reset progress when mission changes
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
  }, [mission]);

  // Animation loop for playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current != null) {
        const delta = time - lastTimeRef.current;
        // 100% in ~12 seconds at 1x
        const increment = (delta / 12000) * 100 * playbackSpeed;
        setProgress((prev) => {
          const next = prev + increment;
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  if (!mission) return null;

  // Calculate simulated telemetry based on progress
  const speed = Math.round(38 + Math.sin(progress / 10) * 8); // 30-46 km/h
  const altitude = Math.round(
    progress < 10
      ? (progress / 10) * 45
      : progress > 90
      ? ((100 - progress) / 10) * 45
      : 45 + Math.sin(progress / 5) * 4
  ); // 0m to 48m AGL
  const battery = Math.max(
    12,
    Math.round(98 - (progress / 100) * (mission.payloadKg ? 24 : 16))
  );
  const latencyMs = Math.round(18 + Math.sin(progress / 7) * 9);
  const heading = Math.round((45 + progress * 2.8) % 360);

  // Compute current waypoint
  const waypoints = mission.waypoints || [];
  const currentWpIndex = Math.min(
    waypoints.length - 1,
    Math.floor((progress / 100) * (waypoints.length || 1))
  );
  const currentWp = waypoints[currentWpIndex];

  const handleExportJSON = () => {
    const flightData = {
      missionId: mission.missionId,
      workflowId: mission.workflowId,
      droneId: mission.droneId,
      destination: mission.destination,
      recordedAt: new Date().toISOString(),
      sampleRateHz: 10,
      telemetry: {
        currentSpeedKmh: speed,
        altitudeMeters: altitude,
        batteryPercent: battery,
        latencyMs,
        headingDegrees: heading,
      },
      waypoints: mission.waypoints,
    };

    const blob = new Blob([JSON.stringify(flightData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight-blackbox-${mission.missionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Flight Data Recorder (Blackbox) — ${mission.missionId}`}
      subtitle={`Mission Replay & Telemetry Scrub for Drone ${mission.droneId} ➔ ${mission.destination}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Telemetry Gauge Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-numbers">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">AIRSPEED</span>
            <div className="text-xl font-bold text-sky-400 flex items-center justify-center gap-1">
              <span>{speed}</span>
              <span className="text-xs text-slate-400 font-normal font-sans">km/h</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">ALTITUDE AGL</span>
            <div className="text-xl font-bold text-white flex items-center justify-center gap-1">
              <span>{altitude}</span>
              <span className="text-xs text-slate-400 font-normal font-sans">m</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">BATTERY</span>
            <div className="text-xl font-bold text-emerald-400 flex items-center justify-center gap-1">
              <span>{battery}</span>
              <span className="text-xs text-slate-400 font-normal font-sans">%</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block mb-1">BEARING</span>
            <div className="text-xl font-bold text-purple-400 flex items-center justify-center gap-1">
              <span>{heading}°</span>
              <span className="text-xs text-slate-400 font-normal font-sans">HDG</span>
            </div>
          </div>
        </div>

        {/* Progress & Route Scrubber */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono-numbers">
            <span className="text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {progress < 5
                  ? 'Dispatch Hub Alpha'
                  : progress > 95
                  ? mission.destination
                  : `Approaching ${currentWp?.name || `Waypoint #${currentWpIndex + 1}`}`}
              </span>
            </span>
            <span className="font-semibold text-slate-200">
              {Math.round(progress)}% Completed
            </span>
          </div>

          {/* Scrubber slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Timeline markers */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers px-1">
            <span>00:00 (Launch)</span>
            <span>06:00 (Cruising)</span>
            <span>12:00 (Touchdown)</span>
          </div>
        </div>

        {/* Playback Controls & Speed */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 text-xs transition-colors shadow-sm"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setProgress(0);
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs transition-colors"
              title="Reset to 0%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Playback speed switcher */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-mono-numbers">
              {([1, 2, 5] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Export Blackbox Button */}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Blackbox JSON</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
