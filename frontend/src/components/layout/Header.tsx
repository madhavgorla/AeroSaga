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
  ArrowRight,
  Moon,
  Sun,
} from 'lucide-react';
import { AuthBar } from '../auth/AuthBar';
import { GlobalSearchBar } from '../search/GlobalSearchBar';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
  const [isAlertDismissed, setIsAlertDismissed] = React.useState(false);

  // Operational Navigation Items (Clean 4 core views)
  const navItems = [
    { id: 'overview', label: 'Fleet Command' },
    { id: 'missions', label: 'Missions' },
    { id: 'drones', label: 'Telemetry' },
    { id: 'analytics', label: 'Analytics' },
  ];

  // Detect any drones with critical battery levels (< 15%)
  const criticalDrones = drones.filter((d) => d.batteryPercent < 15);

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col">
      {/* Primary Header Navigation Bar */}
      <header className="w-full bg-[#080d1a]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 md:gap-4 transition-all">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5 shrink-0">
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
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:border-sky-400/50 transition-colors shadow-sm">
              <Plane className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-tight text-white font-display">
                AEROSAGA
              </span>
              <span className="hidden xl:inline text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                Hub Alpha
              </span>
            </div>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xs md:max-w-sm lg:max-w-md mx-1 md:mx-2">
          <GlobalSearchBar
            drones={drones}
            missions={missions}
            onSelectDrone={onSelectDrone}
            onSelectMission={onSelectMission}
            onFilterStatus={onFilterStatus}
          />
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-400">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'text-sky-400 bg-sky-500/10 font-semibold shadow-sm'
                    : 'hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Tools Cluster */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Critical Battery Indicator */}
          {criticalDrones.length > 0 && isAlertDismissed && (
            <button
              onClick={() => {
                setIsAlertDismissed(false);
                onTabChange('drones');
                onSelectDrone(criticalDrones[0].droneId);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs transition-colors"
              title="Low battery alert active - click to inspect"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums text-[11px] font-semibold">{criticalDrones.length}</span>
            </button>
          )}

          {/* AI Tools Group */}
          <div className="hidden sm:flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={onOpenAIChat}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Open AI Flight Specialist"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden xl:inline">AI Copilot</span>
            </button>

            <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Open Live Voice Radio"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Radio</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-all duration-200 flex items-center justify-center focus:outline-none"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-sky-400 hover:text-sky-300 transition-transform duration-200" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500 hover:text-amber-600 transition-transform duration-200" />
            )}
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-colors"
            title="Refresh fleet telemetry"
            aria-label="Refresh fleet data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
            />
          </button>

          {/* Auth Bar */}
          <AuthBar />

          {/* Primary CTA */}
          <button
            onClick={onOpenLaunchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch</span>
          </button>
        </div>
      </header>

      {/* Critical Battery Notification Banner */}
      {criticalDrones.length > 0 && !isAlertDismissed && (
        <div className="w-full bg-rose-950/90 border-b border-rose-500/30 px-4 md:px-6 py-1.5 flex items-center justify-between gap-3 text-xs text-rose-200 backdrop-blur-md">
          <div className="flex items-center gap-2 truncate">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">
              <strong className="text-white font-medium">Critical Battery Alert:</strong>{' '}
              {criticalDrones.length === 1 ? (
                <>
                  <span className="font-mono text-white">{criticalDrones[0].droneId}</span> is at{' '}
                  <span className="text-rose-300 font-bold">{criticalDrones[0].batteryPercent}%</span>. Immediate Return-to-Base required.
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
              className="px-2.5 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1 font-mono-numbers"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsAlertDismissed(true)}
              className="p-1 rounded-md text-rose-400 hover:text-white hover:bg-rose-900/40 transition-colors"
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
