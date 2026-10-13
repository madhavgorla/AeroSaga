import React, { useState, useMemo } from 'react';
import type { Mission, MissionStatus } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import {
  Search,
  Filter,
  Download,
  AlertOctagon,
  Eye,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Play,
} from 'lucide-react';

interface MissionsTableProps {
  missions: Mission[];
  onSelectMission: (missionId: string) => void;
  onAbortMission: (missionId: string) => void;
  onRerouteMission: (mission: Mission) => void;
  onOpenReplay?: (mission: Mission) => void;
  isBusy: boolean;
}

export const MissionsTable: React.FC<MissionsTableProps> = ({
  missions,
  onSelectMission,
  onAbortMission,
  onRerouteMission,
  isBusy,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const pageSize = 8;

  const filteredMissions = useMemo(() => {
    return missions
      .filter((m) => {
        const matchesSearch =
          m.missionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.droneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.workflowId.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [missions, searchTerm, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredMissions.length / pageSize));
  const paginatedMissions = filteredMissions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCsv = () => {
    const headers = ['Mission ID', 'Workflow ID', 'Drone ID', 'Destination', 'Status', 'Created At'];
    const rows = filteredMissions.map((m) => [
      m.missionId,
      m.workflowId,
      m.droneId,
      `"${m.destination}"`,
      m.status,
      m.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aerosaga-missions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusCategories = [
    { id: 'ALL', label: 'All' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'SUSPENDED_OFFLINE', label: 'Offline Waiting' },
    { id: 'RECOVERING', label: 'Recovering' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'ABORTED', label: 'Aborted' },
  ];

  return (
    <div className="bg-[#0b1325] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search mission ID, drone, or destination..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Controls & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented status filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
            {statusCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setStatusFilter(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
                  statusFilter === cat.id
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg text-xs flex items-center gap-1"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#080e1c] text-slate-400 font-mono-numbers text-[11px]">
              <th className="py-3 px-4 font-medium">MISSION & WORKFLOW</th>
              <th className="py-3 px-4 font-medium">DRONE</th>
              <th className="py-3 px-4 font-medium">DESTINATION</th>
              <th className="py-3 px-4 font-medium">STATUS</th>
              <th className="py-3 px-4 font-medium">CREATED</th>
              <th className="py-3 px-4 font-medium text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
            {paginatedMissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No missions found matching your search or filters.
                </td>
              </tr>
            ) : (
              paginatedMissions.map((m) => {
                const canAbort = !['COMPLETED', 'ABORTED', 'FAILED'].includes(m.status);
                const canReroute = ['IN_PROGRESS', 'SUSPENDED_OFFLINE'].includes(m.status);

                return (
                  <tr
                    key={m.missionId}
                    className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectMission(m.missionId)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{m.missionId}</div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tight truncate max-w-[180px]">
                        {m.workflowId}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">{m.droneId}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-sans">{m.destination}</span>
                      <div className="text-[10px] text-slate-400">
                        {m.waypoints?.length || 0} waypoints
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectMission(m.missionId)}
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
                          title="View Mission Details & Events"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {onOpenReplay && (
                          <button
                            onClick={() => onOpenReplay(m)}
                            className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors"
                            title="Open Flight Replay & Telemetry Blackbox"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canReroute && (
                          <button
                            onClick={() => onRerouteMission(m)}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
                            title="Signal Reroute Alternative Path"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canAbort && (
                          <button
                            disabled={isBusy}
                            onClick={() => onAbortMission(m.missionId)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 rounded transition-colors disabled:opacity-40"
                            title="Signal Safe Abort"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono-numbers">
        <span>
          Showing {filteredMissions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, filteredMissions.length)} of{' '}
          {filteredMissions.length} entries
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
