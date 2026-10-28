import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Drone, Mission } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import {
  Search,
  X,
  Plane,
  Layers,
  Battery,
  BatteryCharging,
  WifiOff,
  ArrowRight,
  Filter,
  CornerDownLeft,
} from 'lucide-react';

interface GlobalSearchBarProps {
  drones: Drone[];
  missions: Mission[];
  onSelectDrone: (droneId: string) => void;
  onSelectMission: (missionId: string) => void;
  onFilterStatus?: (status: string) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  drones,
  missions,
  onSelectDrone,
  onSelectMission,
  onFilterStatus,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Ctrl+K or Cmd+K or "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter drones by ID or model or status
  const filteredDrones = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return drones.filter(
      (d) =>
        d.droneId.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.status.toLowerCase().replace('_', ' ').includes(q)
    );
  }, [drones, query]);

  // Filter missions by status, missionId, destination, or workflowId
  const filteredMissions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return missions.filter(
      (m) =>
        m.status.toLowerCase().includes(q) ||
        m.status.toLowerCase().replace('_', ' ').includes(q) ||
        m.missionId.toLowerCase().includes(q) ||
        m.destination.toLowerCase().includes(q) ||
        m.droneId.toLowerCase().includes(q) ||
        m.workflowId.toLowerCase().includes(q)
    );
  }, [missions, query]);

  // Combined results for keyboard navigation
  const allResults = useMemo(() => {
    const res: Array<{ type: 'drone'; item: Drone } | { type: 'mission'; item: Mission }> = [];
    filteredDrones.forEach((d) => res.push({ type: 'drone', item: d }));
    filteredMissions.forEach((m) => res.push({ type: 'mission', item: m }));
    return res;
  }, [filteredDrones, filteredMissions]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectResult = (index: number) => {
    const target = allResults[index];
    if (!target) return;
    if (target.type === 'drone') {
      onSelectDrone(target.item.droneId);
    } else {
      onSelectMission(target.item.missionId);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults.length > 0) {
        handleSelectResult(selectedIndex);
      }
    }
  };

  const quickStatusChips = [
    { label: 'IN_PROGRESS', labelDisplay: 'In Progress' },
    { label: 'SUSPENDED_OFFLINE', labelDisplay: 'Offline Waiting' },
    { label: 'RECOVERING', labelDisplay: 'Recovering' },
    { label: 'COMPLETED', labelDisplay: 'Completed' },
    { label: 'DRONE-001', labelDisplay: 'DRONE-001' },
    { label: 'DRONE-002', labelDisplay: 'DRONE-002' },
  ];

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-sm lg:max-w-md">
      {/* Input container */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search drones by ID or missions by status..."
          className="w-full pl-9 pr-14 py-1.5 bg-slate-900/60 hover:bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500/80 focus:bg-slate-900/90 focus:ring-1 focus:ring-sky-500/40 transition-all font-mono-numbers"
          aria-label="Global search bar"
        />

        {/* Clear button or shortcut badge */}
        <div className="absolute right-2 flex items-center gap-1">
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center text-[10px] text-slate-400 font-mono-numbers px-1.5 py-0.5 rounded-md border border-slate-700/50 bg-slate-800/60 pointer-events-none">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#090f20]/95 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-96 flex flex-col backdrop-blur-xl">
          {/* If no query, show Quick Status and Drone shortcuts */}
          {!query.trim() && (
            <div className="p-3">
              <span className="text-[10px] font-semibold text-slate-400 font-mono-numbers uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-sky-400" />
                <span>Quick Filters & Frequent Lookups</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickStatusChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => {
                      setQuery(chip.label);
                      inputRef.current?.focus();
                    }}
                    className="px-2.5 py-1 text-[11px] font-mono-numbers rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  >
                    {chip.labelDisplay}
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Type drone ID (e.g. "DRONE-001") or status (e.g. "SUSPENDED")</span>
                <span className="flex items-center gap-1">
                  <span>Press</span>
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px]">
                    ESC
                  </kbd>
                  <span>to close</span>
                </span>
              </div>
            </div>
          )}

          {/* Results list */}
          {query.trim() && (
            <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
              {allResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <p>No drones or missions found matching "{query}"</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Try searching by drone ID (e.g. "001", "DRONE-002") or status ("IN_PROGRESS", "OFFLINE", "COMPLETED").
                  </p>
                </div>
              ) : (
                <>
                  {/* Drone Results */}
                  {filteredDrones.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 font-mono-numbers uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sky-400">
                          <Plane className="w-3 h-3" />
                          <span>Drones by ID ({filteredDrones.length})</span>
                        </span>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {filteredDrones.map((drone) => {
                          const resultIdx = allResults.findIndex(
                            (r) => r.type === 'drone' && r.item.droneId === drone.droneId
                          );
                          const isSelected = selectedIndex === resultIdx;
                          const isOffline = drone.status === 'OFFLINE_WAITING';

                          return (
                            <button
                              key={drone.droneId}
                              onClick={() => {
                                onSelectDrone(drone.droneId);
                                setIsOpen(false);
                                setQuery('');
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                                isSelected
                                  ? 'bg-sky-600/20 text-white border border-sky-500/40'
                                  : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${
                                    isOffline
                                      ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                                      : 'bg-sky-950/80 text-sky-400 border border-sky-800'
                                  }`}
                                >
                                  <Plane className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-100 font-mono-numbers flex items-center gap-1.5">
                                    <span>{drone.droneId}</span>
                                    <span className="text-[10px] font-normal text-slate-400 font-sans">
                                      · {drone.model}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono-numbers">
                                    Status: {drone.status.replace('_', ' ')}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 font-mono-numbers text-[11px]">
                                <span className="flex items-center gap-1 text-slate-400">
                                  {drone.batteryPercent > 20 ? (
                                    <Battery className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <BatteryCharging className="w-3 h-3 text-rose-400" />
                                  )}
                                  {drone.batteryPercent}%
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mission Results */}
                  {filteredMissions.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 font-mono-numbers uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Layers className="w-3 h-3" />
                          <span>Missions by Status / ID ({filteredMissions.length})</span>
                        </span>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {filteredMissions.map((mission) => {
                          const resultIdx = allResults.findIndex(
                            (r) => r.type === 'mission' && r.item.missionId === mission.missionId
                          );
                          const isSelected = selectedIndex === resultIdx;

                          return (
                            <button
                              key={mission.missionId}
                              onClick={() => {
                                onSelectMission(mission.missionId);
                                setIsOpen(false);
                                setQuery('');
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                                isSelected
                                  ? 'bg-sky-600/20 text-white border border-sky-500/40'
                                  : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                                  <Layers className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-100 font-mono-numbers flex items-center gap-2">
                                    <span>{mission.missionId}</span>
                                    <span className="text-[10px] font-normal text-slate-400 font-sans">
                                      ➔ {mission.destination}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono-numbers">
                                    Assigned: {mission.droneId} · {mission.workflowId}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <StatusBadge status={mission.status} size="sm" />
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer instructions */}
          {allResults.length > 0 && (
            <div className="px-3 py-1.5 bg-[#070b16] border-t border-slate-800 text-[10px] text-slate-400 font-mono-numbers flex items-center justify-between">
              <span>{allResults.length} matching items</span>
              <span className="flex items-center gap-1.5">
                <span>Use</span>
                <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px]">
                  ↑↓
                </kbd>
                <span>to navigate,</span>
                <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] flex items-center gap-0.5">
                  <CornerDownLeft className="w-2.5 h-2.5" />
                </kbd>
                <span>to open</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
