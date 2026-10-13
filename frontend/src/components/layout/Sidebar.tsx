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
  GitBranch,
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
          badge: activeCount > 0 ? `${activeCount} Active` : undefined,
        },
        {
          id: 'missions',
          label: 'Mission Explorer',
          icon: <Layers className="w-4 h-4" />,
        },
        {
          id: 'workflow',
          label: 'Workflow Inspector',
          icon: <GitBranch className="w-4 h-4" />,
        },
        {
          id: 'drones',
          label: 'Drone Telemetry',
          icon: <RadioTower className="w-4 h-4" />,
          badge: offlineCount > 0 ? `${offlineCount} Offline` : undefined,
          badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
        },
        {
          id: 'analytics',
          label: 'Analytics & KPIs',
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'INTEGRATIONS',
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
    <div className="flex flex-col h-full bg-[#070b16] border-r border-slate-800/80 p-4">
      {/* Brand & Mobile close */}
      <div className="flex items-center justify-between pb-6 mb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-sm font-bold tracking-wider text-white">AEROSAGA</span>
            <span className="block text-[9px] text-slate-400 font-mono-numbers tracking-wider">
              DRONE CONTROL
            </span>
          </div>
        </div>
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Lists */}
      <div className="flex-1 space-y-6 overflow-y-auto pt-2">
        {navSections.map((sec) => (
          <div key={sec.title}>
            <p className="px-2 text-[10px] font-semibold text-slate-500 font-mono-numbers tracking-wider uppercase mb-2">
              {sec.title}
            </p>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      if (isOpenMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
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
                        className={`text-[10px] font-mono-numbers px-1.5 py-0.5 rounded border ${
                          item.badgeColor || 'text-sky-300 bg-sky-950/60 border-sky-800/60'
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

      {/* Temporal Durable Execution Notice */}
      <div className="mt-auto pt-4 border-t border-slate-800/80">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Temporal.io Durable Engine</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            State transitions orchestrated via distributed workflows with signal recovery.
          </p>
          <div className="mt-2 text-[9px] font-mono-numbers text-slate-400">
            TEAM 6 · INFOTACT SOLUTIONS
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-60 shrink-0 sticky top-[57px] h-[calc(100vh-57px)]">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10">{content}</div>
        </div>
      )}
    </>
  );
};
