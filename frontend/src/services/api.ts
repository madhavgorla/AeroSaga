import type {
  Drone,
  HealthResponse,
  Mission,
  MissionEvent,
  MissionRequest,
  Waypoint,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Initial Simulation Store (Active when Spring Boot backend is starting up or in Dev Demo)
const INITIAL_DRONES: Drone[] = [
  {
    droneId: 'DRONE-001',
    model: 'AeroSky Courier X4',
    status: 'IN_FLIGHT',
    batteryPercent: 82,
    currentLocation: { latitude: 16.512, longitude: 80.642 },
    currentMissionId: 'MSN-7841',
    lastHeartbeat: new Date().toISOString(),
    speedKmh: 54,
    altitudeMeters: 120,
  },
  {
    droneId: 'DRONE-002',
    model: 'AeroSky HeavyLift V2',
    status: 'OFFLINE_WAITING',
    batteryPercent: 68,
    currentLocation: { latitude: 16.521, longitude: 80.635 },
    currentMissionId: 'MSN-7842',
    lastHeartbeat: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    speedKmh: 0,
    altitudeMeters: 95,
  },
  {
    droneId: 'DRONE-003',
    model: 'AeroSky Courier X4',
    status: 'AVAILABLE',
    batteryPercent: 96,
    currentLocation: { latitude: 16.5062, longitude: 80.648 },
    currentMissionId: null,
    lastHeartbeat: new Date().toISOString(),
    speedKmh: 0,
    altitudeMeters: 0,
  },
  {
    droneId: 'DRONE-004',
    model: 'AeroSky LongRange Scout',
    status: 'AVAILABLE',
    batteryPercent: 91,
    currentLocation: { latitude: 16.5062, longitude: 80.648 },
    currentMissionId: null,
    lastHeartbeat: new Date().toISOString(),
    speedKmh: 0,
    altitudeMeters: 0,
  },
];

const INITIAL_MISSIONS: Mission[] = [
  {
    missionId: 'MSN-7841',
    workflowId: 'wf-mission-7841-temporal',
    droneId: 'DRONE-001',
    destination: 'Sector 4 Coastal Depot',
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    waypoints: [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.512, longitude: 80.642, name: 'Midway Checkpoint C1' },
      { latitude: 16.528, longitude: 80.621, name: 'Sector 4 Coastal Depot' },
    ],
    currentWaypointIndex: 1,
    batteryPercent: 82,
    payloadKg: 3.4,
    estimatedArrival: '12 mins',
    message: 'En route to Sector 4. Air corridor clear.',
  },
  {
    missionId: 'MSN-7842',
    workflowId: 'wf-mission-7842-temporal',
    droneId: 'DRONE-002',
    destination: 'Warehouse B',
    status: 'SUSPENDED_OFFLINE',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    waypoints: [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.52, longitude: 80.63, name: 'Warehouse B' },
    ],
    currentWaypointIndex: 1,
    batteryPercent: 68,
    payloadKg: 5.1,
    estimatedArrival: 'Paused',
    message: 'Telemetry heartbeat missed. Workflow waiting in durable signal state.',
  },
  {
    missionId: 'MSN-7839',
    workflowId: 'wf-mission-7839-temporal',
    droneId: 'DRONE-003',
    destination: 'Metro Emergency Clinic',
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    waypoints: [
      { latitude: 16.5062, longitude: 80.648, name: 'Dispatch Hub Alpha' },
      { latitude: 16.519, longitude: 80.655, name: 'Metro Emergency Clinic' },
    ],
    currentWaypointIndex: 2,
    batteryPercent: 96,
    payloadKg: 1.8,
    message: 'Medical package safely delivered. Drone returned to base.',
  },
];

const INITIAL_EVENTS: Record<string, MissionEvent[]> = {
  'MSN-7841': [
    {
      id: 'evt-101',
      missionId: 'MSN-7841',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      eventType: 'WORKFLOW_CREATED',
      severity: 'info',
      details: 'Mission accepted and validated by Spring Boot API. Temporal Workflow ID: wf-mission-7841-temporal.',
    },
    {
      id: 'evt-102',
      missionId: 'MSN-7841',
      timestamp: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
      eventType: 'WORKFLOW_STARTED',
      severity: 'info',
      details: 'Takeoff clearance granted. DRONE-001 departed Dispatch Hub Alpha.',
    },
    {
      id: 'evt-103',
      missionId: 'MSN-7841',
      timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      eventType: 'WAYPOINT_REACHED',
      severity: 'success',
      details: 'Reached Midway Checkpoint C1 at altitude 120m. Heading north-west.',
    },
  ],
  'MSN-7842': [
    {
      id: 'evt-201',
      missionId: 'MSN-7842',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      eventType: 'WORKFLOW_CREATED',
      severity: 'info',
      details: 'Mission created. Temporal Workflow started with durable signal listeners.',
    },
    {
      id: 'evt-202',
      missionId: 'MSN-7842',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      eventType: 'WORKFLOW_STARTED',
      severity: 'info',
      details: 'DRONE-002 airborne en route to Warehouse B.',
    },
    {
      id: 'evt-203',
      missionId: 'MSN-7842',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      eventType: 'TELEMETRY_LOST',
      severity: 'warn',
      details: 'Signal dropped over Industrial Zone B. Zero RF response for 30s.',
    },
    {
      id: 'evt-204',
      missionId: 'MSN-7842',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      eventType: 'WORKFLOW_SUSPENDED',
      severity: 'error',
      details: 'Temporal signal handler transitioned workflow into durable wait state. Polling paused.',
    },
  ],
  'MSN-7839': [
    {
      id: 'evt-301',
      missionId: 'MSN-7839',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      eventType: 'WORKFLOW_CREATED',
      severity: 'info',
      details: 'Emergency medical route prioritized.',
    },
    {
      id: 'evt-302',
      missionId: 'MSN-7839',
      timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      eventType: 'WAYPOINT_REACHED',
      severity: 'success',
      details: 'Payload deposited at Metro Clinic pad.',
    },
    {
      id: 'evt-303',
      missionId: 'MSN-7839',
      timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
      eventType: 'MISSION_COMPLETED',
      severity: 'success',
      details: 'Workflow completed with zero failures. Return to base verified.',
    },
  ],
};

class ApiService {
  private drones: Drone[] = [...INITIAL_DRONES];
  private missions: Mission[] = [...INITIAL_MISSIONS];
  private events: Record<string, MissionEvent[]> = { ...INITIAL_EVENTS };
  private forceMockMode: boolean = false;
  private backendReachable: boolean = false;
  private lastHealthCheckTime: number = 0;

  constructor() {
    // Attempt background health check
    this.checkBackendHealth();
  }

  public getBaseUrl(): string {
    return BASE_URL;
  }

  public isUsingMock(): boolean {
    return this.forceMockMode || !this.backendReachable;
  }

  public setForceMock(mock: boolean) {
    this.forceMockMode = mock;
  }

  public async checkBackendHealth(): Promise<HealthResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${BASE_URL}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: HealthResponse = await res.json();
        this.backendReachable = true;
        this.lastHealthCheckTime = Date.now();
        return data;
      }
    } catch {
      // Backend not running
    }

    this.backendReachable = false;
    this.lastHealthCheckTime = Date.now();
    return {
      status: 'SIMULATED',
      service: 'aerosaga-simulation-engine',
      time: new Date().toISOString(),
    };
  }

  public async getMissions(): Promise<Mission[]> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/missions`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.map((m: any) => ({
              missionId: m.missionId,
              workflowId: m.workflowId || `wf-mission-${m.missionId.toLowerCase()}`,
              droneId: m.droneId,
              destination: m.destination,
              status: m.status,
              createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
              waypoints: Array.isArray(m.waypoints) ? m.waypoints : [],
              message: m.message || `Temporal Mission ${m.missionId}`,
            }));
          }
        }
      } catch (err) {
        console.warn('Real API call failed, falling back to simulated store:', err);
      }
    }
    return [...this.missions];
  }

  public async getMission(missionId: string): Promise<Mission | null> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(missionId)}`);
        if (res.ok) {
          const data = await res.json();
          return {
            missionId: data.missionId,
            workflowId: data.workflowId || `wf-mission-${data.missionId.toLowerCase()}`,
            droneId: data.droneId,
            destination: data.destination,
            status: data.status,
            createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
            waypoints: Array.isArray(data.waypoints) ? data.waypoints : [],
            message: data.message,
          };
        }
      } catch {
        // Fallback
      }
    }
    return this.missions.find((m) => m.missionId === missionId) || null;
  }

  public async createMission(req: MissionRequest): Promise<Mission> {
    // Sanitize payload strictly to match Spring Boot MissionRequest(droneId, destination, waypoints[latitude, longitude])
    const backendPayload = {
      droneId: req.droneId.trim(),
      destination: req.destination.trim(),
      waypoints: (req.waypoints || []).map((wp) => ({
        latitude: Number(Number(wp.latitude).toFixed(7)),
        longitude: Number(Number(wp.longitude).toFixed(7)),
      })),
    };

    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/missions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendPayload),
        });
        if (res.ok) {
          const data = await res.json();
          return {
            missionId: data.missionId,
            workflowId: data.workflowId || `wf-mission-${data.missionId.toLowerCase()}`,
            droneId: data.droneId,
            destination: data.destination,
            status: data.status,
            createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
            waypoints: req.waypoints,
            message: data.message || `Dispatched. Temporal Workflow ${data.workflowId} active in AEROSAGA_MISSION_QUEUE.`,
          };
        }
      } catch (err) {
        console.warn('Real Spring Boot backend rejected or unreachable, serving local fallback:', err);
      }
    }

    // Simulated Workflow Creation
    const id = `MSN-${Math.floor(1000 + Math.random() * 9000)}`;
    const workflowId = `wf-mission-${id.toLowerCase()}-temporal`;

    const newMission: Mission = {
      missionId: id,
      workflowId,
      droneId: req.droneId,
      destination: req.destination,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      waypoints: req.waypoints,
      currentWaypointIndex: 0,
      batteryPercent: 98,
      payloadKg: 2.5,
      estimatedArrival: '18 mins',
      message: `Mission dispatched. Temporal Workflow ${workflowId} executing.`,
    };

    this.missions.unshift(newMission);

    // Update drone status
    const targetDrone = this.drones.find((d) => d.droneId === req.droneId);
    if (targetDrone) {
      targetDrone.status = 'IN_FLIGHT';
      targetDrone.currentMissionId = id;
      targetDrone.speedKmh = 50;
      targetDrone.altitudeMeters = 100;
    }

    // Log event
    this.events[id] = [
      {
        id: `evt-${Date.now()}-1`,
        missionId: id,
        timestamp: new Date().toISOString(),
        eventType: 'WORKFLOW_CREATED',
        severity: 'info',
        details: `Workflow initialized with ${req.waypoints.length} waypoints to ${req.destination}.`,
      },
      {
        id: `evt-${Date.now()}-2`,
        missionId: id,
        timestamp: new Date().toISOString(),
        eventType: 'WORKFLOW_STARTED',
        severity: 'success',
        details: `${req.droneId} cleared for launch from Dispatch Hub Alpha.`,
      },
    ];

    return newMission;
  }

  public async abortMission(missionId: string): Promise<Mission> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(missionId)}/abort`, {
          method: 'POST',
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }

    const m = this.missions.find((x) => x.missionId === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);

    m.status = 'ABORTED';
    m.updatedAt = new Date().toISOString();
    m.message = 'Mission aborted by Mission Controller operator.';

    const drone = this.drones.find((d) => d.droneId === m.droneId);
    if (drone) {
      drone.status = 'AVAILABLE';
      drone.currentMissionId = null;
      drone.speedKmh = 0;
      drone.altitudeMeters = 0;
    }

    if (!this.events[missionId]) this.events[missionId] = [];
    this.events[missionId].push({
      id: `evt-${Date.now()}`,
      missionId,
      timestamp: new Date().toISOString(),
      eventType: 'MISSION_ABORTED',
      severity: 'error',
      details: 'Safety abort signal acknowledged by Temporal Workflow. Controlled hover / landing initiated.',
    });

    return m;
  }

  public async rerouteMission(missionId: string, newWaypoints: Waypoint[]): Promise<Mission> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(missionId)}/reroute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waypoints: newWaypoints }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }
    }

    const m = this.missions.find((x) => x.missionId === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);

    m.waypoints = newWaypoints;
    m.updatedAt = new Date().toISOString();
    m.message = `Route updated with ${newWaypoints.length} alternative waypoints.`;

    if (!this.events[missionId]) this.events[missionId] = [];
    this.events[missionId].push({
      id: `evt-${Date.now()}`,
      missionId,
      timestamp: new Date().toISOString(),
      eventType: 'REROUTED',
      severity: 'warn',
      details: 'Temporal signal sent: Replacement route verified by air corridor authority.',
    });

    return m;
  }

  public async getMissionEvents(missionId: string): Promise<MissionEvent[]> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/missions/${encodeURIComponent(missionId)}/events`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch {
        // Fallback
      }
    }
    return this.events[missionId] || [];
  }

  public async getDrones(): Promise<Drone[]> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/drones`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch {
        // Fallback
      }
    }
    return [...this.drones];
  }

  // --- LIVE LOCATION API ---
  public async getLiveDroneLocations(): Promise<Drone[]> {
    try {
      const res = await fetch('/api/drones/live');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.drones)) {
          // Sync with internal drones
          data.drones.forEach((liveD: any) => {
            const target = this.drones.find((d) => d.droneId === liveD.droneId);
            if (target) {
              target.currentLocation = {
                latitude: liveD.latitude,
                longitude: liveD.longitude,
              };
              target.speedKmh = liveD.speedKmh;
              target.altitudeMeters = liveD.altitudeMeters;
              target.headingDeg = liveD.headingDeg;
              target.batteryPercent = liveD.batteryPercent;
              target.satellitesLocked = liveD.satellitesLocked;
              target.signalRssi = liveD.signalRssi;
              target.lastHeartbeat = liveD.lastUpdated || new Date().toISOString();
            }
          });
          return [...this.drones];
        }
      }
    } catch {
      // Fallback: client-side simulation step
    }

    // Client-side simulation step for in-flight drones
    this.drones.forEach((drone) => {
      if (drone.status === 'IN_FLIGHT') {
        const angle = (Date.now() / 15000) * 2 * Math.PI;
        drone.currentLocation.latitude = +(16.5120 + Math.sin(angle) * 0.008).toFixed(6);
        drone.currentLocation.longitude = +(80.6420 + Math.cos(angle) * 0.008).toFixed(6);
        drone.speedKmh = Math.round(52 + Math.sin(Date.now() / 3000) * 6);
        drone.altitudeMeters = Math.round(115 + Math.cos(Date.now() / 4000) * 10);
        drone.headingDeg = Math.round(((angle * 180) / Math.PI + 90) % 360);
        drone.batteryPercent = Math.max(15, +(drone.batteryPercent - 0.01).toFixed(1));
        drone.lastHeartbeat = new Date().toISOString();
      }
    });

    return [...this.drones];
  }

  public subscribeLiveDroneLocations(
    callback: (drones: Drone[]) => void,
    intervalMs: number = 2000
  ): () => void {
    const timer = setInterval(async () => {
      const updated = await this.getLiveDroneLocations();
      callback(updated);
    }, intervalMs);

    return () => clearInterval(timer);
  }

  // --- TEMPORAL SIGNAL SIMULATORS ---
  public async signalDroneOffline(droneId: string): Promise<{ success: boolean; message: string }> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/drones/${encodeURIComponent(droneId)}/offline`, {
          method: 'POST',
        });
        if (res.ok) {
          return { success: true, message: `Signal sent: ${droneId} marked offline.` };
        }
      } catch {
        // Fallback
      }
    }

    // Update drone in simulation
    const drone = this.drones.find((d) => d.droneId === droneId);
    if (drone) {
      drone.status = 'OFFLINE_WAITING';
      drone.speedKmh = 0;
    }

    // Find any mission running with this drone
    const activeMission = this.missions.find(
      (m) => m.droneId === droneId && ['IN_PROGRESS', 'SCHEDULED', 'RECOVERING'].includes(m.status)
    );

    if (activeMission) {
      activeMission.status = 'SUSPENDED_OFFLINE';
      activeMission.updatedAt = new Date().toISOString();
      activeMission.message = 'Drone dropped offline. Temporal Workflow in durable wait condition.';

      if (!this.events[activeMission.missionId]) this.events[activeMission.missionId] = [];
      this.events[activeMission.missionId].push({
        id: `evt-${Date.now()}-off`,
        missionId: activeMission.missionId,
        timestamp: new Date().toISOString(),
        eventType: 'WORKFLOW_SUSPENDED',
        severity: 'warn',
        details: `Telemetry heartbeat lost for ${droneId}. Temporal durable wait triggered.`,
      });
    }

    return {
      success: true,
      message: `Offline signal recorded. Workflow for ${droneId} suspended durably.`,
    };
  }

  public async signalDroneReconnected(droneId: string): Promise<{ success: boolean; message: string }> {
    if (!this.isUsingMock()) {
      try {
        const res = await fetch(`${BASE_URL}/api/drones/${encodeURIComponent(droneId)}/reconnected`, {
          method: 'POST',
        });
        if (res.ok) {
          return { success: true, message: `Signal sent: ${droneId} reconnected.` };
        }
      } catch {
        // Fallback
      }
    }

    const drone = this.drones.find((d) => d.droneId === droneId);
    if (drone) {
      drone.lastHeartbeat = new Date().toISOString();
      drone.speedKmh = 48;
    }

    const pausedMission = this.missions.find(
      (m) => m.droneId === droneId && m.status === 'SUSPENDED_OFFLINE'
    );

    if (pausedMission) {
      pausedMission.status = 'RECOVERING';
      pausedMission.updatedAt = new Date().toISOString();
      pausedMission.message = 'Drone reconnected. Validating diagnostics and resuming workflow.';

      if (drone) {
        drone.status = 'IN_FLIGHT';
      }

      if (!this.events[pausedMission.missionId]) this.events[pausedMission.missionId] = [];
      this.events[pausedMission.missionId].push({
        id: `evt-${Date.now()}-rec`,
        missionId: pausedMission.missionId,
        timestamp: new Date().toISOString(),
        eventType: 'DRONE_RECONNECTED',
        severity: 'success',
        details: `Heartbeat restored for ${droneId}. Temporal signal handled; resuming recovery sequence.`,
      });

      // Automatically transition to RETURNING after recovery validation in simulation
      setTimeout(() => {
        if (pausedMission.status === 'RECOVERING') {
          pausedMission.status = 'RETURNING';
          pausedMission.updatedAt = new Date().toISOString();
          pausedMission.message = 'Recovery complete. Returning to Dispatch Hub.';
          this.events[pausedMission.missionId]?.push({
            id: `evt-${Date.now()}-ret`,
            missionId: pausedMission.missionId,
            timestamp: new Date().toISOString(),
            eventType: 'RETURNING_TO_BASE',
            severity: 'info',
            details: 'Recovery verified. Autopilot instructed to return to launch coordinates.',
          });
        }
      }, 3500);
    }

    return {
      success: true,
      message: `Reconnected signal handled. ${droneId} workflow resumed.`,
    };
  }
}

export const apiService = new ApiService();
