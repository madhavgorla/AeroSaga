import React, { useEffect, useState, useCallback } from 'react';
import type { Drone, Mission, Waypoint } from './types';
import { apiService } from './services/api';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TacticalMap } from './components/tactical/TacticalMap';
import { MissionsTable } from './components/missions/MissionsTable';
import { DroneFleetGrid } from './components/drones/DroneFleetGrid';
import { MissionDetailDrawer } from './components/missions/MissionDetailDrawer';
import { LaunchMissionModal } from './components/missions/LaunchMissionModal';
import { AbortModal } from './components/missions/AbortModal';
import { RerouteMissionModal } from './components/missions/RerouteMissionModal';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { DiagnosticsPanel } from './components/diagnostics/DiagnosticsPanel';
import { WorkflowInspector } from './components/workflow/WorkflowInspector';
import { FlightReplayModal } from './components/missions/FlightReplayModal';
import { GeminiChatbot } from './components/ai/GeminiChatbot';
import { LiveVoiceModal } from './components/ai/LiveVoiceModal';
import { ToastProvider, useToast } from './components/ui/Toast';
import {
  Activity,
  RadioTower,
  WifiOff,
  BatteryCharging,
  Plane,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Radio,
  ArrowRight,
} from 'lucide-react';

function DashboardContent() {
  const { showToast } = useToast();
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isMockMode, setIsMockMode] = useState<boolean>(apiService.isUsingMock());

  // Navigation drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Modals & Drawers state
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [isLaunchOpen, setIsLaunchOpen] = useState<boolean>(false);
  const [abortTargetId, setAbortTargetId] = useState<string | null>(null);
  const [rerouteTargetMission, setRerouteTargetMission] = useState<Mission | null>(null);
  const [replayMission, setReplayMission] = useState<Mission | null>(null);

  // AI & Voice Modals state
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Fetch fleet telemetry from backend
  const loadData = useCallback(
    async (showNotification = false) => {
      setRefreshing(true);
      try {
        const [missionsData, dronesData] = await Promise.all([
          apiService.getMissions(),
          apiService.getDrones(),
        ]);
        setMissions(missionsData);
        setDrones(dronesData);
        setIsMockMode(apiService.isUsingMock());

        if (showNotification) {
          showToast({
            type: 'info',
            title: 'Fleet telemetry synced',
            description: `${missionsData.length} missions and ${dronesData.length} drones loaded.`,
          });
        }
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Sync failed',
          description: err instanceof Error ? err.message : 'Could not fetch fleet telemetry',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Mission (strictly through Spring Boot REST API)
  const handleCreateMission = async (data: {
    droneId: string;
    destination: string;
    waypoints: Waypoint[];
  }) => {
    try {
      const created = await apiService.createMission(data);

      showToast({
        type: 'success',
        title: 'Mission Dispatched',
        description: `Mission ${created.missionId} created. Temporal Workflow ${created.workflowId} initialized.`,
      });
      await loadData();
      setSelectedMissionId(created.missionId);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Launch Failed',
        description: err instanceof Error ? err.message : 'Error creating mission',
      });
      throw err;
    }
  };

  // Handle Abort Mission
  const handleConfirmAbort = async (missionId: string) => {
    try {
      await apiService.abortMission(missionId);
      showToast({
        type: 'warning',
        title: 'Abort Signal Accepted',
        description: `Temporal workflow for ${missionId} instructed to initiate controlled landing.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Abort Signal Failed',
        description: err instanceof Error ? err.message : 'Error aborting mission',
      });
    }
  };

  // Handle Reroute Mission
  const handleConfirmReroute = async (missionId: string, waypoints: Waypoint[]) => {
    try {
      await apiService.rerouteMission(missionId, waypoints);
      showToast({
        type: 'success',
        title: 'Reroute Signal Transmitted',
        description: `Replacement flight path delivered to Temporal workflow ${missionId}.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Reroute Failed',
        description: err instanceof Error ? err.message : 'Error rerouting mission',
      });
    }
  };

  // Handle Drone Signal Simulation (Offline)
  const handleSignalOffline = async (droneId: string) => {
    try {
      const res = await apiService.signalDroneOffline(droneId);
      showToast({
        type: 'warning',
        title: 'Temporal Signal Sent: Drone Offline',
        description: res.message,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Signal Failed',
        description: err instanceof Error ? err.message : 'Could not signal offline',
      });
    }
  };

  // Handle Drone Signal Simulation (Reconnected)
  const handleSignalReconnect = async (droneId: string) => {
    try {
      const res = await apiService.signalDroneReconnected(droneId);
      showToast({
        type: 'success',
        title: 'Temporal Signal Sent: Drone Reconnected',
        description: res.message,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Signal Failed',
        description: err instanceof Error ? err.message : 'Could not signal reconnect',
      });
    }
  };

  // Statistics
  const activeWorkflowsCount = missions.filter((m) =>
    ['SCHEDULED', 'IN_PROGRESS', 'RECOVERING', 'RETURNING'].includes(m.status)
  ).length;

  const offlineWaitingCount = missions.filter(
    (m) => m.status === 'SUSPENDED_OFFLINE'
  ).length;

  const availableDronesCount = drones.filter((d) => d.status === 'AVAILABLE').length;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col">
      {/* Top Bar with Global Search and Navigation */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenLaunchModal={() => setIsLaunchOpen(true)}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
        isMockMode={isMockMode}
        onToggleMobileMenu={() => setMobileMenuOpen(true)}
        drones={drones}
        missions={missions}
        onSelectDrone={(droneId) => {
          setCurrentTab('drones');
          showToast({
            type: 'info',
            title: `Navigated to ${droneId}`,
            description: `Inspecting telemetry and Temporal signal controls for ${droneId}.`,
          });
        }}
        onSelectMission={(missionId) => {
          setSelectedMissionId(missionId);
        }}
        onFilterStatus={() => {
          setCurrentTab('missions');
        }}
      />

      {/* Point 4 Fix: Clear "Mock mode" banner when simulated data is active */}
      {isMockMode && (
        <div className="bg-amber-950/80 border-b border-amber-600/60 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="font-semibold text-white">MOCK MODE ACTIVE:</strong> Spring
              Boot REST API (<code className="font-mono text-amber-300">http://localhost:8080</code>) is
              currently offline or unreachable. Displaying local simulated fleet data.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                apiService.setForceMock(false);
                loadData(true);
              }}
              className="px-2.5 py-1 rounded bg-amber-900 hover:bg-amber-800 text-white font-medium text-[11px] border border-amber-600/60 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Live API</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          activeCount={activeWorkflowsCount}
          offlineCount={offlineWaitingCount}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb & Tab Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
            <div>
              <div className="text-[11px] font-mono-numbers text-slate-400 uppercase tracking-wider mb-1">
                AEROSAGA · AUTONOMOUS DRONE MISSION CONTROL
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {currentTab === 'overview' && 'Fleet Operations Command'}
                {currentTab === 'missions' && 'Mission Explorer & Timeline'}
                {currentTab === 'workflow' && 'Temporal Workflow Inspector & State Machine'}
                {currentTab === 'drones' && 'Drone Fleet & Telemetry Signals'}
                {currentTab === 'analytics' && 'Operational Analytics & KPIs'}
                {currentTab === 'diagnostics' && 'API Integration & Health'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAIChatOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-200 bg-sky-950/60 border border-sky-700/60 hover:bg-sky-900/60 rounded-lg shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>AI Copilot</span>
              </button>

              <button
                onClick={() => setIsLaunchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Delivery Mission</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span>TOTAL MISSIONS</span>
                <Activity className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-numbers text-white">
                {String(missions.length).padStart(2, '0')}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono-numbers">
                Loaded via REST API
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span>ACTIVE WORKFLOWS</span>
                <RadioTower className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-numbers text-sky-400">
                {String(activeWorkflowsCount).padStart(2, '0')}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono-numbers">
                Temporal durable state
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span>OFFLINE WAITING</span>
                <WifiOff className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-numbers text-rose-400">
                {String(offlineWaitingCount).padStart(2, '0')}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono-numbers">
                Suspended pending reconnect
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0b1325] border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span>AVAILABLE DRONES</span>
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-numbers text-emerald-400">
                {String(availableDronesCount).padStart(2, '0')} / {drones.length}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono-numbers">
                Ready for dispatch
              </div>
            </div>
          </div>

          {/* Tab 1: Overview (Fleet Command) */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Tactical Airspace Map */}
              <div>
                <TacticalMap
                  drones={drones}
                  missions={missions}
                  onSelectMission={(id) => setSelectedMissionId(id)}
                />
              </div>

              {/* Drones Quick Signal Bar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Plane className="w-4 h-4 text-sky-400" />
                    <span>Drone Fleet & Durable Signal Triggers</span>
                  </h2>
                  <span className="text-[11px] font-mono-numbers text-slate-400">
                    Test Temporal offline/reconnect recovery
                  </span>
                </div>
                <DroneFleetGrid
                  drones={drones}
                  onSignalOffline={handleSignalOffline}
                  onSignalReconnect={handleSignalReconnect}
                  onSelectMission={(id) => setSelectedMissionId(id)}
                />
              </div>

              {/* Recent Missions Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Recent Autonomous Missions
                  </h2>
                </div>
                <MissionsTable
                  missions={missions}
                  onSelectMission={(id) => setSelectedMissionId(id)}
                  onAbortMission={(id) => setAbortTargetId(id)}
                  onRerouteMission={(m) => setRerouteTargetMission(m)}
                  onOpenReplay={(m) => setReplayMission(m)}
                  isBusy={refreshing}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Mission Explorer */}
          {currentTab === 'missions' && (
            <div className="space-y-4">
              <MissionsTable
                missions={missions}
                onSelectMission={(id) => setSelectedMissionId(id)}
                onAbortMission={(id) => setAbortTargetId(id)}
                onRerouteMission={(m) => setRerouteTargetMission(m)}
                onOpenReplay={(m) => setReplayMission(m)}
                isBusy={refreshing}
              />
            </div>
          )}

          {/* Tab 3: Workflow Inspector */}
          {currentTab === 'workflow' && (
            <WorkflowInspector
              missions={missions}
              drones={drones}
              selectedMissionId={selectedMissionId}
              onSelectMission={(id) => setSelectedMissionId(id)}
              onSignalOffline={handleSignalOffline}
              onSignalReconnect={handleSignalReconnect}
              onAbortMission={(id) => setAbortTargetId(id)}
            />
          )}

          {/* Tab 3: Drone Telemetry */}
          {currentTab === 'drones' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-sky-400 font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Interactive Temporal Signal Testing</span>
                </div>
                Simulate drone disconnection and reconnection signals to verify Temporal's
                workflow pause and recovery logic. All transitions reflect in real time.
              </div>

              <DroneFleetGrid
                drones={drones}
                onSignalOffline={handleSignalOffline}
                onSignalReconnect={handleSignalReconnect}
                onSelectMission={(id) => setSelectedMissionId(id)}
              />
            </div>
          )}

          {/* Tab 4: Analytics */}
          {currentTab === 'analytics' && (
            <AnalyticsView missions={missions} drones={drones} />
          )}

          {/* Tab 5: Diagnostics & Backend Integration */}
          {currentTab === 'diagnostics' && (
            <DiagnosticsPanel
              isMockMode={isMockMode}
              onToggleMockMode={(mock) => {
                apiService.setForceMock(mock);
                setIsMockMode(mock);
                loadData(true);
              }}
              onRefresh={() => loadData(true)}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060a14] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono-numbers">
        <div className="flex items-center gap-2">
          <span>AeroSaga Autonomous Drone Mission Control</span>
          <span>·</span>
          <span>Team 6 (Infotact Solutions)</span>
        </div>
        <div>
          <span>Durable Orchestration: Temporal.io</span>
          <span className="mx-2">·</span>
          <span>REST API: Spring Boot</span>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <LaunchMissionModal
        isOpen={isLaunchOpen}
        onClose={() => setIsLaunchOpen(false)}
        drones={drones}
        onSubmit={handleCreateMission}
      />

      <MissionDetailDrawer
        missionId={selectedMissionId}
        onClose={() => setSelectedMissionId(null)}
        onAbort={(id) => {
          setSelectedMissionId(null);
          setAbortTargetId(id);
        }}
        onReroute={(m) => {
          setSelectedMissionId(null);
          setRerouteTargetMission(m);
        }}
        onOpenReplay={(m) => {
          setReplayMission(m);
        }}
      />

      <FlightReplayModal
        isOpen={!!replayMission}
        onClose={() => setReplayMission(null)}
        mission={replayMission}
      />

      <AbortModal
        isOpen={!!abortTargetId}
        missionId={abortTargetId}
        onClose={() => setAbortTargetId(null)}
        onConfirm={handleConfirmAbort}
      />

      <RerouteMissionModal
        isOpen={!!rerouteTargetMission}
        mission={rerouteTargetMission}
        onClose={() => setRerouteTargetMission(null)}
        onSubmit={handleConfirmReroute}
      />

      {/* Gemini AI Multi-turn Chatbot Drawer */}
      <GeminiChatbot
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        onOpenVoiceMode={() => {
          setIsAIChatOpen(false);
          setIsVoiceModalOpen(true);
        }}
      />

      {/* Gemini Live Voice Radio Modal */}
      <LiveVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
