import React, { useState, useMemo } from 'react';
import type { Mission, Drone } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import {
  GitBranch,
  RadioTower,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  Layers,
  ArrowRight,
  Clock,
  Activity,
  Cpu,
  CornerDownRight,
  Zap,
} from 'lucide-react';

interface WorkflowInspectorProps {
  missions: Mission[];
  drones: Drone[];
  selectedMissionId?: string | null;
  onSelectMission: (missionId: string) => void;
  onSignalOffline: (droneId: string) => Promise<void>;
  onSignalReconnect: (droneId: string) => Promise<void>;
  onAbortMission: (missionId: string) => void;
}

interface WorkflowStep {
  id: string;
  name: string;
  phase: string;
  description: string;
  type: 'activity' | 'signal_listener' | 'state_transition' | 'terminal';
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'STEP_INIT',
    name: 'Workflow Initialization',
    phase: 'Schedule',
    description: 'Registers delivery request in task queue: aerosaga-delivery-queue',
    type: 'state_transition',
  },
  {
    id: 'STEP_PREFLIGHT',
    name: 'Hardware Pre-Flight Check',
    phase: 'Diagnostics',
    description: 'Verifies drone battery > 20%, GPS lock, and motor telemetry',
    type: 'activity',
  },
  {
    id: 'STEP_AIRSPACE',
    name: 'Geofence Clearance',
    phase: 'Routing',
    description: 'Validates waypoint coordinates against active No-Fly Zones',
    type: 'activity',
  },
  {
    id: 'STEP_NAVIGATION',
    name: 'Waypoint Navigation Loop',
    phase: 'In-Flight',
    description: 'Executes waypoint route with continuous heartbeat telemetry',
    type: 'activity',
  },
  {
    id: 'STEP_SIGNAL_GATE',
    name: 'Temporal Signal Listener',
    phase: 'Durable Gate',
    description: 'Durable wait state: handles "offline" signal & waits for "reconnected"',
    type: 'signal_listener',
  },
  {
    id: 'STEP_DELIVERY',
    name: 'Payload Touchdown',
    phase: 'Execution',
    description: 'Reaches target destination and verifies payload drop confirmation',
    type: 'activity',
  },
  {
    id: 'STEP_RETURN',
    name: 'Return to Base (RTB)',
    phase: 'Terminal',
    description: 'Autonomous return corridor to Dispatch Hub Alpha & workflow completion',
    type: 'terminal',
  },
];

export const WorkflowInspector: React.FC<WorkflowInspectorProps> = ({
  missions,
  drones,
  selectedMissionId,
  onSelectMission,
  onSignalOffline,
  onSignalReconnect,
  onAbortMission,
}) => {
  const [activeMissionId, setActiveMissionId] = useState<string>(
    selectedMissionId || missions[0]?.missionId || ''
  );
  const [isSignaling, setIsSignaling] = useState(false);

  // Synchronize when prop changes
  React.useEffect(() => {
    if (selectedMissionId) {
      setActiveMissionId(selectedMissionId);
    }
  }, [selectedMissionId]);

  const currentMission = useMemo(() => {
    return missions.find((m) => m.missionId === activeMissionId) || missions[0];
  }, [missions, activeMissionId]);

  const assignedDrone = useMemo(() => {
    if (!currentMission) return undefined;
    return drones.find((d) => d.droneId === currentMission.droneId);
  }, [drones, currentMission]);

  // Determine active step index based on current mission status
  const currentStepIndex = useMemo(() => {
    if (!currentMission) return 0;
    switch (currentMission.status) {
      case 'CREATED':
        return 0;
      case 'SCHEDULED':
        return 1;
      case 'IN_PROGRESS':
        return 3;
      case 'SUSPENDED_OFFLINE':
        return 4;
      case 'RECOVERING':
        return 4;
      case 'RETURNING':
        return 5;
      case 'COMPLETED':
        return 6;
      case 'ABORTED':
      case 'FAILED':
        return 4;
      default:
        return 2;
    }
  }, [currentMission]);

  const handleOffline = async () => {
    if (!currentMission || isSignaling) return;
    setIsSignaling(true);
    try {
      await onSignalOffline(currentMission.droneId);
    } finally {
      setIsSignaling(false);
    }
  };

  const handleReconnect = async () => {
    if (!currentMission || isSignaling) return;
    setIsSignaling(true);
    try {
      await onSignalReconnect(currentMission.droneId);
    } finally {
      setIsSignaling(false);
    }
  };

  if (!currentMission) {
    return (
      <div className="p-8 text-center text-slate-400 border border-slate-800 rounded-xl bg-[#090f20]">
        No active missions found to inspect.
      </div>
    );
  }

  const isOffline = currentMission.status === 'SUSPENDED_OFFLINE';
  const isRecovering = currentMission.status === 'RECOVERING';
  const isCompleted = currentMission.status === 'COMPLETED';
  const isAborted = currentMission.status === 'ABORTED';

  return (
    <div className="space-y-6">
      {/* Top Banner: Mission Selector & Workflow Metadata */}
      <div className="p-4 md:p-6 rounded-xl bg-[#0a1124] border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-numbers text-sky-400 mb-1">
              <GitBranch className="w-3.5 h-3.5" />
              <span>TEMPORAL.IO DURABLE WORKFLOW ORCHESTRATION</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Workflow Inspector: {currentMission.missionId}</span>
              <StatusBadge status={currentMission.status} size="sm" />
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspecting state machine execution graph, durable signal listeners, and replay history.
            </p>
          </div>

          {/* Mission Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono-numbers hidden sm:inline">
              Select Mission:
            </span>
            <select
              value={currentMission.missionId}
              onChange={(e) => {
                setActiveMissionId(e.target.value);
                onSelectMission(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 font-mono-numbers"
            >
              {missions.map((m) => (
                <option key={m.missionId} value={m.missionId}>
                  {m.missionId} ({m.status}) — {m.droneId}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Workflow Specs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono-numbers">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">TEMPORAL WORKFLOW ID</span>
            <span className="font-semibold text-slate-200 truncate block">
              {currentMission.workflowId}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">ASSIGNED DRONE</span>
            <span className="font-semibold text-sky-400 flex items-center gap-1.5">
              <span>{currentMission.droneId}</span>
              {assignedDrone && (
                <span className="text-[10px] text-slate-400">({assignedDrone.batteryPercent}%)</span>
              )}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">TASK QUEUE</span>
            <span className="font-semibold text-emerald-400">aerosaga-delivery-queue</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">DESTINATION TARGET</span>
            <span className="font-semibold text-slate-200 truncate block">
              {currentMission.destination}
            </span>
          </div>
        </div>
      </div>

      {/* Main Workflow DAG State Machine Pipeline */}
      <div className="p-4 md:p-6 rounded-xl bg-[#090f20] border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Durable State Machine Execution Pipeline</span>
          </h3>
          <span className="text-xs font-mono-numbers text-slate-400">
            Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length}
          </span>
        </div>

        {/* Linear Stage Pipeline View */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isPassed = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isUpcoming = idx > currentStepIndex;
            const isSignalStep = step.id === 'STEP_SIGNAL_GATE';

            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between relative ${
                  isCurrent
                    ? isOffline
                      ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-950/40'
                      : isRecovering
                      ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/40'
                      : isCompleted
                      ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-950/40'
                      : 'bg-sky-950/40 border-sky-500/80 shadow-lg shadow-sky-950/40'
                    : isPassed
                    ? 'bg-slate-900/80 border-slate-700/80 opacity-90'
                    : 'bg-slate-950/50 border-slate-800/60 opacity-50'
                }`}
              >
                {/* Step Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[9px] font-mono-numbers px-1.5 py-0.5 rounded uppercase font-semibold ${
                        isCurrent
                          ? isOffline
                            ? 'bg-rose-900 text-rose-200'
                            : 'bg-sky-900 text-sky-200'
                          : isPassed
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.phase}
                    </span>

                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <div
                        className={`w-2.5 h-2.5 rounded-full animate-ping ${
                          isOffline ? 'bg-rose-400' : 'bg-sky-400'
                        }`}
                      />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                    )}
                  </div>

                  <h4
                    className={`text-xs font-bold leading-tight ${
                      isCurrent
                        ? isOffline
                          ? 'text-rose-200'
                          : 'text-sky-200'
                        : isPassed
                        ? 'text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.name}
                  </h4>

                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Step Footer Badge */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono-numbers">
                  <span className="text-slate-400">{step.type.replace('_', ' ')}</span>
                  {isCurrent && (
                    <span
                      className={`font-semibold ${
                        isOffline ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Signal Trigger Testbench */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded-lg bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">
                Temporal Signal Injection Testbench
              </h4>
              <p className="text-[11px] text-slate-400">
                Send live signals to the Spring Boot Temporal workflow for{' '}
                <span className="font-mono text-sky-400">{currentMission.droneId}</span>.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isOffline ? (
              <button
                onClick={handleOffline}
                disabled={isSignaling || isCompleted || isAborted}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 disabled:opacity-40 transition-colors"
                title="Send offline telemetry signal to suspend workflow"
              >
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Simulate Loss of Signal</span>
              </button>
            ) : (
              <button
                onClick={handleReconnect}
                disabled={isSignaling}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 disabled:opacity-40 transition-colors"
                title="Send reconnect signal to resume workflow"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Signal Reconnected</span>
              </button>
            )}

            {!isCompleted && !isAborted && (
              <button
                onClick={() => onAbortMission(currentMission.missionId)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                Abort Workflow
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
