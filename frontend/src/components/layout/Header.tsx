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
    <header className="sticky top-0 z-40 w-full bg-[#080d1a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
      {/* Zone 1: Wordmark & Mobile burger */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-slate-400 hover:text-white p-1"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => onTabChange('overview')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Plane className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            AEROSAGA
          </span>
        </button>
      </div>

      {/* Global Search Bar (Finding drones by ID or missions by status) */}
      <div className="flex-1 max-w-sm lg:max-w-md mx-2">
        <GlobalSearchBar
          drones={drones}
          missions={missions}
          onSelectDrone={onSelectDrone}
          onSelectMission={onSelectMission}
          onFilterStatus={onFilterStatus}
        />
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-400">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
                isActive ? 'text-sky-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: AI Copilot, Live Voice, Auth, and Primary CTA */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Gemini AI Copilot button */}
        <button
          onClick={onOpenAIChat}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-950 to-indigo-950 border border-sky-600/50 text-sky-200 hover:border-sky-400 transition-colors shadow-sm"
          title="Open Gemini AI Mission Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden lg:inline">AI Copilot</span>
        </button>

        {/* Live Voice Audio button */}
        <button
          onClick={onOpenVoiceModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-sky-500 transition-colors"
          title="Open Gemini Live Voice Radio Channel"
        >
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Voice Radio</span>
        </button>

        {/* Firebase Authentication */}
        <AuthBar />

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800 transition-colors"
          title="Refresh fleet data"
          aria-label="Refresh fleet data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
          />
        </button>

        {/* Primary CTA */}
        <button
          onClick={onOpenLaunchModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Launch Mission</span>
        </button>
      </div>
    </header>
  );
};
