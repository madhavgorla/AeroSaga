import React, { useState } from 'react';
import type { Drone, Waypoint } from '../../types';
import { Modal } from '../ui/Modal';
import { Plane, MapPin, Plus, Trash2, ArrowUpRight } from 'lucide-react';

interface LaunchMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  drones: Drone[];
  onSubmit: (data: {
    droneId: string;
    destination: string;
    waypoints: Waypoint[];
  }) => Promise<void>;
}

const PRESET_DESTINATIONS = [
  {
    name: 'Warehouse B',
    waypoints: [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.52, longitude: 80.63, name: 'Warehouse B' },
    ],
  },
  {
    name: 'Sector 4 Coastal Depot',
    waypoints: [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.512, longitude: 80.642, name: 'Midway Checkpoint C1' },
      { latitude: 16.528, longitude: 80.621, name: 'Sector 4 Coastal Depot' },
    ],
  },
  {
    name: 'Metro Emergency Clinic',
    waypoints: [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.519, longitude: 80.655, name: 'Metro Emergency Clinic' },
    ],
  },
  {
    name: 'North Airfield Staging',
    waypoints: [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.534, longitude: 80.641, name: 'North Airfield Staging' },
    ],
  },
];

export const LaunchMissionModal: React.FC<LaunchMissionModalProps> = ({
  isOpen,
  onClose,
  drones,
  onSubmit,
}) => {
  const [selectedDrone, setSelectedDrone] = useState<string>(
    drones.find((d) => d.status === 'AVAILABLE')?.droneId || drones[0]?.droneId || 'DRONE-001'
  );
  const [destination, setDestination] = useState<string>('Warehouse B');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
    { latitude: 16.52, longitude: 80.63, name: 'Warehouse B' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPreset = (preset: (typeof PRESET_DESTINATIONS)[0]) => {
    setDestination(preset.name);
    setWaypoints([...preset.waypoints]);
  };

  const handleAddWaypoint = () => {
    setWaypoints((prev) => [
      ...prev,
      {
        latitude: Number((16.51 + Math.random() * 0.02).toFixed(4)),
        longitude: Number((80.63 + Math.random() * 0.02).toFixed(4)),
        name: `Waypoint ${prev.length + 1}`,
      },
    ]);
  };

  const handleRemoveWaypoint = (index: number) => {
    if (waypoints.length <= 2) {
      setError('A mission requires at least a dispatch hub and target waypoint.');
      return;
    }
    setError(null);
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Destination name is required.');
      return;
    }
    if (waypoints.length < 2) {
      setError('At least 2 waypoints required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        droneId: selectedDrone,
        destination,
        waypoints,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Launch Autonomous Mission"
      subtitle="Creates a mission record and starts a durable Temporal workflow."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Drone Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono-numbers">
            SELECT DRONE
          </label>
          <select
            value={selectedDrone}
            onChange={(e) => setSelectedDrone(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono-numbers"
          >
            {drones.map((d) => (
              <option key={d.droneId} value={d.droneId}>
                {d.droneId} ({d.model}) — {d.status} ({d.batteryPercent}% bat)
              </option>
            ))}
          </select>
        </div>

        {/* Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono-numbers">
            QUICK TARGET PRESETS
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_DESTINATIONS.map((preset) => (
              <button
                type="button"
                key={preset.name}
                onClick={() => handleSelectPreset(preset)}
                className={`p-2 rounded-lg text-left text-xs border transition-colors ${
                  destination === preset.name
                    ? 'bg-sky-950/50 border-sky-500/80 text-sky-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <div className="font-semibold">{preset.name}</div>
                <div className="text-[10px] text-slate-400 font-mono-numbers">
                  {preset.waypoints.length} waypoints
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Destination Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono-numbers">
            DESTINATION NAME
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Warehouse B"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            required
          />
        </div>

        {/* Waypoints List */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 font-mono-numbers">
              WAYPOINT SEQUENCE ({waypoints.length})
            </label>
            <button
              type="button"
              onClick={handleAddWaypoint}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Waypoint</span>
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {waypoints.map((wp, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono-numbers"
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={wp.name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWaypoints((prev) =>
                      prev.map((w, i) => (i === idx ? { ...w, name: val } : w))
                    );
                  }}
                  placeholder="Waypoint label"
                  className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700/60 rounded text-[11px] text-slate-200"
                />
                <span className="text-[10px] text-slate-500">
                  {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                </span>
                {idx > 0 && idx < waypoints.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWaypoint(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Remove waypoint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            <Plane className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Starting Workflow...' : 'Dispatch Mission'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
