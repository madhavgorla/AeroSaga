import React, { useState, useEffect, useRef } from 'react';
import type { Drone, Mission } from '../../types';
import { AIRSPACE_LANDMARKS, getNearestPlace } from '../../services/landmarks';
import { useToast } from '../ui/Toast';
import {
  windTelemetryService,
  WindTelemetry,
  CoordinateWeather,
  PrecipitationCell,
  WIND_PRESETS,
} from '../../services/windTelemetry';
import {
  Plane,
  MapPin,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Compass,
  Navigation,
  Crosshair,
  Wifi,
  Satellite,
  Layers,
  Building2,
  AlertTriangle,
  X,
  Hexagon,
  RotateCcw,
  PenTool,
  Ban,
  Trash2,
  CheckCircle2,
  Undo2,
  Plus,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  CloudFog,
  AlertCircle,
} from 'lucide-react';

export interface ForbiddenZonePoint {
  x: number; // percentage 0-100% on map canvas
  y: number;
  latitude: number;
  longitude: number;
}

export interface ForbiddenZone {
  id: string;
  name: string;
  points: ForbiddenZonePoint[];
  createdAt: string;
}

// Compute accurate signal strength (RSSI in dBm) for a drone using real telemetry and RF path loss
export const getDroneRssi = (drone: Drone): number => {
  if (drone.status === 'OFFLINE_WAITING') return -92;
  if (typeof drone.signalRssi === 'number') return drone.signalRssi;

  // Calculate distance to nearest RF ground transceiver (Dispatch Hub Alpha or Relay)
  const dLat = (drone.currentLocation.latitude - 16.5062) * 111;
  const dLng = (drone.currentLocation.longitude - 80.6480) * 111 * Math.cos((16.5062 * Math.PI) / 180);
  const distKm = Math.hypot(dLat, dLng);

  // Path loss model with altitude line-of-sight clearing
  const altitudeBonus = Math.min(8, (drone.altitudeMeters || 0) / 25);
  const baseRssi = -46 - Math.round(18 * Math.log10(1 + distKm * 1.8)) + Math.round(altitudeBonus);
  return Math.max(-95, Math.min(-42, baseRssi));
};

export const getRssiQuality = (rssi: number): { label: string; color: string; bg: string } => {
  if (rssi >= -62) return { label: 'Excellent', color: 'text-emerald-400', bg: '#10b981' };
  if (rssi >= -74) return { label: 'Good', color: 'text-sky-400', bg: '#06b6d4' };
  if (rssi >= -84) return { label: 'Moderate', color: 'text-amber-400', bg: '#f59e0b' };
  return { label: 'Weak / Critical', color: 'text-rose-400', bg: '#ef4444' };
};

interface TacticalMapProps {
  drones: Drone[];
  missions: Mission[];
  onSelectMission?: (missionId: string) => void;
  onSelectDrone?: (droneId: string) => void;
  onInspectLocation?: (drone: Drone) => void;
  onAbortMission?: (missionId: string) => void;
  onRerouteMission?: (mission: Mission) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  drones,
  missions,
  onSelectMission,
  onSelectDrone,
  onInspectLocation,
  onAbortMission,
  onRerouteMission,
}) => {
  const { showToast } = useToast();
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'in_flight' | 'offline'>('all');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [followDroneId, setFollowDroneId] = useState<string | null>('DRONE-001');
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showGeofences, setShowGeofences] = useState<boolean>(true);

  // Signal Strength (RSSI) Heatmap Overlay state
  const [showRssiHeatmap, setShowRssiHeatmap] = useState<boolean>(true);
  const [rssiHeatmapOpacity, setRssiHeatmapOpacity] = useState<number>(0.65);
  const rssiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulated breach testing state
  const [simulatedBreachedDroneId, setSimulatedBreachedDroneId] = useState<string | null>(null);
  const [dismissedBreachAlert, setDismissedBreachAlert] = useState<boolean>(false);
  const alertedBreachRef = useRef<Set<string>>(new Set());

  // Breadcrumbs history for live flight trail
  const [trailMap, setTrailMap] = useState<Record<string, Array<{ x: number; y: number }>>>({});

  // Weather Layer state (Wind Speed Vectors & Precipitation Alerts)
  const [showWeatherLayer, setShowWeatherLayer] = useState<boolean>(true);
  const [windData, setWindData] = useState<WindTelemetry>(windTelemetryService.getWind());
  const [weatherPreset, setWeatherPreset] = useState<string>('high');
  const [dismissedWeatherAlert, setDismissedWeatherAlert] = useState<boolean>(false);
  const [hoveredWeatherPoint, setHoveredWeatherPoint] = useState<string | null>(null);
  const alertedWeatherRef = useRef<Set<string>>(new Set());

  // Subscribe to real-time wind telemetry & precipitation updates
  useEffect(() => {
    const unsub = windTelemetryService.subscribe((telemetry) => {
      setWindData(telemetry);
    });
    return unsub;
  }, []);

  // Center coordinate: Dispatch Hub Alpha (16.5062, 80.6480)
  const centerLat = 16.514;
  const centerLng = 80.638;
  const latSpan = 0.04;
  const lngSpan = 0.04;

  const project = (lat: number, lng: number) => {
    // Project to percentage 0-100%
    const x = ((lng - (centerLng - lngSpan / 2)) / lngSpan) * 100;
    const y = ((centerLat + latSpan / 2 - lat) / latSpan) * 100;
    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(8, Math.min(92, y)),
    };
  };

  const unproject = (xPercent: number, yPercent: number) => {
    const lng = (xPercent / 100) * lngSpan + (centerLng - lngSpan / 2);
    const lat = centerLat + latSpan / 2 - (yPercent / 100) * latSpan;
    return { latitude: lat, longitude: lng };
  };

  const dispatchHub = project(16.5062, 80.648);

  // User-drawn Forbidden Zones (No-Fly Geofences)
  const [forbiddenZones, setForbiddenZones] = useState<ForbiddenZone[]>([
    {
      id: 'NFZ-METRO-DENSE',
      name: 'Benz Circle Urban High-Density NFZ',
      points: [
        { ...project(16.504, 80.642), latitude: 16.504, longitude: 80.642 },
        { ...project(16.498, 80.642), latitude: 16.498, longitude: 80.642 },
        { ...project(16.498, 80.649), latitude: 16.498, longitude: 80.649 },
        { ...project(16.504, 80.649), latitude: 16.504, longitude: 80.649 },
      ],
      createdAt: new Date().toISOString(),
    },
  ]);

  // Drawing state
  const [isDrawingNFZ, setIsDrawingNFZ] = useState<boolean>(false);
  const [drawingPoints, setDrawingPoints] = useState<ForbiddenZonePoint[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [dismissedConflictAlert, setDismissedConflictAlert] = useState<boolean>(false);
  const alertedConflictsRef = useRef<Set<string>>(new Set());

  // Point in Polygon algorithm (Ray-casting)
  const isPointInPolygon = (
    point: { x: number; y: number },
    polygon: Array<{ x: number; y: number }>
  ): boolean => {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Line segments intersection test
  const ccw = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };

  const doSegmentsIntersect = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number }
  ): boolean => {
    return (
      ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
      ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
  };

  // Check if a line segment crosses a polygon or has endpoints inside it
  const doesSegmentCrossPolygon = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    polygon: Array<{ x: number; y: number }>
  ): boolean => {
    if (polygon.length < 3) return false;
    // Check if either endpoint is inside the polygon
    if (isPointInPolygon(p1, polygon) || isPointInPolygon(p2, polygon)) return true;

    // Check if the segment intersects any polygon boundary edge
    for (let i = 0; i < polygon.length; i++) {
      const nextIdx = (i + 1) % polygon.length;
      if (doSegmentsIntersect(p1, p2, polygon[i], polygon[nextIdx])) {
        return true;
      }
    }
    return false;
  };

  // Compute a buffered corridor polygon around mission waypoints (Safe Flight Zone)
  const computeGeofencePolygon = (points: Array<{ x: number; y: number }>, radius = 5.2) => {
    if (points.length < 2) return '';
    const lefts: Array<{ x: number; y: number }> = [];
    const rights: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < points.length; i++) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * radius;
      const ny = (dx / len) * radius;

      lefts.push({ x: +(points[i].x + nx).toFixed(2), y: +(points[i].y + ny).toFixed(2) });
      rights.unshift({ x: +(points[i].x - nx).toFixed(2), y: +(points[i].y - ny).toFixed(2) });
    }

    const allPts = [...lefts, ...rights];
    return allPts.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`, '') + ' Z';
  };

  // Distance from point to line segment
  const distanceToSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), proj: { x: x1, y: y1 } };
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return {
      dist: Math.hypot(px - projX, py - projY),
      proj: { x: projX, y: projY },
    };
  };

  // Update breadcrumb trails when drones move
  useEffect(() => {
    if (!isLiveActive) return;

    setTrailMap((prev) => {
      const next = { ...prev };
      drones.forEach((d) => {
        if (d.status === 'IN_FLIGHT') {
          const pt = project(d.currentLocation.latitude, d.currentLocation.longitude);
          const currentTrail = next[d.droneId] || [];
          const last = currentTrail[currentTrail.length - 1];
          if (!last || Math.hypot(last.x - pt.x, last.y - pt.y) > 0.4) {
            next[d.droneId] = [...currentTrail.slice(-16), pt];
          }
        }
      });
      return next;
    });
  }, [drones, isLiveActive]);

  // Average fleet RSSI
  const avgFleetRssi = drones.length > 0
    ? Math.round(drones.reduce((sum, d) => sum + getDroneRssi(d), 0) / drones.length)
    : -65;

  // Render signal strength (RSSI) heatmap on canvas using drone location telemetry
  useEffect(() => {
    if (!showRssiHeatmap) return;
    const canvas = rssiCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || canvas.clientWidth || 800;
    const height = rect.height || canvas.clientHeight || 500;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // 1. Primary RF Ground Transceiver Base Station: Hub Alpha (16.5062, 80.6480)
    const hubPixelX = (dispatchHub.x / 100) * width;
    const hubPixelY = (dispatchHub.y / 100) * height;

    const hubCoverageRadius = width * 0.45;
    const hubGrad = ctx.createRadialGradient(hubPixelX, hubPixelY, 8, hubPixelX, hubPixelY, hubCoverageRadius);
    hubGrad.addColorStop(0, 'rgba(16, 185, 129, 0.55)');   // -45 dBm High Gain
    hubGrad.addColorStop(0.25, 'rgba(6, 182, 212, 0.38)');  // -62 dBm Nominal
    hubGrad.addColorStop(0.55, 'rgba(14, 165, 233, 0.22)'); // -72 dBm Good
    hubGrad.addColorStop(0.80, 'rgba(245, 158, 11, 0.12)'); // -82 dBm Fair
    hubGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');        // Edge falloff
    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.arc(hubPixelX, hubPixelY, hubCoverageRadius, 0, Math.PI * 2);
    ctx.fill();

    // Secondary Sector 4 RF Relay Mast (16.528, 80.621)
    const relayPt = project(16.528, 80.621);
    const relayPixelX = (relayPt.x / 100) * width;
    const relayPixelY = (relayPt.y / 100) * height;
    const relayRadius = width * 0.32;
    const relayGrad = ctx.createRadialGradient(relayPixelX, relayPixelY, 5, relayPixelX, relayPixelY, relayRadius);
    relayGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
    relayGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.25)');
    relayGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.10)');
    relayGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = relayGrad;
    ctx.beginPath();
    ctx.arc(relayPixelX, relayPixelY, relayRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Surveyed Flight Path Breadcrumb Trail Telemetry Points
    Object.entries(trailMap).forEach(([droneId, pts]) => {
      const drone = drones.find((d) => d.droneId === droneId);
      const droneRssi = drone ? getDroneRssi(drone) : -65;
      const { bg } = getRssiQuality(droneRssi);

      pts.forEach((pt, i) => {
        const px = (pt.x / 100) * width;
        const py = (pt.y / 100) * height;
        const trailRadius = 38 + (i % 3) * 4;
        const trailGrad = ctx.createRadialGradient(px, py, 2, px, py, trailRadius);
        trailGrad.addColorStop(0, bg === '#10b981' ? 'rgba(16, 185, 129, 0.45)' : bg === '#06b6d4' ? 'rgba(6, 182, 212, 0.45)' : bg === '#f59e0b' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(239, 68, 68, 0.45)');
        trailGrad.addColorStop(0.6, bg === '#10b981' ? 'rgba(16, 185, 129, 0.18)' : bg === '#06b6d4' ? 'rgba(6, 182, 212, 0.18)' : bg === '#f59e0b' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.18)');
        trailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.arc(px, py, trailRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // 3. Live Active Drone Telemetry Locations
    drones.forEach((drone) => {
      const pt = project(drone.currentLocation.latitude, drone.currentLocation.longitude);
      const px = (pt.x / 100) * width;
      const py = (pt.y / 100) * height;
      const rssi = getDroneRssi(drone);
      const isOffline = drone.status === 'OFFLINE_WAITING';

      // Splat radius proportional to signal and altitude
      const splatRadius = isOffline ? 85 : 75 + Math.min(25, (drone.altitudeMeters || 0) / 6);
      const droneGrad = ctx.createRadialGradient(px, py, 4, px, py, splatRadius);

      if (isOffline || rssi <= -84) {
        // Dead zone / Critical weak signal (Crimson / Deep Rose)
        droneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.75)');
        droneGrad.addColorStop(0.35, 'rgba(225, 29, 72, 0.45)');
        droneGrad.addColorStop(0.7, 'rgba(159, 18, 57, 0.20)');
        droneGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (rssi >= -62) {
        // Excellent (High-gain Emerald Green)
        droneGrad.addColorStop(0, 'rgba(16, 185, 129, 0.80)');
        droneGrad.addColorStop(0.4, 'rgba(34, 197, 94, 0.45)');
        droneGrad.addColorStop(0.75, 'rgba(5, 150, 105, 0.20)');
        droneGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else if (rssi >= -74) {
        // Good (Nominal Cyan / Sky)
        droneGrad.addColorStop(0, 'rgba(6, 182, 212, 0.80)');
        droneGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.45)');
        droneGrad.addColorStop(0.75, 'rgba(2, 132, 199, 0.20)');
        droneGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      } else {
        // Moderate / Fair (Amber)
        droneGrad.addColorStop(0, 'rgba(245, 158, 11, 0.80)');
        droneGrad.addColorStop(0.4, 'rgba(217, 119, 6, 0.45)');
        droneGrad.addColorStop(0.75, 'rgba(180, 83, 9, 0.20)');
        droneGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      }

      ctx.fillStyle = droneGrad;
      ctx.beginPath();
      ctx.arc(px, py, splatRadius, 0, Math.PI * 2);
      ctx.fill();

      // Concentric RF waves for in-flight drones
      if (drone.status === 'IN_FLIGHT') {
        ctx.save();
        ctx.strokeStyle = rssi >= -62 ? 'rgba(52, 211, 153, 0.4)' : rssi >= -74 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(px, py, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // 4. RF Signal Contour Lines (Iso-dBm contours around Hub Alpha)
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 0.8;

    // -60 dBm contour
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.beginPath();
    ctx.arc(hubPixelX, hubPixelY, width * 0.16, 0, Math.PI * 2);
    ctx.stroke();

    // -72 dBm contour
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.beginPath();
    ctx.arc(hubPixelX, hubPixelY, width * 0.28, 0, Math.PI * 2);
    ctx.stroke();

    // -84 dBm contour
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.20)';
    ctx.beginPath();
    ctx.arc(hubPixelX, hubPixelY, width * 0.40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }, [drones, trailMap, showRssiHeatmap, rssiHeatmapOpacity, isLiveActive]);

  // Active missions
  const activeMissions = missions.filter((m) =>
    ['IN_PROGRESS', 'SUSPENDED_OFFLINE', 'RECOVERING'].includes(m.status)
  );

  // Check for Forbidden Zone Conflicts (Any drone path intersecting a forbidden zone)
  interface PathConflict {
    droneId: string;
    missionId: string;
    zoneId: string;
    zoneName: string;
    isDroneCurrentlyInside: boolean;
  }

  const pathConflicts: PathConflict[] = [];

  forbiddenZones.forEach((zone) => {
    if (zone.points.length < 3) return;

    // 1. Check all in-flight drones current position
    drones.forEach((drone) => {
      const dronePt = project(drone.currentLocation.latitude, drone.currentLocation.longitude);
      if (isPointInPolygon(dronePt, zone.points)) {
        pathConflicts.push({
          droneId: drone.droneId,
          missionId: drone.currentMissionId || 'PATROL',
          zoneId: zone.id,
          zoneName: zone.name,
          isDroneCurrentlyInside: true,
        });
      }
    });

    // 2. Check all active mission flight trajectories
    activeMissions.forEach((m) => {
      if (!m.waypoints || m.waypoints.length === 0) return;
      const waypointsPts = [
        dispatchHub,
        ...m.waypoints.map((wp) => project(wp.latitude, wp.longitude)),
      ];

      for (let i = 0; i < waypointsPts.length - 1; i++) {
        const p1 = waypointsPts[i];
        const p2 = waypointsPts[i + 1];

        if (doesSegmentCrossPolygon(p1, p2, zone.points)) {
          // Avoid duplicate conflict records for same drone & zone
          if (!pathConflicts.some((c) => c.droneId === m.droneId && c.zoneId === zone.id)) {
            pathConflicts.push({
              droneId: m.droneId,
              missionId: m.missionId,
              zoneId: zone.id,
              zoneName: zone.name,
              isDroneCurrentlyInside: false,
            });
          }
          break;
        }
      }
    });
  });

  // Trigger toast warning whenever a drone flight path intersects a forbidden zone
  useEffect(() => {
    pathConflicts.forEach((conflict) => {
      const key = `${conflict.droneId}-${conflict.zoneId}`;
      if (!alertedConflictsRef.current.has(key)) {
        alertedConflictsRef.current.add(key);
        showToast({
          type: 'error',
          title: `🚨 Forbidden Zone Conflict: ${conflict.droneId}`,
          description: `Flight trajectory for ${conflict.missionId} intersects forbidden zone "${conflict.zoneName}". Immediate rerouting required!`,
        });
      }
    });

    // Clear resolved alerts
    if (pathConflicts.length === 0) {
      alertedConflictsRef.current.clear();
    }
  }, [pathConflicts, showToast]);

  // Calculate geofence corridor breaches for in-flight drones
  const GEOFENCE_CORRIDOR_RADIUS_PERCENT = 5.2; // approx ~380m
  const breachedDrones: Array<{
    drone: Drone;
    mission: Mission;
    deviationMeters: number;
    nearestCorridorPoint: { x: number; y: number };
  }> = [];

  drones.forEach((drone) => {
    if (drone.status !== 'IN_FLIGHT' && drone.droneId !== simulatedBreachedDroneId) return;

    const mission = missions.find(
      (m) =>
        m.droneId === drone.droneId &&
        ['IN_PROGRESS', 'SUSPENDED_OFFLINE', 'RECOVERING'].includes(m.status)
    );

    if (!mission || !mission.waypoints || mission.waypoints.length === 0) return;

    const dronePos = project(drone.currentLocation.latitude, drone.currentLocation.longitude);
    const points = [
      dispatchHub,
      ...mission.waypoints.map((wp) => project(wp.latitude, wp.longitude)),
    ];

    let minDistance = Infinity;
    let closestProj = points[0];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const { dist, proj } = distanceToSegment(dronePos.x, dronePos.y, p1.x, p1.y, p2.x, p2.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestProj = proj;
      }
    }

    const isSimulated = simulatedBreachedDroneId === drone.droneId;
    if (minDistance > GEOFENCE_CORRIDOR_RADIUS_PERCENT || isSimulated) {
      const deviationMeters = isSimulated
        ? 485
        : Math.round((minDistance - GEOFENCE_CORRIDOR_RADIUS_PERCENT) * 80 + 380);

      breachedDrones.push({
        drone,
        mission,
        deviationMeters,
        nearestCorridorPoint: closestProj,
      });
    }
  });

  const filteredDrones = drones.filter((d) => {
    if (filter === 'in_flight') return d.status === 'IN_FLIGHT';
    if (filter === 'offline') return d.status === 'OFFLINE_WAITING';
    return true;
  });

  const activeTrackingDrone =
    drones.find((d) => d.droneId === followDroneId) ||
    drones.find((d) => d.status === 'IN_FLIGHT') ||
    drones[0];

  const activeTrackingPlace = activeTrackingDrone
    ? getNearestPlace(
        activeTrackingDrone.currentLocation.latitude,
        activeTrackingDrone.currentLocation.longitude
      )
    : null;

  const hasActiveBreach = breachedDrones.length > 0;
  const hasPathConflict = pathConflicts.length > 0;

  // Compute live weather, wind vectors and precipitation alerts for all active mission coordinates
  interface MissionWeatherPoint {
    id: string;
    missionId: string;
    droneId: string;
    label: string;
    isDrone: boolean;
    latitude: number;
    longitude: number;
    pos: { x: number; y: number };
    weather: CoordinateWeather;
  }

  const missionWeatherPoints: MissionWeatherPoint[] = [];

  activeMissions.forEach((m) => {
    // 1. Waypoints along the mission path
    if (m.waypoints && m.waypoints.length > 0) {
      m.waypoints.forEach((wp, idx) => {
        const weather = windTelemetryService.getWeatherAtCoordinate(wp.latitude, wp.longitude);
        missionWeatherPoints.push({
          id: `wp-${m.missionId}-${idx}`,
          missionId: m.missionId,
          droneId: m.droneId,
          label: wp.name || `Waypoint #${idx + 1}`,
          isDrone: false,
          latitude: wp.latitude,
          longitude: wp.longitude,
          pos: project(wp.latitude, wp.longitude),
          weather,
        });
      });
    }

    // 2. Current live drone coordinate for this mission
    const assignedDrone = drones.find((d) => d.droneId === m.droneId);
    if (assignedDrone) {
      const weather = windTelemetryService.getWeatherAtCoordinate(
        assignedDrone.currentLocation.latitude,
        assignedDrone.currentLocation.longitude
      );
      missionWeatherPoints.push({
        id: `drone-loc-${assignedDrone.droneId}`,
        missionId: m.missionId,
        droneId: assignedDrone.droneId,
        label: `${assignedDrone.droneId} In-Flight`,
        isDrone: true,
        latitude: assignedDrone.currentLocation.latitude,
        longitude: assignedDrone.currentLocation.longitude,
        pos: project(assignedDrone.currentLocation.latitude, assignedDrone.currentLocation.longitude),
        weather,
      });
    }
  });

  const activeWeatherAlerts = missionWeatherPoints.filter((pt) => pt.weather.hasAlert);
  const criticalWeatherAlerts = missionWeatherPoints.filter(
    (pt) => pt.weather.alertSeverity === 'WARNING' || pt.weather.alertSeverity === 'CRITICAL'
  );
  const precipitationRadarCells = windTelemetryService.getPrecipitationCells();

  // Notify operator if critical weather or squall affects any active mission coordinate
  useEffect(() => {
    if (!showWeatherLayer) return;
    criticalWeatherAlerts.forEach((alert) => {
      const key = `${alert.missionId}-${alert.id}-${alert.weather.alertSeverity}`;
      if (!alertedWeatherRef.current.has(key)) {
        alertedWeatherRef.current.add(key);
        showToast({
          type: 'warning',
          title: `⛈️ Weather Alert: ${alert.droneId}`,
          description: `${alert.label}: ${alert.weather.alertMessage}`,
        });
      }
    });
  }, [criticalWeatherAlerts, showWeatherLayer, showToast]);

  // Handle Canvas Click when in Drawing Mode
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingNFZ || !mapCanvasRef.current) return;

    const rect = mapCanvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    const { latitude, longitude } = unproject(x, y);

    // If clicking near the first point with >= 3 points, auto-close the polygon!
    if (drawingPoints.length >= 3) {
      const firstPt = drawingPoints[0];
      const dist = Math.hypot(x - firstPt.x, y - firstPt.y);
      if (dist < 4.0) {
        completeDrawingZone();
        return;
      }
    }

    setDrawingPoints((prev) => [
      ...prev,
      { x: +x.toFixed(2), y: +y.toFixed(2), latitude, longitude },
    ]);
  };

  // Handle Mouse Move on Canvas during drawing
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingNFZ || !mapCanvasRef.current) return;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    setCursorPos({ x, y });
  };

  // Complete and save drawn forbidden zone
  const completeDrawingZone = () => {
    if (drawingPoints.length < 3) {
      showToast({
        type: 'warning',
        title: 'Need at least 3 points',
        description: 'Click on the map to place at least 3 vertices to form a polygon perimeter.',
      });
      return;
    }

    const newZone: ForbiddenZone = {
      id: `NFZ-${Date.now().toString().slice(-4)}`,
      name: `Forbidden Zone ${forbiddenZones.length + 1}`,
      points: [...drawingPoints],
      createdAt: new Date().toISOString(),
    };

    setForbiddenZones((prev) => [...prev, newZone]);
    setDrawingPoints([]);
    setIsDrawingNFZ(false);
    setCursorPos(null);

    showToast({
      type: 'success',
      title: '🚫 Forbidden Zone Created',
      description: `Active geofence perimeter activated with ${newZone.points.length} boundary vertices.`,
    });
  };

  const handleCancelDrawing = () => {
    setIsDrawingNFZ(false);
    setDrawingPoints([]);
    setCursorPos(null);
  };

  const handleUndoPoint = () => {
    setDrawingPoints((prev) => prev.slice(0, -1));
  };

  const handleDeleteZone = (id: string) => {
    setForbiddenZones((prev) => prev.filter((z) => z.id !== id));
    showToast({
      type: 'info',
      title: 'Forbidden Zone Removed',
      description: 'The selected no-fly area restriction has been deleted.',
    });
  };

  const handleClearAllZones = () => {
    setForbiddenZones([]);
    showToast({
      type: 'info',
      title: 'All Forbidden Zones Cleared',
      description: 'All restricted airspace polygons have been cleared.',
    });
  };

  return (
    <div
      className={`relative w-full h-[460px] lg:h-[520px] bg-[#060a14] rounded-2xl border overflow-hidden flex flex-col shadow-xl transition-all duration-300 ${
        hasPathConflict || hasActiveBreach
          ? 'border-red-500/60'
          : 'border-slate-800/80'
      }`}
    >
      {/* Map Header & Controls */}
      <div className="p-3 border-b border-slate-800/80 bg-[#070d1a]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 z-20">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Live Airspace</span>
          </div>

          {/* Geofence Corridor Layer Toggle */}
          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              showGeofences
                ? 'bg-sky-950/60 text-sky-300 border-sky-600/50'
                : 'text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle mission safe flight corridors"
          >
            <Hexagon className="w-3.5 h-3.5 text-sky-400" />
            <span>Corridors ({activeMissions.length})</span>
          </button>

          {/* Signal Strength (RSSI) Heatmap Layer Toggle */}
          <button
            onClick={() => setShowRssiHeatmap(!showRssiHeatmap)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              showRssiHeatmap
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60 shadow-sm'
                : 'text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Signal Strength (RSSI) Heatmap overlay"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>RSSI Heatmap</span>
          </button>

          {/* Weather Layer Toggle (Wind Speed & Precipitation Alerts) */}
          <button
            onClick={() => setShowWeatherLayer(!showWeatherLayer)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
              showWeatherLayer
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/60 shadow-sm ring-1 ring-cyan-500/30'
                : 'text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle live wind speed vectors and precipitation alerts for mission coordinates"
          >
            <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
            <span>Weather Layer</span>
            {activeWeatherAlerts.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  criticalWeatherAlerts.length > 0
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {activeWeatherAlerts.length}
              </span>
            )}
          </button>

          {/* Draw Forbidden Zone Toggle Button */}
          <button
            onClick={() => {
              if (isDrawingNFZ) {
                handleCancelDrawing();
              } else {
                setIsDrawingNFZ(true);
                setDrawingPoints([]);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
              isDrawingNFZ
                ? 'bg-red-600 text-white border-red-500 font-semibold shadow-sm'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
            title="Draw custom restricted polygon on map"
          >
            <PenTool className="w-3.5 h-3.5 text-red-400" />
            <span>{isDrawingNFZ ? 'Drawing Active...' : 'Draw Forbidden Zone'}</span>
          </button>

          {/* Clear Zones Button */}
          {forbiddenZones.length > 0 && !isDrawingNFZ && (
            <button
              onClick={handleClearAllZones}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-red-300 bg-slate-900 border border-slate-800 transition-colors"
              title="Clear all forbidden zones"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear ({forbiddenZones.length})</span>
            </button>
          )}

          {/* Subtle Test Deviation Button */}
          <button
            onClick={() => {
              if (simulatedBreachedDroneId) {
                setSimulatedBreachedDroneId(null);
                setDismissedBreachAlert(false);
              } else {
                setSimulatedBreachedDroneId('DRONE-001');
                setDismissedBreachAlert(false);
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors border ${
              simulatedBreachedDroneId
                ? 'bg-red-950/80 text-red-300 border-red-700'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Simulate drone flight deviation outside safe corridor"
          >
            <span>{simulatedBreachedDroneId ? 'Reset Breach' : 'Test Deviation'}</span>
          </button>
        </div>

        {/* Live Filter & Tracking Controls */}
        <div className="flex items-center gap-2">
          {/* Filter controls */}
          <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-sky-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({drones.length})
            </button>
            <button
              onClick={() => setFilter('in_flight')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'in_flight'
                  ? 'bg-sky-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In Flight
            </button>
          </div>

          {/* Follow Drone Toggle */}
          <select
            value={followDroneId || ''}
            onChange={(e) => {
              setFollowDroneId(e.target.value);
              if (onSelectDrone) onSelectDrone(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-sky-300 px-2 py-1 font-mono focus:outline-none"
            title="Lock camera focus on drone"
          >
            <option value="">Tracking: Auto</option>
            {drones.map((d) => (
              <option key={d.droneId} value={d.droneId}>
                Focus {d.droneId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Drawing Helper Banner when in Drawing Mode */}
      {isDrawingNFZ && (
        <div className="p-2.5 bg-red-950/90 border-b border-red-600/50 flex flex-wrap items-center justify-between gap-2.5 text-xs z-20 backdrop-blur-md">
          <div className="flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="font-semibold text-red-200">
              Drawing Forbidden Zone:
            </span>
            <span className="text-slate-300">
              Click on the map to place vertices (<strong>{drawingPoints.length}</strong> placed).
              {drawingPoints.length >= 3 && ' Click "Complete Zone" to close.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {drawingPoints.length > 0 && (
              <button
                onClick={handleUndoPoint}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}

            <button
              onClick={completeDrawingZone}
              disabled={drawingPoints.length < 3}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-medium transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Zone</span>
            </button>

            <button
              onClick={handleCancelDrawing}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Floating Sleek Conflict Warning Alert */}
      {hasPathConflict && !dismissedConflictAlert && (
        <div className="absolute top-14 left-3 right-3 lg:left-auto lg:right-3 lg:max-w-md z-30 p-3 rounded-xl bg-[#0b1322]/95 border border-red-500/50 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-1 rounded-md bg-red-500/15 text-red-400 shrink-0 mt-0.5">
                <Ban className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    Restricted Airspace Conflict
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    No-Fly Intrusion
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Flight path for <strong className="text-white font-mono">{pathConflicts[0].droneId}</strong> intersects{' '}
                  <strong className="text-red-300">"{pathConflicts[0].zoneName}"</strong>.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {onRerouteMission && (
                    <button
                      onClick={() => {
                        const m = missions.find((ms) => ms.missionId === pathConflicts[0].missionId);
                        if (m) onRerouteMission(m);
                      }}
                      className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-sm transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reroute Safe Path</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteZone(pathConflicts[0].zoneId)}
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    Delete Zone
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setDismissedConflictAlert(true)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Dismiss warning"
              aria-label="Dismiss warning"
            >
              <span className="text-xs font-bold leading-none">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Sleek Geofence Breach Warning Banner Overlay */}
      {hasActiveBreach && !hasPathConflict && !dismissedBreachAlert && (
        <div className="absolute top-14 left-3 right-3 lg:left-auto lg:right-3 lg:max-w-md z-30 p-3 rounded-xl bg-[#0b1322]/95 border border-red-500/50 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-1 rounded-md bg-red-500/15 text-red-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    Corridor Geofence Breach
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    Deviation
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  <strong className="text-white font-mono">{breachedDrones[0].drone.droneId}</strong> deviated{' '}
                  <span className="font-bold text-red-300 font-mono">
                    {breachedDrones[0].deviationMeters}m
                  </span>{' '}
                  outside designated safe corridor.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {onAbortMission && (
                    <button
                      onClick={() => onAbortMission(breachedDrones[0].mission.missionId)}
                      className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-sm transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Emergency RTB</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setDismissedBreachAlert(true)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Dismiss alert"
              aria-label="Dismiss alert"
            >
              <span className="text-xs font-bold leading-none">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Sleek Weather / Squall Hazard Alert Banner Overlay */}
      {showWeatherLayer &&
        criticalWeatherAlerts.length > 0 &&
        !dismissedWeatherAlert &&
        !hasPathConflict &&
        !hasActiveBreach && (
          <div className="absolute top-14 left-3 right-3 lg:left-auto lg:right-3 lg:max-w-md z-30 p-3 rounded-xl bg-[#071322]/95 border border-cyan-500/50 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
                  <CloudLightning className="w-4 h-4 text-cyan-400 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Atmospheric Weather Alert
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        criticalWeatherAlerts[0].weather.alertSeverity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {criticalWeatherAlerts[0].weather.precipitationMmH > 0 ? 'Precipitation Squall' : 'High Wind Warning'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    <strong className="text-cyan-300 font-mono">{criticalWeatherAlerts[0].droneId}</strong> ({criticalWeatherAlerts[0].label}):{' '}
                    <span className="text-amber-200 font-medium">{criticalWeatherAlerts[0].weather.alertMessage}</span>.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {onRerouteMission && (
                      <button
                        onClick={() => {
                          const m = missions.find((ms) => ms.missionId === criticalWeatherAlerts[0].missionId);
                          if (m) onRerouteMission(m);
                        }}
                        className="px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow-sm transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reroute Safe Path</span>
                      </button>
                    )}
                    <button
                      onClick={() => setDismissedWeatherAlert(true)}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDismissedWeatherAlert(true)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Dismiss weather alert"
                aria-label="Dismiss weather alert"
              >
                <span className="text-xs font-bold leading-none">✕</span>
              </button>
            </div>
          </div>
        )}

      {/* Interactive Tactical Canvas */}
      <div
        ref={mapCanvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className={`relative flex-1 w-full h-full overflow-hidden select-none bg-[radial-gradient(ellipse_at_50%_50%,#0f1c33_0%,#050812_85%)] ${
          isDrawingNFZ ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* Signal Strength (RSSI) Heatmap Overlay Canvas */}
        {showRssiHeatmap && (
          <canvas
            ref={rssiCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: rssiHeatmapOpacity }}
          />
        )}

        {/* Radar Range Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-[140px] h-[140px] rounded-full border border-sky-400/30" />
          <div className="w-[280px] h-[280px] rounded-full border border-sky-400/25 absolute" />
          <div className="w-[420px] h-[420px] rounded-full border border-sky-400/20 absolute" />
          <div className="w-[560px] h-[560px] rounded-full border border-sky-400/15 absolute" />
          {/* Crosshairs */}
          <div className="w-full h-[1px] bg-sky-500/15 absolute" />
          <div className="h-full w-[1px] bg-sky-500/15 absolute" />
        </div>

        {/* SVG Geofence Boundaries, Waypoint Paths & Forbidden Zones */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="corridor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>

            {/* Grid background pattern */}
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeOpacity="0.4"
              />
            </pattern>

            {/* Hazard Red Hatch Pattern for Forbidden Zones */}
            <pattern
              id="nfz-hatch"
              width="12"
              height="12"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="12" stroke="#ef4444" strokeWidth="2.5" strokeOpacity="0.35" />
            </pattern>

            {/* Active Conflict Pulsing Hazard Hatch Pattern */}
            <pattern
              id="nfz-hatch-conflict"
              width="10"
              height="10"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="10" stroke="#f43f5e" strokeWidth="3" strokeOpacity="0.6" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid-pattern)" />

          {/* RENDER FORBIDDEN ZONES (NO-FLY AREAS) */}
          {forbiddenZones.map((zone) => {
            if (zone.points.length < 3) return null;
            const pathStr =
              zone.points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`, '') +
              ' Z';

            const hasConflictWithThisZone = pathConflicts.some((c) => c.zoneId === zone.id);

            return (
              <g key={`forbidden-zone-${zone.id}`}>
                {/* Polygon Fill with Red Hazard Hatch */}
                <path
                  d={pathStr}
                  fill={hasConflictWithThisZone ? 'url(#nfz-hatch-conflict)' : 'url(#nfz-hatch)'}
                  stroke={hasConflictWithThisZone ? '#f43f5e' : '#ef4444'}
                  strokeWidth={hasConflictWithThisZone ? '2.5' : '1.8'}
                  strokeDasharray={hasConflictWithThisZone ? '6 3' : '4 3'}
                  className={hasConflictWithThisZone ? 'animate-pulse' : ''}
                />

                {/* Perimeter Vertices */}
                {zone.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={`${pt.x}%`}
                    cy={`${pt.y}%`}
                    r={hasConflictWithThisZone ? 3.5 : 2.5}
                    fill={hasConflictWithThisZone ? '#f43f5e' : '#ef4444'}
                  />
                ))}

                {/* Zone Label */}
                <text
                  x={`${zone.points[0].x}%`}
                  y={`${zone.points[0].y - 2}%`}
                  fill={hasConflictWithThisZone ? '#ff6467' : '#f87171'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {hasConflictWithThisZone ? `🚫 CONFLICT: ${zone.name}` : `🚫 ${zone.name}`}
                </text>
              </g>
            );
          })}

          {/* RENDER LIVE IN-PROGRESS DRAWING OF FORBIDDEN ZONE */}
          {isDrawingNFZ && drawingPoints.length > 0 && (
            <g>
              {/* Drawn segments */}
              {drawingPoints.map((pt, idx) => {
                const nextPt = drawingPoints[idx + 1] || cursorPos;
                return (
                  <g key={`drawing-${idx}`}>
                    <circle cx={`${pt.x}%`} cy={`${pt.y}%`} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                    {nextPt && (
                      <line
                        x1={`${pt.x}%`}
                        y1={`${pt.y}%`}
                        x2={`${nextPt.x}%`}
                        y2={`${nextPt.y}%`}
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                    )}
                  </g>
                );
              })}

              {/* Close-loop preview if 3 or more points and cursor present */}
              {drawingPoints.length >= 3 && cursorPos && (
                <line
                  x1={`${cursorPos.x}%`}
                  y1={`${cursorPos.y}%`}
                  x2={`${drawingPoints[0].x}%`}
                  y2={`${drawingPoints[0].y}%`}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                  opacity="0.6"
                />
              )}
            </g>
          )}

          {/* Render Geofence Safe Corridors for Active Missions */}
          {showGeofences &&
            activeMissions.map((m) => {
              if (!m.waypoints || m.waypoints.length === 0) return null;
              const points = [
                dispatchHub,
                ...m.waypoints.map((wp) => project(wp.latitude, wp.longitude)),
              ];

              const geofencePolygonPath = computeGeofencePolygon(points, GEOFENCE_CORRIDOR_RADIUS_PERCENT);
              const isMissionBreached = breachedDrones.some((b) => b.mission.missionId === m.missionId);

              return (
                <g key={`geofence-${m.missionId}`}>
                  <path
                    d={geofencePolygonPath}
                    fill={isMissionBreached ? 'rgba(239, 68, 68, 0.22)' : 'rgba(14, 165, 233, 0.08)'}
                    stroke={isMissionBreached ? '#ef4444' : '#0284c7'}
                    strokeWidth={isMissionBreached ? '2.5' : '1.5'}
                    strokeDasharray={isMissionBreached ? '6 4' : '4 4'}
                    className={isMissionBreached ? 'animate-pulse' : ''}
                  />

                  {points[1] && (
                    <text
                      x={`${points[1].x - 4}%`}
                      y={`${points[1].y - 5}%`}
                      fill={isMissionBreached ? '#f87171' : '#38bdf8'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      opacity="0.85"
                    >
                      {isMissionBreached ? 'GEOFENCE BREACHED' : 'SAFE FLIGHT GEOFENCE'}
                    </text>
                  )}
                </g>
              );
            })}

          {/* Draw active mission flight tracks with conflict highlighting */}
          {activeMissions.map((m) => {
            if (!m.waypoints || m.waypoints.length === 0) return null;
            const points = [
              dispatchHub,
              ...m.waypoints.map((wp) => project(wp.latitude, wp.longitude)),
            ];

            const pathStr = points.reduce(
              (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`,
              ''
            );

            const hasConflict = pathConflicts.some((c) => c.missionId === m.missionId);
            const isSuspended = m.status === 'SUSPENDED_OFFLINE';

            return (
              <g key={m.missionId}>
                <path
                  d={pathStr}
                  fill="none"
                  stroke={hasConflict ? '#f43f5e' : isSuspended ? '#f43f5e' : '#38bdf8'}
                  strokeWidth={hasConflict ? '3' : isSuspended ? '1.5' : '2'}
                  strokeDasharray={hasConflict ? '6 3' : isSuspended ? '4 4' : 'none'}
                  strokeOpacity={0.8}
                  className={hasConflict ? 'animate-pulse' : ''}
                />
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={`${pt.x}%`}
                    cy={`${pt.y}%`}
                    r={i === 0 ? 4 : 3}
                    fill={hasConflict ? '#f43f5e' : i === 0 ? '#10b981' : '#38bdf8'}
                    opacity={0.9}
                  />
                ))}
              </g>
            );
          })}

          {/* Deviation vector line connecting breached drone to safe boundary */}
          {breachedDrones.map((b) => {
            const dronePos = project(b.drone.currentLocation.latitude, b.drone.currentLocation.longitude);
            return (
              <g key={`breach-line-${b.drone.droneId}`}>
                <line
                  x1={`${dronePos.x}%`}
                  y1={`${dronePos.y}%`}
                  x2={`${b.nearestCorridorPoint.x}%`}
                  y2={`${b.nearestCorridorPoint.y}%`}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  className="animate-pulse"
                />
                <circle
                  cx={`${b.nearestCorridorPoint.x}%`}
                  cy={`${b.nearestCorridorPoint.y}%`}
                  r="3.5"
                  fill="#ef4444"
                />
                <text
                  x={`${(dronePos.x + b.nearestCorridorPoint.x) / 2}%`}
                  y={`${(dronePos.y + b.nearestCorridorPoint.y) / 2 - 2}%`}
                  fill="#f87171"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  DEVIATION: {b.deviationMeters}m
                </text>
              </g>
            );
          })}

          {/* Draw Live Breadcrumbs trail for in-flight drones */}
          {Object.entries(trailMap).map(([droneId, pts]) => {
            if (pts.length < 2) return null;
            const trailPath = pts.reduce(
              (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`,
              ''
            );
            return (
              <g key={`trail-${droneId}`}>
                <path
                  d={trailPath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                  strokeOpacity="0.5"
                />
                {pts.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={`${pt.x}%`}
                    cy={`${pt.y}%`}
                    r="1.5"
                    fill="#38bdf8"
                    opacity={((idx + 1) / pts.length) * 0.6}
                  />
                ))}
              </g>
            );
          })}

          {/* WEATHER LAYER: PRECIPITATION RADAR CELLS & GUST ISOBARS */}
          {showWeatherLayer && (
            <g key="weather-radar-cells">
              <defs>
                <radialGradient id="squall-gradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55" />
                  <stop offset="45%" stopColor="#0284c7" stopOpacity="0.30" />
                  <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="storm-gradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.65" />
                  <stop offset="40%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="drizzle-gradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Render Active Precipitation Cells */}
              {precipitationRadarCells.map((cell) => {
                const center = project(cell.latitude, cell.longitude);
                const rPercent = Math.max(7, (cell.radiusKm / (latSpan * 111)) * 100);
                const isSevere = cell.alertLevel === 'CRITICAL' || cell.intensityMmH > 9;
                const isWarning = cell.alertLevel === 'WARNING' || cell.intensityMmH > 4.5;

                return (
                  <g key={cell.id} className="pointer-events-none">
                    {/* Soft Radar Splat */}
                    <circle
                      cx={`${center.x}%`}
                      cy={`${center.y}%`}
                      r={`${rPercent}%`}
                      fill={isSevere ? 'url(#storm-gradient)' : isWarning ? 'url(#squall-gradient)' : 'url(#drizzle-gradient)'}
                    />
                    {/* Concentric Isobar Waves */}
                    <circle
                      cx={`${center.x}%`}
                      cy={`${center.y}%`}
                      r={`${rPercent * 0.65}%`}
                      fill="none"
                      stroke={isSevere ? '#f43f5e' : isWarning ? '#06b6d4' : '#10b981'}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      strokeOpacity="0.5"
                    />
                    <circle
                      cx={`${center.x}%`}
                      cy={`${center.y}%`}
                      r={`${rPercent}%`}
                      fill="none"
                      stroke={isSevere ? '#f43f5e' : isWarning ? '#38bdf8' : '#34d399'}
                      strokeWidth="1.2"
                      strokeDasharray="6 4"
                      strokeOpacity="0.65"
                      className={isSevere ? 'animate-pulse' : ''}
                    />

                    {/* Radar Center Cell Tag */}
                    <text
                      x={`${center.x}%`}
                      y={`${center.y - rPercent * 0.7}%`}
                      fill={isSevere ? '#fda4af' : isWarning ? '#67e8f9' : '#6ee7b7'}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {cell.name.toUpperCase()} ({cell.intensityMmH} mm/h)
                    </text>
                  </g>
                );
              })}

              {/* Dynamic Airflow Streamlines Across Airspace */}
              {[18, 38, 62, 82].map((offsetY, idx) => {
                const rad = (windData.directionDeg * Math.PI) / 180;
                const len = 32;
                const dx = Math.sin(rad) * len;
                const dy = -Math.cos(rad) * len;
                const startX = 20 + idx * 18;
                return (
                  <g key={`wind-stream-${idx}`} opacity={0.3}>
                    <line
                      x1={`${startX}%`}
                      y1={`${offsetY}%`}
                      x2={`${startX + dx}%`}
                      y2={`${offsetY + dy}%`}
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="5 4"
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* WEATHER LAYER: INTERACTIVE MISSION COORDINATE WEATHER & ALERT BADGES */}
        {showWeatherLayer &&
          missionWeatherPoints.map((pt) => {
            const hasAlert = pt.weather.hasAlert;
            const isCritical = pt.weather.alertSeverity === 'CRITICAL';
            const isWarning = pt.weather.alertSeverity === 'WARNING';
            const isHovered = hoveredWeatherPoint === pt.id;

            return (
              <div
                key={pt.id}
                style={{ left: `${pt.pos.x}%`, top: `${pt.pos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-25 cursor-pointer"
                onMouseEnter={() => setHoveredWeatherPoint(pt.id)}
                onMouseLeave={() => setHoveredWeatherPoint(null)}
              >
                {/* Weather Coordinate Pin Indicator */}
                <div
                  className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono-numbers backdrop-blur-md border shadow-lg transition-all duration-200 ${
                    isCritical
                      ? 'bg-rose-950/90 text-rose-200 border-rose-500 ring-2 ring-rose-500/50 shadow-rose-900/50 scale-105'
                      : isWarning
                      ? 'bg-amber-950/90 text-amber-200 border-amber-500 ring-1 ring-amber-500/50 shadow-amber-900/40'
                      : 'bg-[#081528]/90 text-cyan-300 border-cyan-700/70 hover:border-cyan-400'
                  }`}
                >
                  {/* Wind Direction Arrow Rotated by Heading */}
                  <span
                    style={{ transform: `rotate(${pt.weather.windDirectionDeg}deg)` }}
                    className="inline-block transition-transform duration-500"
                    title={`Wind from ${pt.weather.windCardinal} (${pt.weather.windDirectionDeg}°)`}
                  >
                    <Navigation className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400/40" />
                  </span>

                  <span className="font-bold">{Math.round(pt.weather.windSpeedKmh)} km/h</span>

                  {/* Precipitation Rate if any */}
                  {pt.weather.precipitationMmH > 0 && (
                    <span className="flex items-center gap-0.5 text-cyan-200 border-l border-slate-700 pl-1">
                      <Droplets className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{pt.weather.precipitationMmH}m</span>
                    </span>
                  )}

                  {/* Pulsing Alert Warning Ping */}
                  {hasAlert && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCritical ? 'bg-rose-500 animate-ping' : 'bg-amber-400 animate-pulse'
                      }`}
                    />
                  )}
                </div>

                {/* Floating Detailed Weather Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-xl bg-[#091122]/98 border border-cyan-500/50 shadow-2xl backdrop-blur-lg z-40 text-left pointer-events-none">
                    <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-800 text-[10px]">
                      <span className="font-bold text-white truncate">{pt.label}</span>
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {pt.weather.flightSafety}
                      </span>
                    </div>

                    <div className="mt-1.5 space-y-1 text-[9px] text-slate-300 font-mono-numbers">
                      <div className="flex justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Wind className="w-2.5 h-2.5 text-cyan-400" /> Wind Speed:
                        </span>
                        <span className="font-bold text-white">
                          {pt.weather.windSpeedKmh} km/h {pt.weather.windCardinal}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Peak Gusts:</span>
                        <span className="text-amber-300">{pt.weather.gustKmh} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <CloudRain className="w-2.5 h-2.5 text-cyan-400" /> Rain Rate:
                        </span>
                        <span className={pt.weather.precipitationMmH > 0 ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                          {pt.weather.precipitationMmH} mm/h ({pt.weather.precipitationType})
                        </span>
                      </div>
                      {pt.weather.alertMessage && (
                        <div className="mt-1 pt-1 border-t border-slate-800 text-amber-300 font-sans text-[9px] leading-tight">
                          ⚠️ {pt.weather.alertMessage}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {/* Airspace Landmark Pins */}
        {showLandmarks &&
          AIRSPACE_LANDMARKS.map((lm) => {
            const pt = project(lm.latitude, lm.longitude);
            return (
              <div
                key={lm.id}
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10 pointer-events-auto"
                title={`${lm.name} (${lm.zone})`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border shadow-sm transition-transform group-hover:scale-125 ${
                    lm.category === 'HUB'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : lm.category === 'HOSPITAL'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'bg-slate-800/80 border-slate-600 text-slate-300'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5" />
                </div>
                <span className="hidden group-hover:block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono-numbers bg-slate-950/95 border border-slate-700 text-slate-200 whitespace-nowrap shadow-lg z-30">
                  {lm.name}
                </span>
              </div>
            );
          })}

        {/* Moving Live Drones Markers */}
        {filteredDrones.map((drone) => {
          const pos = project(drone.currentLocation.latitude, drone.currentLocation.longitude);
          const isOffline = drone.status === 'OFFLINE_WAITING';
          const isInFlight = drone.status === 'IN_FLIGHT';
          const isSelected = followDroneId === drone.droneId;
          const isBreached = breachedDrones.some((b) => b.drone.droneId === drone.droneId);
          const hasConflict = pathConflicts.some((c) => c.droneId === drone.droneId);
          const place = getNearestPlace(
            drone.currentLocation.latitude,
            drone.currentLocation.longitude
          );

          return (
            <div
              key={drone.droneId}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transition: 'left 1.2s ease-out, top 1.2s ease-out',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
              onMouseEnter={() => setHoveredEntity(drone.droneId)}
              onMouseLeave={() => setHoveredEntity(null)}
              onClick={(e) => {
                if (isDrawingNFZ) return; // don't trigger selection while drawing
                e.stopPropagation();
                setFollowDroneId(drone.droneId);
                if (onSelectDrone) onSelectDrone(drone.droneId);
                if (onInspectLocation) {
                  onInspectLocation(drone);
                } else if (drone.currentMissionId && onSelectMission) {
                  onSelectMission(drone.currentMissionId);
                }
              }}
            >
              {/* Drone Pin Icon with Heading Rotation */}
              <div
                className={`relative p-1.5 rounded-full border transition-transform duration-300 ${
                  hasConflict
                    ? 'bg-red-950 border-red-500 text-red-200 shadow-xl shadow-red-950 ring-2 ring-red-400 animate-pulse'
                    : isBreached
                    ? 'bg-red-950 border-red-500 text-red-200 shadow-xl shadow-red-950 ring-2 ring-red-400 animate-pulse'
                    : isOffline
                    ? 'bg-rose-950 border-rose-500 text-rose-400 shadow-lg shadow-rose-950'
                    : isInFlight
                    ? 'bg-sky-950 border-sky-400 text-sky-300 shadow-lg shadow-sky-950'
                    : 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950'
                } ${isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-black' : ''}`}
              >
                <div
                  style={{
                    transform: `rotate(${drone.headingDeg || 0}deg)`,
                    transition: 'transform 0.6s ease',
                  }}
                >
                  <Plane className="w-3.5 h-3.5" />
                </div>

                {/* Pulsing red beacon ring for conflict / breached drones */}
                {(hasConflict || isBreached) && (
                  <div className="absolute -inset-1.5 rounded-full border border-red-500 animate-ping pointer-events-none" />
                )}

                {/* Pulsing beacon ring for normal in-flight drones */}
                {isInFlight && !hasConflict && !isBreached && (
                  <div className="absolute -inset-1 rounded-full border border-sky-400 animate-ping pointer-events-none" />
                )}
              </div>

              {/* Drone Tag Label */}
              <div className="mt-1 flex flex-col items-center">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono-numbers whitespace-nowrap border shadow-md ${
                    hasConflict || isBreached
                      ? 'bg-red-950 border-red-500 text-red-200 font-bold'
                      : isOffline
                      ? 'bg-rose-950/90 border-rose-800 text-rose-300'
                      : isInFlight
                      ? 'bg-slate-900/90 border-sky-700 text-sky-200'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300'
                  }`}
                >
                  {drone.droneId}
                </span>

                {/* Conflict or Place Tag */}
                {hasConflict ? (
                  <span className="text-[9px] font-mono-numbers font-bold text-white bg-red-600 px-1 rounded mt-0.5 whitespace-nowrap animate-pulse">
                    FORBIDDEN ZONE CONFLICT
                  </span>
                ) : isBreached ? (
                  <span className="text-[9px] font-mono-numbers font-bold text-red-200 bg-red-600 px-1 rounded mt-0.5 whitespace-nowrap animate-pulse">
                    BREACH OUTSIDE ZONE
                  </span>
                ) : (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    <span className="text-[9px] font-sans font-medium text-sky-300 bg-black/85 px-1.5 py-0.2 rounded whitespace-nowrap border border-sky-900/50 flex items-center gap-1 shadow-md">
                      <MapPin className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                      <span>{place.formattedLocation}</span>
                    </span>
                    {showRssiHeatmap && (
                      <span
                        className={`text-[8px] font-mono-numbers px-1 py-0.2 rounded bg-black/80 border border-slate-800 flex items-center gap-0.5 shadow-sm ${
                          getRssiQuality(getDroneRssi(drone)).color
                        }`}
                      >
                        <Wifi className="w-2 h-2" />
                        <span>{getDroneRssi(drone)} dBm</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Hover Place Location Telemetry Card */}
              {hoveredEntity === drone.droneId && !isDrawingNFZ && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl bg-[#080d1a]/95 border border-sky-500/40 shadow-2xl z-30 pointer-events-none backdrop-blur-md">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-mono-numbers font-semibold text-white">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <Plane className="w-3.5 h-3.5" />
                      {drone.droneId}
                    </span>
                    <span
                      className={`text-[10px] ${
                        hasConflict
                          ? 'text-red-400 font-bold'
                          : isBreached
                          ? 'text-red-400 font-bold'
                          : isOffline
                          ? 'text-rose-400'
                          : isInFlight
                          ? 'text-sky-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {hasConflict ? 'FORBIDDEN ZONE CONFLICT' : isBreached ? 'GEOFENCE VIOLATION' : drone.status}
                    </span>
                  </div>

                  <div className="mt-2 p-2 rounded-lg bg-sky-950/40 border border-sky-800/40 space-y-0.5">
                    <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider block">
                      CURRENT PLACE LOCATION
                    </span>
                    <span className="text-xs font-bold text-white font-sans block">
                      {place.formattedLocation}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block">
                      {place.zone}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-[10px] font-mono-numbers text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">EXACT GPS:</span>
                      <span className="text-slate-200">
                        {drone.currentLocation.latitude.toFixed(5)}°N,{' '}
                        {drone.currentLocation.longitude.toFixed(5)}°E
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ALTITUDE:</span>
                      <span>{drone.altitudeMeters || 0} m AGL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SPEED:</span>
                      <span>{drone.speedKmh || 0} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">BATTERY:</span>
                      <span
                        className={
                          drone.batteryPercent < 15
                            ? 'text-red-400 font-bold'
                            : 'text-emerald-400 font-semibold'
                        }
                      >
                        {drone.batteryPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-0.5 border-t border-slate-800/60">
                      <span className="text-slate-400">SIGNAL (RSSI):</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          getRssiQuality(getDroneRssi(drone)).color
                        }`}
                      >
                        <Wifi className="w-3 h-3" />
                        <span>
                          {getDroneRssi(drone)} dBm ({getRssiQuality(getDroneRssi(drone)).label})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Floating Signal Strength (RSSI) Heatmap Legend & Opacity HUD */}
        {showRssiHeatmap && (
          <div className="absolute bottom-3 left-3 z-20 pointer-events-auto p-2.5 rounded-xl bg-[#070d1a]/92 backdrop-blur-md border border-slate-800/80 shadow-xl max-w-[280px] transition-all duration-200">
            <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-800/70 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>RF Signal Heatmap</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Fleet Avg:</span>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-slate-900 border border-slate-700 ${
                    getRssiQuality(avgFleetRssi).color
                  }`}
                >
                  {avgFleetRssi} dBm
                </span>
              </div>
            </div>

            {/* Gradient Bar representing RSSI Signal Spectrum */}
            <div className="mt-2 space-y-1">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 via-amber-400 to-rose-500 shadow-inner" />
              <div className="flex justify-between items-center text-[9px] font-mono-numbers text-slate-400 px-0.5">
                <span className="text-emerald-400 font-semibold">-45 dBm</span>
                <span className="text-cyan-400">-62 dBm</span>
                <span className="text-amber-400">-74 dBm</span>
                <span className="text-rose-400 font-semibold">-92 dBm</span>
              </div>
            </div>

            {/* Opacity Control & Hub Indicator */}
            <div className="mt-2 pt-1.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-[9px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Hub Alpha + S4 Relay</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-500 mr-0.5">Opacity:</span>
                {[0.4, 0.65, 0.9].map((val) => (
                  <button
                    key={val}
                    onClick={() => setRssiHeatmapOpacity(val)}
                    className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                      rssiHeatmapOpacity === val
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                    }`}
                  >
                    {Math.round(val * 100)}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Weather Telemetry & Preset Simulation HUD */}
        {showWeatherLayer && (
          <div className="absolute bottom-3 right-3 z-20 pointer-events-auto p-2.5 rounded-xl bg-[#070d1a]/92 backdrop-blur-md border border-cyan-800/60 shadow-xl max-w-[310px] transition-all duration-200">
            <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-800/70 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>Atmospheric Radar & Alerts</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Status:</span>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                    criticalWeatherAlerts.length > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : activeWeatherAlerts.length > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {criticalWeatherAlerts.length > 0
                    ? 'RESTRICTED'
                    : activeWeatherAlerts.length > 0
                    ? 'ADVISORY'
                    : 'SAFE'}
                </span>
              </div>
            </div>

            {/* Atmospheric Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono-numbers">
              <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <div className="text-slate-400 text-[9px] flex items-center gap-1">
                  <Wind className="w-3 h-3 text-cyan-400" />
                  <span>AMBIENT WIND</span>
                </div>
                <div className="text-white font-bold text-xs mt-0.5">
                  {windData.speedKmh}{' '}
                  <span className="text-[10px] font-normal text-slate-400">
                    km/h {windData.directionCardinal}
                  </span>
                </div>
                <div className="text-slate-400 text-[9px]">
                  Gusts: <strong className="text-amber-300">{windData.gustKmh} km/h</strong>
                </div>
              </div>

              <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <div className="text-slate-400 text-[9px] flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-cyan-400" />
                  <span>PRECIPITATION</span>
                </div>
                <div className="text-white font-bold text-xs mt-0.5">
                  {precipitationRadarCells.length > 0
                    ? `${precipitationRadarCells[0].intensityMmH} mm/h`
                    : '0.0 mm/h'}
                </div>
                <div className="text-slate-400 text-[9px]">
                  {activeWeatherAlerts.length > 0 ? (
                    <span className="text-amber-300 font-semibold">
                      {activeWeatherAlerts.length} Active Alert(s)
                    </span>
                  ) : (
                    <span className="text-emerald-400">All Corridors Clear</span>
                  )}
                </div>
              </div>
            </div>

            {/* Test Simulation Presets */}
            <div className="mt-2 pt-1.5 border-t border-slate-800/70 flex items-center justify-between text-[10px]">
              <span className="text-[9px] text-slate-400">Simulate:</span>
              <div className="flex items-center gap-1">
                {WIND_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      windTelemetryService.applyPreset(p.id);
                      setWeatherPreset(p.id);
                      setDismissedWeatherAlert(false);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                      weatherPreset === p.id
                        ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/50'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                    }`}
                    title={`Apply ${p.label}`}
                  >
                    {p.id.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Live Location Telemetry Ribbon */}
      <div className="p-3 bg-[#060a14] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono-numbers">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {activeTrackingDrone ? activeTrackingDrone.droneId : 'FLEET RADAR'}
            </span>
          </div>

          {activeTrackingDrone && activeTrackingPlace && (
            <div className="flex items-center gap-3 text-slate-300 text-[11px]">
              <span className="text-sky-300 font-semibold flex items-center gap-1 font-sans">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{activeTrackingPlace.formattedLocation}</span>
              </span>
              <span className="text-slate-500 hidden md:inline">·</span>
              <span className="hidden md:inline">
                {activeTrackingDrone.currentLocation.latitude.toFixed(5)}°N,{' '}
                {activeTrackingDrone.currentLocation.longitude.toFixed(5)}°E
              </span>
              <span className="text-slate-500 hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                ALT: {activeTrackingDrone.altitudeMeters || 0}m
              </span>
              {showRssiHeatmap && (
                <>
                  <span className="text-slate-500 hidden sm:inline">·</span>
                  <span
                    className={`hidden sm:inline-flex items-center gap-1 font-mono-numbers ${
                      getRssiQuality(getDroneRssi(activeTrackingDrone)).color
                    }`}
                  >
                    <Wifi className="w-3 h-3" />
                    <span>{getDroneRssi(activeTrackingDrone)} dBm</span>
                  </span>
                </>
              )}
              {showWeatherLayer && (
                <>
                  <span className="text-slate-500 hidden md:inline">·</span>
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-cyan-300 font-mono-numbers">
                    <Wind className="w-3 h-3 text-cyan-400" />
                    <span>
                      {
                        windTelemetryService.getWeatherAtCoordinate(
                          activeTrackingDrone.currentLocation.latitude,
                          activeTrackingDrone.currentLocation.longitude
                        ).windSpeedKmh
                      }{' '}
                      km/h
                    </span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Satellite className="w-3.5 h-3.5 text-emerald-400" />
          <span>19 Satellites</span>
          {showRssiHeatmap && (
            <>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>
                  Avg RSSI:{' '}
                  <strong className={getRssiQuality(avgFleetRssi).color}>
                    {avgFleetRssi} dBm
                  </strong>
                </span>
              </span>
            </>
          )}
          {showWeatherLayer && (
            <>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1 text-slate-300">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Squall Max:{' '}
                  <strong
                    className={
                      criticalWeatherAlerts.length > 0 ? 'text-rose-400 font-bold' : 'text-cyan-300'
                    }
                  >
                    {precipitationRadarCells.length > 0
                      ? `${precipitationRadarCells[0].intensityMmH} mm/h`
                      : '0 mm/h'}
                  </strong>
                </span>
              </span>
            </>
          )}
          <span className="text-slate-600">·</span>
          <span
            className={
              hasPathConflict
                ? 'text-red-400 font-bold animate-pulse'
                : hasActiveBreach
                ? 'text-red-400 font-bold animate-pulse'
                : 'text-emerald-400'
            }
          >
            {hasPathConflict
              ? 'FORBIDDEN ZONE INTERSECTION ACTIVE'
              : hasActiveBreach
              ? 'CORRIDOR DEVIATION DETECTED'
              : `${forbiddenZones.length} Forbidden Zones Active`}
          </span>
        </div>
      </div>
    </div>
  );
};
