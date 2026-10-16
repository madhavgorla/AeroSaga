import React from 'react';
import {
  Activity,
  Layers,
  RadioTower,
  BarChart3,
  Terminal,
  ShieldCheck,
  X,
  Compass,
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
  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        {
          id: 'overview',
          label: 'Fleet Command',
          icon: <Activity className="w-4 h-4" />,
          badge: activeCount > 0 ? `${activeCount}` : undefined,
        },
        {
          id: 'missions',
          label: 'Mission Explorer',
          icon: <Layers className="w-4 h-4" />,
        },
        {
          id: 'drones',
          label: 'Drone Telemetry',
          icon: <RadioTower className="w-4 h-4" />,
          badge: offlineCount > 0 ? `${offlineCount} Offline` : undefined,
          badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        },
        {
          id: 'analytics',
          label: 'Analytics & KPIs',
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'diagnostics',
          label: 'API & Health',
          icon: <Terminal className="w-4 h-4" />,
        },
      ],
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#070b16] border-r border-slate-800/60 p-4">
      {/* Brand & Mobile close */}
      <div className="flex items-center justify-between pb-5 mb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-slate-300 font-mono-numbers uppercase">
            AeroSaga Fleet Core
          </span>
        </div>
        <button
          onClick={onCloseMobile}
          className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List */}
      <div className="space-y-6 flex-1 py-2">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-semibold text-slate-400 font-mono-numbers uppercase tracking-wider mb-2">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono-numbers font-semibold rounded-full border ${
                          item.badgeColor || 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Airspace Hub Indicator Card */}
      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs font-mono-numbers space-y-1.5">
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>HUB ALPHA</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ONLINE
          </span>
        </div>
        <div className="text-[11px] text-slate-300 font-mono-numbers">
          16.5062°N, 80.6480°E
        </div>
        <div className="text-[10px] text-slate-400">
          Task Queue: AEROSAGA_MISSION_QUEUE
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Rail */}
      <aside className="hidden md:block w-60 shrink-0 sticky top-[53px] h-[calc(100vh-53px)]">
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
