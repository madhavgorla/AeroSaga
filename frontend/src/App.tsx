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
import { DroneCameraFeed } from './components/camera/DroneCameraFeed';
import { DroneLocationModal } from './components/drones/DroneLocationModal';
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
  Camera,
  Layers,
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

  // AI & Voice Modals state
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Optical Camera & Airspace View state
  const [airspaceView, setAirspaceView] = useState<'radar' | 'camera' | 'split'>('radar');
  const [selectedCameraDroneId, setSelectedCameraDroneId] = useState<string>('DRONE-001');

  // Drone Location Place Inspection Modal state
  const [inspectedLocationDrone, setInspectedLocationDrone] = useState<Drone | null>(null);

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

  // Real-time live drone location API subscription
  useEffect(() => {
    const unsubscribe = apiService.subscribeLiveDroneLocations((updatedDrones) => {
      setDrones([...updatedDrones]);
    }, 1500);

    return () => unsubscribe();
  }, []);

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

      {/* Sleek Mock Mode Banner */}
      {isMockMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong className="font-semibold text-amber-100">SIMULATION MODE:</strong> Connected to local fleet telemetry engine (Spring Boot REST API on :8080 offline).
            </span>
          </div>

          <button
            onClick={() => {
              apiService.setForceMock(false);
              loadData(true);
            }}
            className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 font-medium text-[11px] transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Live API</span>
          </button>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all backdrop-blur-sm group">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span className="text-[11px] font-medium tracking-wider">TOTAL MISSIONS</span>
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono-numbers text-white tracking-tight">
                {String(missions.length).padStart(2, '0')}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-numbers">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>REST API Synced</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-sky-800/50 transition-all backdrop-blur-sm group">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span className="text-[11px] font-medium tracking-wider">ACTIVE WORKFLOWS</span>
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <RadioTower className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono-numbers text-sky-400 tracking-tight">
                {String(activeWorkflowsCount).padStart(2, '0')}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-numbers">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>Temporal Durable State</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-rose-800/50 transition-all backdrop-blur-sm group">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span className="text-[11px] font-medium tracking-wider">OFFLINE SUSPENDED</span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <WifiOff className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono-numbers text-rose-400 tracking-tight">
                {String(offlineWaitingCount).padStart(2, '0')}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-numbers">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Pending Reconnection</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-emerald-800/50 transition-all backdrop-blur-sm group">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono-numbers">
                <span className="text-[11px] font-medium tracking-wider">AVAILABLE DRONES</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <BatteryCharging className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono-numbers text-emerald-400 tracking-tight">
                {String(availableDronesCount).padStart(2, '0')} <span className="text-sm text-slate-500 font-normal">/ {drones.length}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-numbers">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Ready For Dispatch</span>
              </div>
            </div>
          </div>

          {/* Tab 1: Overview (Fleet Command) */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Tactical Airspace Map & Live Optical Gimbal Stream */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl">
                    <button
                      onClick={() => setAirspaceView('radar')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        airspaceView === 'radar'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Tactical Radar</span>
                    </button>

                    <button
                      onClick={() => setAirspaceView('camera')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        airspaceView === 'camera'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <Camera className="w-3.5 h-3.5" />
                      <span>Live 4K Camera Feed</span>
                    </button>

                    <button
                      onClick={() => setAirspaceView('split')}
                      className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        airspaceView === 'split'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Split Screen</span>
                    </button>
                  </div>

                  <div className="text-xs font-mono-numbers text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Real-Time Sensor Link: <strong className="text-sky-400">{selectedCameraDroneId}</strong></span>
                  </div>
                </div>

                {airspaceView === 'radar' && (
                  <TacticalMap
                    drones={drones}
                    missions={missions}
                    onSelectMission={(id) => setSelectedMissionId(id)}
                    onSelectDrone={(droneId) => {
                      setSelectedCameraDroneId(droneId);
                      showToast({
                        type: 'info',
                        title: `Camera Target: ${droneId}`,
                        description: `Live optical gimbal feed linked to ${droneId}.`,
                      });
                    }}
                    onInspectLocation={(drone) => setInspectedLocationDrone(drone)}
                  />
                )}

                {airspaceView === 'camera' && (
                  <DroneCameraFeed
                    drones={drones}
                    activeDroneId={selectedCameraDroneId}
                    onSelectDrone={(droneId) => setSelectedCameraDroneId(droneId)}
                  />
                )}

                {airspaceView === 'split' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <TacticalMap
                      drones={drones}
                      missions={missions}
                      onSelectMission={(id) => setSelectedMissionId(id)}
                      onSelectDrone={(droneId) => setSelectedCameraDroneId(droneId)}
                      onInspectLocation={(drone) => setInspectedLocationDrone(drone)}
                    />
                    <DroneCameraFeed
                      drones={drones}
                      activeDroneId={selectedCameraDroneId}
                      onSelectDrone={(droneId) => setSelectedCameraDroneId(droneId)}
                    />
                  </div>
                )}
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
                  onInspectLocation={(drone) => setInspectedLocationDrone(drone)}
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
                isBusy={refreshing}
              />
            </div>
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
                onInspectLocation={(drone) => setInspectedLocationDrone(drone)}
              />

              {/* Live Fleet GPS Coordinates Monitor Table */}
              <div className="rounded-2xl border border-slate-800/80 bg-[#090e1a]/90 backdrop-blur-xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-semibold text-white">
                      Live Fleet GPS Telemetry Stream (1 Hz)
                    </h3>
                  </div>
                  <span className="text-xs font-mono-numbers text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full">
                    GET /api/drones/live
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono-numbers">
                    <thead>
                      <tr className="border-b border-slate-800/70 bg-slate-950/40 text-[11px] text-slate-400">
                        <th className="py-2.5 px-4 font-semibold">DRONE ID</th>
                        <th className="py-2.5 px-4 font-semibold">LIVE GPS LOCATION</th>
                        <th className="py-2.5 px-4 font-semibold">ALTITUDE</th>
                        <th className="py-2.5 px-4 font-semibold">GROUND SPEED</th>
                        <th className="py-2.5 px-4 font-semibold">HEADING</th>
                        <th className="py-2.5 px-4 font-semibold">BATTERY</th>
                        <th className="py-2.5 px-4 font-semibold">SIGNAL RSSI</th>
                        <th className="py-2.5 px-4 font-semibold text-right">MISSION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {drones.map((d) => (
                        <tr key={d.droneId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>{d.droneId}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-sans block">{d.model}</span>
                          </td>
                          <td className="py-3 px-4 text-sky-300 font-medium">
                            {d.currentLocation.latitude.toFixed(6)}° N, {d.currentLocation.longitude.toFixed(6)}° E
                          </td>
                          <td className="py-3 px-4 text-slate-200">
                            {d.altitudeMeters || 0} m AGL
                          </td>
                          <td className="py-3 px-4 text-slate-200">
                            {d.speedKmh || 0} km/h
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {d.headingDeg || 0}° HDG
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-400">
                            {d.batteryPercent}%
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {d.signalRssi || -55} dBm ({d.satellitesLocked || 18} sats)
                          </td>
                          <td className="py-3 px-4 text-right">
                            {d.currentMissionId ? (
                              <button
                                onClick={() => setSelectedMissionId(d.currentMissionId!)}
                                className="px-2 py-1 rounded bg-sky-950/60 text-sky-300 border border-sky-800/60 hover:bg-sky-900/60 transition-colors text-[11px]"
                              >
                                {d.currentMissionId}
                              </button>
                            ) : (
                              <span className="text-slate-600">IDLE</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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

      {/* Live Drone Location & Landmark Proximity Modal */}
      <DroneLocationModal
        drone={inspectedLocationDrone}
        onClose={() => setInspectedLocationDrone(null)}
        onViewCamera={(droneId) => {
          setSelectedCameraDroneId(droneId);
          setAirspaceView('camera');
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
