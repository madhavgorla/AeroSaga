import React from 'react';
import type { MissionStatus } from '../../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  RotateCcw,
  WifiOff,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: MissionStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toUpperCase();

  const getStatusConfig = () => {
    switch (normalized) {
      case 'IN_PROGRESS':
        return {
          icon: <PlayCircle className="w-3.5 h-3.5 text-sky-400" />,
          label: 'In Progress',
          classes: 'text-sky-300 bg-sky-950/60 border border-sky-800/60',
        };
      case 'SCHEDULED':
      case 'CREATED':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
          label: normalized === 'CREATED' ? 'Created' : 'Scheduled',
          classes: 'text-amber-300 bg-amber-950/60 border border-amber-800/60',
        };
      case 'SUSPENDED_OFFLINE':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Suspended (Offline)',
          classes: 'text-rose-300 bg-rose-950/70 border border-rose-800/70',
        };
      case 'RECOVERING':
        return {
          icon: <RotateCcw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />,
          label: 'Recovering Workflow',
          classes: 'text-cyan-300 bg-cyan-950/60 border border-cyan-800/60',
        };
      case 'RETURNING':
        return {
          icon: <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />,
          label: 'Returning to Base',
          classes: 'text-indigo-300 bg-indigo-950/60 border border-indigo-800/60',
        };
      case 'COMPLETED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Completed',
          classes: 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/60',
        };
      case 'ABORTED':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Aborted',
          classes: 'text-slate-300 bg-slate-900/80 border border-slate-700/60',
        };
      case 'FAILED':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
          label: 'Failed',
          classes: 'text-red-300 bg-red-950/70 border border-red-800/70',
        };
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
          label: status,
          classes: 'text-slate-300 bg-slate-800 border border-slate-700',
        };
    }
  };

  const config = getStatusConfig();
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md font-mono-numbers tracking-wide ${pad} ${config.classes}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
