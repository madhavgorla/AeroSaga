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
} from 'lucide-react';

interface MissionsTableProps {
  missions: Mission[];
  onSelectMission: (missionId: string) => void;
  onAbortMission: (missionId: string) => void;
  onRerouteMission: (mission: Mission) => void;
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
  const [sortField, setSortField] = useState<'createdAt' | 'missionId' | 'status'>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Filter missions
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      const matchesSearch =
        m.missionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.droneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.workflowId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [missions, searchTerm, statusFilter]);

  // Sort missions
  const sortedMissions = useMemo(() => {
    return [...filteredMissions].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'createdAt') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sortAsc ? timeA - timeB : timeB - timeA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredMissions, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedMissions.length / pageSize) || 1;
  const paginatedMissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedMissions.slice(start, start + pageSize);
  }, [sortedMissions, currentPage]);

  const toggleSort = (field: 'createdAt' | 'missionId' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Mission ID,Workflow ID,Drone ID,Destination,Status,Dispatched At\n';
    const rows = filteredMissions
      .map(
        (m) =>
          `"${m.missionId}","${m.workflowId}","${m.droneId}","${m.destination}","${m.status}","${m.createdAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aerosaga-missions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusOptions: Array<{ label: string; value: string }> = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Suspended (Offline)', value: 'SUSPENDED_OFFLINE' },
    { label: 'Recovering', value: 'RECOVERING' },
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Aborted', value: 'ABORTED' },
  ];

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-[#090e1a]/80 backdrop-blur-xl overflow-hidden shadow-xl">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter by Mission, Drone, Destination..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/30 transition-all font-mono-numbers"
          />
        </div>

        {/* Filter controls & Export */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs text-slate-300 py-1.5 px-3 focus:outline-none focus:border-sky-500/80 font-mono-numbers"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl transition-all"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800/60 bg-slate-950/40 text-[11px] font-mono-numbers text-slate-400 tracking-wider">
              <th
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort('missionId')}
              >
                <div className="flex items-center gap-1.5">
                  <span>MISSION ID</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">DRONE</th>
              <th className="py-3 px-4 font-semibold">DESTINATION / CORRIDOR</th>
              <th
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort('status')}
              >
                <div className="flex items-center gap-1.5">
                  <span>STATUS</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort('createdAt')}
              >
                <div className="flex items-center gap-1.5">
                  <span>DISPATCHED AT</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono-numbers">
            {paginatedMissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                  No delivery missions found matching the current filters.
                </td>
              </tr>
            ) : (
              paginatedMissions.map((m) => {
                const canAbort = !['COMPLETED', 'ABORTED', 'FAILED'].includes(m.status);
                const canReroute = ['IN_PROGRESS', 'SUSPENDED_OFFLINE'].includes(m.status);

                return (
                  <tr
                    key={m.missionId}
                    onClick={() => onSelectMission(m.missionId)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-sky-400 group-hover:text-sky-300 transition-colors">
                          {m.missionId}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px] font-mono">
                        {m.workflowId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">{m.droneId}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="font-sans font-medium text-slate-200">{m.destination}</span>
                      <div className="text-[10px] text-slate-400">
                        {m.waypoints?.length || 0} waypoints plotted
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectMission(m.missionId)}
                          className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800/60 rounded-lg transition-colors"
                          title="View Mission Details & Events"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canReroute && (
                          <button
                            onClick={() => onRerouteMission(m)}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 rounded-lg transition-colors"
                            title="Signal Reroute Alternative Path"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canAbort && (
                          <button
                            disabled={isBusy}
                            onClick={() => onAbortMission(m.missionId)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-40"
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
      <div className="p-3.5 border-t border-slate-800/60 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 font-mono-numbers">
        <span>
          Showing {sortedMissions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, sortedMissions.length)} of {sortedMissions.length}{' '}
          records
        </span>
        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded-lg hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded-lg hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
