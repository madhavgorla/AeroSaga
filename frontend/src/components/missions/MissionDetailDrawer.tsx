import React, { useEffect, useState } from 'react';
import type { Mission, MissionEvent, Waypoint } from '../../types';
import { apiService } from '../../services/api';
import { StatusBadge } from '../ui/StatusBadge';
import {
  X,
  ShieldCheck,
  MapPin,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  GitBranch,
  RefreshCw,
  Play,
} from 'lucide-react';

interface MissionDetailDrawerProps {
  missionId: string | null;
  onClose: () => void;
  onAbort: (missionId: string) => void;
  onReroute: (mission: Mission) => void;
  onOpenReplay?: (mission: Mission) => void;
}

export const MissionDetailDrawer: React.FC<MissionDetailDrawerProps> = ({
  missionId,
  onClose,
  onAbort,
  onReroute,
}) => {
  const [mission, setMission] = useState<Mission | null>(null);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!missionId) {
      setMission(null);
      setEvents([]);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      try {
        const [m, evts] = await Promise.all([
          apiService.getMission(missionId),
          apiService.getMissionEvents(missionId),
        ]);
        setMission(m);
        setEvents(evts);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [missionId]);

  if (!missionId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-xl bg-[#090f1f] border-l border-slate-800 h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-[#080d1a]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono-numbers text-sky-400 font-semibold">
                MISSION DOSSIER
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-mono-numbers text-slate-300 font-bold">
                {missionId}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {mission?.destination || 'Loading mission...'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
              <span>Fetching mission telemetry from Temporal workflow...</span>
            </div>
          ) : !mission ? (
            <div className="py-20 text-center text-slate-500">Mission details not found.</div>
          ) : (
            <>
              {/* Mission Snapshot Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400">Current Lifecycle State</span>
                  <StatusBadge status={mission.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono-numbers">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ASSIGNED DRONE</span>
                    <span className="text-slate-200 font-semibold">{mission.droneId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PAYLOAD</span>
                    <span className="text-slate-200">{mission.payloadKg || 2.5} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DISPATCHED AT</span>
                    <span className="text-slate-200">
                      {new Date(mission.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ESTIMATED ARRIVAL</span>
                    <span className="text-slate-200">{mission.estimatedArrival || 'En route'}</span>
                  </div>
                </div>

                {/* Workflow ID */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] font-mono-numbers">
                    TEMPORAL WORKFLOW ID
                  </span>
                  <div className="mt-1 flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/90 text-xs font-mono text-sky-300 break-all select-all">
                    <span>{mission.workflowId}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  </div>
                </div>

                {mission.message && (
                  <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded border border-slate-800/50">
                    "{mission.message}"
                  </p>
                )}
              </div>

              {/* Waypoints Route */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 font-mono-numbers uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>Planned Flight Corridors ({mission.waypoints?.length || 0})</span>
                </h4>
                <div className="space-y-2">
                  {mission.waypoints?.map((wp, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs font-mono-numbers"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 font-semibold">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-200">
                            {wp.name || `Waypoint ${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {wp.latitude.toFixed(4)}°N, {wp.longitude.toFixed(4)}°E
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {idx === 0 ? 'Start Hub' : idx === mission.waypoints.length - 1 ? 'Target Destination' : 'Transit Corridor'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Audit Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-300 font-mono-numbers uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Temporal Audit Trail & Events</span>
                  </h4>
                  <span className="text-[10px] font-mono-numbers text-slate-500">
                    {events.length} records
                  </span>
                </div>

                {events.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 text-center border border-dashed border-slate-800 rounded-lg">
                    No timeline events recorded yet.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
                    {events.map((evt) => {
                      const isSuccess = evt.severity === 'success';
                      const isWarn = evt.severity === 'warn';
                      const isError = evt.severity === 'error';

                      return (
                        <div key={evt.id} className="relative group">
                          {/* Dot marker */}
                          <div
                            className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-[#090f1f] ${
                              isError
                                ? 'bg-rose-500'
                                : isWarn
                                ? 'bg-amber-400'
                                : isSuccess
                                ? 'bg-emerald-400'
                                : 'bg-sky-400'
                            }`}
                          />

                          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-200 font-mono-numbers text-[11px]">
                                {evt.eventType.replaceAll('_', ' ')}
                              </span>
                              <span className="text-[10px] font-mono-numbers text-slate-500">
                                {new Date(evt.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              {evt.details}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Controls in Footer */}
        {mission && (
          <div className="p-4 border-t border-slate-800 bg-[#080d1a] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onOpenReplay && (
                <button
                  onClick={() => onOpenReplay(mission)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-300 hover:text-white bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 rounded-lg transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-sky-400" />
                  <span>Blackbox Replay</span>
                </button>
              )}

              {['IN_PROGRESS', 'SUSPENDED_OFFLINE'].includes(mission.status) && (
                <button
                  onClick={() => onReroute(mission)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Reroute</span>
                </button>
              )}

              {!['COMPLETED', 'ABORTED', 'FAILED'].includes(mission.status) && (
                <button
                  onClick={() => onAbort(mission.missionId)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Abort Mission</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
