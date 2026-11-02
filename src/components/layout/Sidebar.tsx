import React from 'react';
import {
  Activity,
  Layers,
  RadioTower,
  BarChart3,
  X,
  Compass,
  Signal,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeCount: number;
  offlineCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
  activeCount,
  offlineCount,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Fleet Command',
      description: 'Tactical radar & airspace',
      icon: <Activity className="w-4 h-4" />,
      badge: activeCount > 0 ? `${activeCount} Active` : undefined,
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      id: 'missions',
      label: 'Mission Explorer',
      description: 'Flight routes & waypoints',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'drones',
      label: 'Drone Telemetry',
      description: 'Live GPS & signal health',
      icon: <RadioTower className="w-4 h-4" />,
      badge: offlineCount > 0 ? `${offlineCount} Alert` : undefined,
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'analytics',
      label: 'Analytics & KPIs',
      description: 'Fleet metrics & efficiency',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#070b16] border-r border-slate-800/60 p-4 select-none">
      {/* Brand & Mobile close */}
      <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider text-slate-300 font-mono-numbers uppercase">
            Fleet Operations Core
          </span>
        </div>
        <button
          onClick={onCloseMobile}
          className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List */}
      <div className="space-y-1.5 flex-1 py-3">
        <div className="px-3 text-[10px] font-semibold text-slate-400 font-mono-numbers uppercase tracking-wider mb-2">
          Operations
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/25 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs truncate font-medium">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate font-normal">
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 text-[9px] font-mono-numbers font-semibold rounded-full border shrink-0 ${
                    item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Airspace Hub Status Badge */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs font-mono-numbers space-y-2">
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>DISPATCH HUB ALPHA</span>
          </span>
          <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
          <span>Grid Coordinates</span>
          <span className="text-slate-300">16.506°N, 80.648°E</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Temporal Queue</span>
          <span className="text-sky-300 truncate max-w-[110px]">MISSION_QUEUE</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Rail */}
      <aside className="hidden md:block w-64 shrink-0 sticky top-[53px] h-[calc(100vh-53px)]">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
