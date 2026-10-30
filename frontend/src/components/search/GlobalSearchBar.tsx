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
  ArrowRight,
  Filter,
  CornerDownLeft,
  Clock,
  History,
  Trash2,
  Tag,
} from 'lucide-react';

export interface RecentSearchItem {
  id: string;
  type: 'drone' | 'mission' | 'query';
  title: string;
  subtitle?: string;
  status?: string;
  targetId?: string;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = 'aerosaga_recent_searches';

const DEFAULT_RECENT_SEARCHES: RecentSearchItem[] = [
  {
    id: 'recent-drone-001',
    type: 'drone',
    title: 'DRONE-001',
    subtitle: 'HexaRotor Scout · Fast Recon',
    status: 'IN_FLIGHT',
    targetId: 'DRONE-001',
    timestamp: Date.now() - 1000 * 60 * 15, // 15 mins ago
  },
  {
    id: 'recent-msn-001',
    type: 'mission',
    title: 'MSN-2024-001',
    subtitle: 'Sector 4 Coastal Depot',
    status: 'IN_PROGRESS',
    targetId: 'MSN-2024-001',
    timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
  },
  {
    id: 'recent-query-offline',
    type: 'query',
    title: 'SUSPENDED_OFFLINE',
    subtitle: 'Fleet status filter query',
    status: 'SUSPENDED_OFFLINE',
    targetId: 'SUSPENDED_OFFLINE',
    timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
  },
];

const formatRelativeTime = (timestamp: number): string => {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

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

  // Load recent searches from localStorage with fallback
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // ignore parse error
      }
    }
    return DEFAULT_RECENT_SEARCHES;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Ctrl+K or Cmd+K to focus search
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

  // Helper to add or update recent searches
  const addRecentSearch = (item: Omit<RecentSearchItem, 'id' | 'timestamp'>) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (r) => !(r.type === item.type && r.title.toLowerCase() === item.title.toLowerCase())
      );
      const newItem: RecentSearchItem = {
        ...item,
        id: `${item.type}-${item.title}-${Date.now()}`,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Remove individual recent search
  const removeRecentSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Clear all recent searches
  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

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

  // Combined live results for keyboard navigation
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

  // Handle clicking / selecting a recent search item
  const handleSelectRecentSearch = (item: RecentSearchItem) => {
    addRecentSearch({
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      status: item.status,
      targetId: item.targetId,
    });

    if (item.type === 'drone' && item.targetId) {
      onSelectDrone(item.targetId);
      setIsOpen(false);
      setQuery('');
    } else if (item.type === 'mission' && item.targetId) {
      onSelectMission(item.targetId);
      setIsOpen(false);
      setQuery('');
    } else {
      setQuery(item.title);
      if (onFilterStatus) {
        onFilterStatus(item.title);
      }
      inputRef.current?.focus();
    }
  };

  const handleSelectResult = (index: number) => {
    const target = allResults[index];
    if (!target) return;
    if (target.type === 'drone') {
      addRecentSearch({
        type: 'drone',
        title: target.item.droneId,
        subtitle: `${target.item.model} · ${target.item.status.replace('_', ' ')}`,
        status: target.item.status,
        targetId: target.item.droneId,
      });
      onSelectDrone(target.item.droneId);
    } else {
      addRecentSearch({
        type: 'mission',
        title: target.item.missionId,
        subtitle: `${target.item.destination} · ${target.item.droneId}`,
        status: target.item.status,
        targetId: target.item.missionId,
      });
      onSelectMission(target.item.missionId);
    }
    setIsOpen(false);
    setQuery('');
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    const maxItems = query.trim() ? allResults.length : recentSearches.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (maxItems > 0) {
        setSelectedIndex((prev) => (prev < maxItems - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (maxItems > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxItems - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        if (allResults.length > 0) {
          handleSelectResult(selectedIndex);
        } else {
          // Save custom text query
          addRecentSearch({
            type: 'query',
            title: query.trim(),
            subtitle: 'Custom query',
            status: query.trim(),
            targetId: query.trim(),
          });
          if (onFilterStatus) {
            onFilterStatus(query.trim());
          }
        }
      } else if (recentSearches.length > 0 && selectedIndex < recentSearches.length) {
        handleSelectRecentSearch(recentSearches[selectedIndex]);
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
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#090f20]/95 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[30rem] flex flex-col backdrop-blur-xl">
          {/* If no query, show Recent Searches & Quick Filters */}
          {!query.trim() && (
            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/70">
              {/* RECENT SEARCHES SECTION */}
              <div className="p-3">
                <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300 font-mono-numbers uppercase tracking-wider">
                    <History className="w-3.5 h-3.5 text-sky-400" />
                    <span>Recent Searches</span>
                    {recentSearches.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {recentSearches.length}
                      </span>
                    )}
                  </div>
                  {recentSearches.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800/60"
                      title="Clear all recent searches"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  )}
                </div>

                {recentSearches.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-slate-500 opacity-60" />
                    <p className="text-[11px]">No recent searches</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Your past mission and drone telemetry lookups will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentSearches.map((item, idx) => {
                      const isHighlighted = selectedIndex === idx;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectRecentSearch(item)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer group ${
                            isHighlighted
                              ? 'bg-sky-600/20 text-white border border-sky-500/40 shadow-sm'
                              : 'hover:bg-slate-800/60 text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Type-based icon */}
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] border ${
                                item.type === 'drone'
                                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                  : item.type === 'mission'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {item.type === 'drone' && <Plane className="w-3.5 h-3.5" />}
                              {item.type === 'mission' && <Layers className="w-3.5 h-3.5" />}
                              {item.type === 'query' && <History className="w-3.5 h-3.5" />}
                            </div>

                            {/* Title & Subtitle */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-100 font-mono-numbers text-xs truncate">
                                  {item.title}
                                </span>
                                <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                                  {item.type}
                                </span>
                              </div>
                              {item.subtitle && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right Meta & Actions */}
                          <div className="flex items-center gap-2 shrink-0 pl-2">
                            {item.status && <StatusBadge status={item.status} size="sm" />}
                            <span className="text-[10px] text-slate-400 font-mono-numbers hidden sm:inline">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => removeRecentSearch(item.id, e)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/80 transition-colors opacity-80 group-hover:opacity-100"
                              title="Remove from recent searches"
                              aria-label={`Remove ${item.title}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* QUICK FILTERS & FREQUENT LOOKUPS */}
              <div className="p-3">
                <span className="text-[10px] font-semibold text-slate-400 font-mono-numbers uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-sky-400" />
                  <span>Quick Status & Drone Filters</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickStatusChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        addRecentSearch({
                          type: 'query',
                          title: chip.label,
                          subtitle: `Quick filter · ${chip.labelDisplay}`,
                          status: chip.label,
                          targetId: chip.label,
                        });
                        setQuery(chip.label);
                        if (onFilterStatus) {
                          onFilterStatus(chip.label);
                        }
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 text-[11px] font-mono-numbers rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5 text-sky-400 opacity-70" />
                      <span>{chip.labelDisplay}</span>
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
            </div>
          )}

          {/* Results list when query is typed */}
          {query.trim() && (
            <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
              {allResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <p>No drones or missions found matching "{query}"</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Try searching by drone ID (e.g. "001", "DRONE-002") or status ("IN_PROGRESS", "OFFLINE", "COMPLETED").
                  </p>
                  {/* Quick fallback to recent searches */}
                  {recentSearches.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/70 text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Jump to recent searches:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.slice(0, 4).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleSelectRecentSearch(r)}
                            className="px-2 py-1 text-[11px] font-mono-numbers rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors flex items-center gap-1"
                          >
                            <History className="w-2.5 h-2.5 text-sky-400" />
                            <span>{r.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                              type="button"
                              onClick={() => {
                                addRecentSearch({
                                  type: 'drone',
                                  title: drone.droneId,
                                  subtitle: `${drone.model} · ${drone.status.replace('_', ' ')}`,
                                  status: drone.status,
                                  targetId: drone.droneId,
                                });
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
                              type="button"
                              onClick={() => {
                                addRecentSearch({
                                  type: 'mission',
                                  title: mission.missionId,
                                  subtitle: `${mission.destination} · ${mission.droneId}`,
                                  status: mission.status,
                                  targetId: mission.missionId,
                                });
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
          <div className="px-3 py-1.5 bg-[#070b16] border-t border-slate-800 text-[10px] text-slate-400 font-mono-numbers flex items-center justify-between">
            <span>
              {query.trim()
                ? `${allResults.length} matching items`
                : `${recentSearches.length} recent queries stored`}
            </span>
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
        </div>
      )}
    </div>
  );
};
