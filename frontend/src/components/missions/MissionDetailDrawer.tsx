import React, { useEffect, useState } from 'react';
import type { Mission, MissionEvent, Waypoint } from '../../types';
import { apiService } from '../../services/api';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';
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
  Download,
  FileCode,
  Share2,
} from 'lucide-react';

interface MissionDetailDrawerProps {
  missionId: string | null;
  onClose: () => void;
  onAbort: (missionId: string) => void;
  onReroute: (mission: Mission) => void;
}

export const MissionDetailDrawer: React.FC<MissionDetailDrawerProps> = ({
  missionId,
  onClose,
  onAbort,
  onReroute,
}) => {
  const { showToast } = useToast();
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

  // Export mission flight path as a standardized GeoJSON file (RFC 7946)
  const handleDownloadGeoJSON = () => {
    if (!mission) return;

    // Coordinates in GeoJSON RFC 7946 are strictly [longitude, latitude, elevation]
    const coordinates: [number, number, number][] = [
      [80.6480, 16.5062, 0], // Dispatch Hub Alpha
      ...(mission.waypoints || []).map((wp) => [
        wp.longitude,
        wp.latitude,
        (wp as any).altitudeMeters || 120,
      ] as [number, number, number]),
    ];

    const geojson = {
      type: 'FeatureCollection',
      properties: {
        missionId: mission.missionId,
        droneId: mission.droneId,
        destination: mission.destination,
        status: mission.status,
        workflowId: mission.workflowId,
        payloadKg: mission.payloadKg || 2.5,
        dispatchedAt: mission.createdAt,
        completedAt: mission.status === 'COMPLETED' ? new Date().toISOString() : null,
        exportedAt: new Date().toISOString(),
        waypointsCount: coordinates.length,
        generator: 'AeroSaga Autonomous Drone Mission Control',
      },
      features: [
        // 1. Flight Trajectory LineString
        {
          type: 'Feature',
          id: `${mission.missionId}-flight-path`,
          geometry: {
            type: 'LineString',
            coordinates,
          },
          properties: {
            name: `${mission.missionId} Flight Corridor Trajectory`,
            missionId: mission.missionId,
            droneId: mission.droneId,
            destination: mission.destination,
            status: mission.status,
            stroke: mission.status === 'COMPLETED' ? '#10b981' : '#0284c7',
            'stroke-width': 3,
            'stroke-opacity': 0.85,
          },
        },
        // 2. Dispatch Hub Alpha Point Feature
        {
          type: 'Feature',
          id: `${mission.missionId}-hub`,
          geometry: {
            type: 'Point',
            coordinates: [80.6480, 16.5062, 0],
          },
          properties: {
            role: 'ORIGIN_HUB',
            name: 'Dispatch Hub Alpha',
            latitude: 16.5062,
            longitude: 80.6480,
            'marker-color': '#10b981',
            'marker-symbol': 'airport',
          },
        },
        // 3. Waypoint Points
        ...(mission.waypoints || []).map((wp, idx) => ({
          type: 'Feature' as const,
          id: `${mission.missionId}-wp-${idx + 1}`,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              wp.longitude,
              wp.latitude,
              (wp as any).altitudeMeters || 120,
            ] as [number, number, number],
          },
          properties: {
            role:
              idx === (mission.waypoints?.length || 0) - 1
                ? 'TARGET_DESTINATION'
                : 'TRANSIT_CORRIDOR',
            name: wp.name || `Waypoint ${idx + 1}`,
            index: idx + 1,
            latitude: wp.latitude,
            longitude: wp.longitude,
            'marker-color':
              idx === (mission.waypoints?.length || 0) - 1 ? '#0284c7' : '#38bdf8',
          },
        })),
      ],
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/geo+json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mission.missionId}-flight-path.geojson`;
    link.click();
    URL.revokeObjectURL(url);

    showToast({
      type: 'success',
      title: 'GeoJSON Flight Path Downloaded',
      description: `Exported flight path for ${mission.missionId} as GeoJSON.`,
    });
  };

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

          <div className="flex items-center gap-2">
            {mission && (
              <button
                onClick={handleDownloadGeoJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/70 border border-sky-700/60 hover:bg-sky-900/60 text-sky-300 hover:text-white text-xs font-mono-numbers transition-colors shadow-sm"
                title="Download flight trajectory as GeoJSON file"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Download GeoJSON</span>
                <span className="sm:hidden">GeoJSON</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

              {/* Completed Mission GeoJSON Download Card (when mission is completed) */}
              {mission.status === 'COMPLETED' && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white font-mono-numbers block">
                        COMPLETED FLIGHT PATH ARCHIVED
                      </span>
                      <span className="text-slate-300 font-sans text-[11px]">
                        Telemetry trajectory verified. Ready for GIS mapping and analytics.
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadGeoJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono-numbers text-xs shadow transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download GeoJSON</span>
                  </button>
                </div>
              )}

              {/* Waypoints Route */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-300 font-mono-numbers uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>Planned Flight Corridors ({mission.waypoints?.length || 0})</span>
                  </h4>

                  <button
                    onClick={handleDownloadGeoJSON}
                    className="text-[11px] font-mono-numbers text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                  >
                    <FileCode className="w-3 h-3" />
                    <span>Export GeoJSON</span>
                  </button>
                </div>

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
                        {idx === 0
                          ? 'Start Hub'
                          : idx === (mission.waypoints?.length || 0) - 1
                          ? 'Target Destination'
                          : 'Transit Corridor'}
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
                  <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800 text-xs text-slate-500 text-center">
                    No execution events recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {events.map((evt) => {
                      const isError =
                        evt.eventType.includes('FAILED') ||
                        evt.eventType.includes('LOST') ||
                        evt.eventType.includes('DISCONNECT');
                      const isSuccess =
                        evt.eventType.includes('COMPLETED') ||
                        evt.eventType.includes('CONNECTED') ||
                        evt.eventType.includes('RECOVERED');

                      return (
                        <div
                          key={evt.id || `${evt.eventType}-${evt.timestamp}`}
                          className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-start gap-3"
                        >
                          <div
                            className={`p-1 rounded mt-0.5 ${
                              isError
                                ? 'bg-rose-500/20 text-rose-400'
                                : isSuccess
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-sky-500/20 text-sky-400'
                            }`}
                          >
                            {isError ? (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            ) : isSuccess ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Compass className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs font-mono-numbers">
                              <span className="font-semibold text-slate-200">
                                {evt.eventType}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(evt.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{evt.details}</p>
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
              <button
                onClick={handleDownloadGeoJSON}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-300 hover:text-white bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/60 rounded-lg transition-colors font-mono-numbers"
                title="Download mission trajectory as GeoJSON"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Download GeoJSON</span>
              </button>

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
