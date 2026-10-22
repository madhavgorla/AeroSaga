import React from 'react';
import type { Drone, Mission } from '../../types';
import {
  Plane,
  Plus,
  RefreshCw,
  Menu,
  Sparkles,
  Mic,
  AlertTriangle,
  Battery,
  ArrowRight,
} from 'lucide-react';
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
  const [isAlertDismissed, setIsAlertDismissed] = React.useState(false);

  const navItems = [
    { id: 'overview', label: 'Fleet Command' },
    { id: 'missions', label: 'Active Missions' },
    { id: 'drones', label: 'Drone Telemetry' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'diagnostics', label: 'API Diagnostics' },
  ];

  // Detect any drones with critical battery levels (< 15%)
  const criticalDrones = drones.filter((d) => d.batteryPercent < 15);

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col">
      {/* Primary Header Navigation Bar */}
      <header className="w-full bg-[#080d1a]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 transition-all">
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
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:border-sky-400/50 transition-colors">
              <Plane className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-white font-display">
                AEROSAGA
              </span>
              <span className="hidden xl:inline text-[11px] font-mono-numbers text-slate-400 font-medium">
                Mission Control
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
                className={`px-3 py-1.5 rounded-lg transition-all ${
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
          {/* Subtle alert notification icon if critical drones exist */}
          {criticalDrones.length > 0 && isAlertDismissed && (
            <button
              onClick={() => {
                setIsAlertDismissed(false);
                onTabChange('drones');
                onSelectDrone(criticalDrones[0].droneId);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs transition-colors"
              title="Low battery alert active - click to inspect"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums text-[11px] font-semibold">{criticalDrones.length}</span>
            </button>
          )}

          {/* Gemini AI Copilot button */}
          <button
            onClick={onOpenAIChat}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700/80 text-sky-300 hover:text-white hover:border-sky-500/60 transition-colors"
            title="Open Gemini AI Mission Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">AI Copilot</span>
          </button>

          {/* Live Voice Audio button */}
          <button
            onClick={onOpenVoiceModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-colors"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Launch Mission</span>
          </button>
        </div>
      </header>

      {/* Sleek, Dismissible Low Battery Notification Banner */}
      {criticalDrones.length > 0 && !isAlertDismissed && (
        <div className="w-full bg-red-950/90 border-b border-red-500/30 px-4 md:px-6 py-1.5 flex items-center justify-between gap-3 text-xs text-red-200 backdrop-blur-md">
          <div className="flex items-center gap-2 truncate">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate">
              <strong className="text-white font-medium">Critical Battery Alert:</strong>{' '}
              {criticalDrones.length === 1 ? (
                <>
                  <span className="font-mono text-white">{criticalDrones[0].droneId}</span> is at{' '}
                  <span className="text-red-300 font-bold">{criticalDrones[0].batteryPercent}%</span>. Immediate Return-to-Base required.
                </>
              ) : (
                <>
                  {criticalDrones.length} drones below 15% threshold ({criticalDrones.map((d) => `${d.droneId}: ${d.batteryPercent}%`).join(', ')}).
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onTabChange('drones');
                if (criticalDrones[0]) onSelectDrone(criticalDrones[0].droneId);
              }}
              className="px-2.5 py-0.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1 font-mono-numbers"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsAlertDismissed(true)}
              className="p-1 rounded-md text-red-400 hover:text-white hover:bg-red-900/40 transition-colors"
              title="Dismiss alert banner"
              aria-label="Dismiss alert banner"
            >
              <span className="text-xs font-bold leading-none">✕</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
