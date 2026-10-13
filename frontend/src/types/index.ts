export type MissionStatus =
  | 'CREATED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'SUSPENDED_OFFLINE'
  | 'RECOVERING'
  | 'RETURNING'
  | 'COMPLETED'
  | 'ABORTED'
  | 'FAILED';

export interface Waypoint {
  latitude: number;
  longitude: number;
  name?: string;
  altitudeMeters?: number;
}

export interface MissionRequest {
  droneId: string;
  destination: string;
  waypoints: Waypoint[];
}

export interface Mission {
  missionId: string;
  workflowId: string;
  droneId: string;
  destination: string;
  status: MissionStatus;
  createdAt: string;
  updatedAt?: string;
  waypoints: Waypoint[];
  currentWaypointIndex?: number;
  batteryPercent?: number;
  payloadKg?: number;
  estimatedArrival?: string;
  message?: string;
}

export interface MissionEvent {
  id: string;
  missionId: string;
  timestamp: string;
  eventType:
    | 'WORKFLOW_CREATED'
    | 'WORKFLOW_STARTED'
    | 'WAYPOINT_REACHED'
    | 'TELEMETRY_LOST'
    | 'WORKFLOW_SUSPENDED'
    | 'DRONE_RECONNECTED'
    | 'RECOVERY_INITIATED'
    | 'RETURNING_TO_BASE'
    | 'MISSION_COMPLETED'
    | 'MISSION_ABORTED'
    | 'REROUTED';
  severity: 'info' | 'warn' | 'error' | 'success';
  details: string;
}

export interface Drone {
  droneId: string;
  model: string;
  status: 'AVAILABLE' | 'IN_FLIGHT' | 'OFFLINE_WAITING' | 'MAINTENANCE';
  batteryPercent: number;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  currentMissionId?: string | null;
  lastHeartbeat: string;
  speedKmh?: number;
  altitudeMeters?: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  time: string;
}

export interface ApiConfig {
  baseUrl: string;
  isMockMode: boolean;
  isBackendReachable: boolean;
  lastChecked?: string;
}

export interface NoFlyZone {
  id: string;
  name: string;
  type: 'AIRPORT_RESTRICTION' | 'HOSPITAL_HELIPAD' | 'POWER_GRID' | 'SECURITY_PERIMETER';
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  altitudeCeilingMeters: number;
  severity: 'RESTRICTED' | 'WARNING' | 'PROHIBITED';
  active: boolean;
  description: string;
}

