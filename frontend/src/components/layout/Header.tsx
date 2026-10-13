import React from 'react';
import type { Drone, Mission } from '../../types';
import { Plane, Plus, RefreshCw, Menu, Sparkles, Mic } from 'lucide-react';
import { AuthBar } from '../auth/AuthBar';
import { GlobalSearchBar } from '../search/GlobalSearchBar';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenLaunchModal: () => void;
  onOpenAIChat: () => void;
  onOpenVoiceModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isMockMode: boolean;
  onToggleMobileMenu: () => void;
  drones: Drone[];
  missions: Mission[];
  onSelectDrone: (droneId: string) => void;
  onSelectMission: (missionId: string) => void;
  onFilterStatus?: (status: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenLaunchModal,
  onOpenAIChat,
  onOpenVoiceModal,
  onRefresh,
  isRefreshing,
  isMockMode,
  onToggleMobileMenu,
  drones,
  missions,
  onSelectDrone,
  onSelectMission,
  onFilterStatus,
}) => {
  const navItems = [
    { id: 'overview', label: 'Fleet Command' },
    { id: 'missions', label: 'Active Missions' },
    { id: 'drones', label: 'Drone Telemetry' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'diagnostics', label: 'API Diagnostics' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080d1a]/90 backdrop-blur-xl border-b border-slate-800/60 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 transition-all">
      {/* Brand Zone */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => onTabChange('overview')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg group"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 group-hover:border-sky-400/50 transition-colors">
            <Plane className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-white font-display">
              AEROSAGA
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-numbers text-sky-400 bg-sky-950/40 border border-sky-800/40 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MISSION CONTROL
            </span>
          </div>
        </button>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-sm lg:max-w-md mx-2">
        <GlobalSearchBar
          drones={drones}
          missions={missions}
          onSelectDrone={onSelectDrone}
          onSelectMission={onSelectMission}
          onFilterStatus={onFilterStatus}
        />
      </div>

      {/* Navigation Links */}
      <nav className="hidden xl:flex items-center gap-1 text-xs font-medium text-slate-400">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-3 py-1.5 rounded-lg transition-all relative ${
                isActive
                  ? 'text-sky-400 bg-sky-500/10 font-semibold'
                  : 'hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Gemini AI Copilot button */}
        <button
          onClick={onOpenAIChat}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 border border-slate-700/80 text-sky-300 hover:text-white hover:border-sky-500/80 transition-all shadow-sm"
          title="Open Gemini AI Mission Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden lg:inline">AI Copilot</span>
        </button>

        {/* Live Voice Audio button */}
        <button
          onClick={onOpenVoiceModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
          title="Open Gemini Live Voice Radio Channel"
        >
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Voice Radio</span>
        </button>

        {/* Operator Session Auth */}
        <AuthBar />

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          title="Refresh fleet data"
          aria-label="Refresh fleet data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
          />
        </button>

        {/* Primary Launch CTA */}
        <button
          onClick={onOpenLaunchModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Launch Mission</span>
        </button>
      </div>
    </header>
  );
};
