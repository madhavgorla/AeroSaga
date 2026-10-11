import React, { useState } from 'react';
import type { Mission, Waypoint } from '../../types';
import { Modal } from '../ui/Modal';
import { GitBranch, Plus, Trash2 } from 'lucide-react';

interface RerouteMissionModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (missionId: string, waypoints: Waypoint[]) => Promise<void>;
}

export const RerouteMissionModal: React.FC<RerouteMissionModalProps> = ({
  mission,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(
    mission?.waypoints || [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.525, longitude: 80.635, name: 'Alternative Corridor B' },
    ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!mission) return null;

  const handleAddWaypoint = () => {
    setWaypoints((prev) => [
      ...prev,
      {
        latitude: Number((16.51 + Math.random() * 0.03).toFixed(4)),
        longitude: Number((80.62 + Math.random() * 0.03).toFixed(4)),
        name: `Reroute Pt ${prev.length + 1}`,
      },
    ]);
  };

  const handleRemove = (index: number) => {
    if (waypoints.length <= 2) return;
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(mission.missionId, waypoints);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reroute Mission ${mission.missionId}`}
      subtitle="Validate and signal replacement route to the Temporal workflow."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
          This sends a replacement waypoint sequence. The Temporal workflow will validate the air
          corridor and update the drone autopilot in flight.
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 font-mono-numbers">
              ALTERNATIVE WAYPOINTS
            </span>
            <button
              type="button"
              onClick={handleAddWaypoint}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Point</span>
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
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
                  className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs"
                />
                <span className="text-[10px] text-slate-500">
                  {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                </span>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow transition-colors disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Transmitting...' : 'Apply Reroute Signal'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
