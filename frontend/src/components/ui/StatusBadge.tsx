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
          dotColor: 'bg-sky-400',
          label: 'In Progress',
          classes: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
        };
      case 'SCHEDULED':
      case 'CREATED':
        return {
          dotColor: 'bg-amber-400',
          label: normalized === 'CREATED' ? 'Created' : 'Scheduled',
          classes: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
        };
      case 'SUSPENDED_OFFLINE':
        return {
          dotColor: 'bg-rose-400 animate-pulse',
          label: 'Suspended (Offline)',
          classes: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
        };
      case 'RECOVERING':
        return {
          dotColor: 'bg-cyan-400 animate-spin',
          label: 'Recovering Workflow',
          classes: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
        };
      case 'RETURNING':
        return {
          dotColor: 'bg-indigo-400',
          label: 'Returning to Base',
          classes: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'COMPLETED':
        return {
          dotColor: 'bg-emerald-400',
          label: 'Completed',
          classes: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'ABORTED':
        return {
          dotColor: 'bg-slate-400',
          label: 'Aborted',
          classes: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
        };
      case 'FAILED':
        return {
          dotColor: 'bg-red-400',
          label: 'Failed',
          classes: 'text-red-300 bg-red-500/10 border-red-500/20',
        };
      default:
        return {
          dotColor: 'bg-slate-400',
          label: status,
          classes: 'text-slate-300 bg-slate-800 border-slate-700',
        };
    }
  };

  const config = getStatusConfig();
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border font-mono-numbers tracking-wide transition-colors ${pad} ${config.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} />
      <span>{config.label}</span>
    </span>
  );
};
