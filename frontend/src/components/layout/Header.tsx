import React from 'react';
import { Plane, Plus, RefreshCw, Menu, Radio, Sparkles, Mic } from 'lucide-react';
import { AuthBar } from '../auth/AuthBar';

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
}) => {
  const navItems = [
    { id: 'overview', label: 'Fleet Command' },
    { id: 'missions', label: 'Active Missions' },
    { id: 'drones', label: 'Drone Telemetry' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'diagnostics', label: 'API Diagnostics' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080d1a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 py-3 flex items-center justify-between gap-6">
      {/* Zone 1: Single text element wordmark / brand */}
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
        <span className="hidden xl:inline text-xs text-slate-500 font-mono-numbers">
          · MISSION CONTROL
        </span>
      </div>

      {/* Zone 2: 4–5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400 overflow-x-auto">
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
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Gemini AI Copilot button */}
        <button
          onClick={onOpenAIChat}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-950 to-indigo-950 border border-sky-600/50 text-sky-200 hover:border-sky-400 transition-colors shadow-sm"
          title="Open Gemini AI Mission Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Live Voice Audio button */}
        <button
          onClick={onOpenVoiceModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-sky-500 transition-colors"
          title="Open Gemini Live Voice Radio Channel"
        >
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Voice Radio</span>
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
          <span className="hidden sm:inline">Launch Mission</span>
        </button>
      </div>
    </header>
  );
};
