// Wind & Atmospheric Telemetry Service for AeroSaga Airspace
// Provides live wind vector data, gust telemetry, and headwind/tailwind calculations.

export interface WindTelemetry {
  speedKmh: number; // Wind speed in km/h
  directionDeg: number; // Meteorological compass direction (0-360) wind is blowing FROM
  directionCardinal: string; // e.g. "NW", "NE", "E"
  gustKmh: number; // Peak gust speed in km/h
  turbulenceLevel: 'LIGHT' | 'MODERATE' | 'SEVERE';
  lastUpdated: string;
}

// Preset wind conditions for testing & operational simulation
export const WIND_PRESETS = [
  { id: 'calm', label: 'Calm', speedKmh: 8, directionDeg: 180, gustKmh: 12 },
  { id: 'moderate', label: 'Moderate (24 km/h)', speedKmh: 24, directionDeg: 315, gustKmh: 34 },
  { id: 'high', label: 'High Headwind (38 km/h)', speedKmh: 38, directionDeg: 330, gustKmh: 48 },
  { id: 'severe', label: 'Severe Gale (48 km/h)', speedKmh: 48, directionDeg: 345, gustKmh: 62 },
];

const getCardinalDirection = (deg: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const index = Math.round(((deg % 360) / 45));
  return directions[index];
};

class WindTelemetryService {
  private currentWind: WindTelemetry = {
    speedKmh: 26,
    directionDeg: 320, // Wind blowing from Northwest (320°) towards Southeast
    directionCardinal: 'NW',
    gustKmh: 36,
    turbulenceLevel: 'MODERATE',
    lastUpdated: new Date().toISOString(),
  };

  private listeners: Array<(wind: WindTelemetry) => void> = [];

  constructor() {
    // Subtle real-time oscillation of natural wind telemetry every 3 seconds
    setInterval(() => {
      // Natural slight fluctuation of ±1.5 km/h
      const fluctuation = (Math.random() - 0.5) * 2;
      const baseSpeed = Math.max(5, Math.min(65, this.currentWind.speedKmh + fluctuation));
      this.currentWind = {
        ...this.currentWind,
        speedKmh: Math.round(baseSpeed * 10) / 10,
        gustKmh: Math.round((baseSpeed + 8 + Math.random() * 5) * 10) / 10,
        lastUpdated: new Date().toISOString(),
      };
      this.notify();
    }, 3500);
  }

  public getWind(): WindTelemetry {
    return { ...this.currentWind };
  }

  public setWind(speedKmh: number, directionDeg: number, gustKmh?: number) {
    const cardinal = getCardinalDirection(directionDeg);
    let turbulence: 'LIGHT' | 'MODERATE' | 'SEVERE' = 'LIGHT';
    if (speedKmh > 35) turbulence = 'SEVERE';
    else if (speedKmh > 18) turbulence = 'MODERATE';

    this.currentWind = {
      speedKmh: Math.max(0, Math.round(speedKmh * 10) / 10),
      directionDeg: Math.round((directionDeg % 360)),
      directionCardinal: cardinal,
      gustKmh: gustKmh || Math.round(speedKmh * 1.3),
      turbulenceLevel: turbulence,
      lastUpdated: new Date().toISOString(),
    };
    this.notify();
  }

  public subscribe(callback: (wind: WindTelemetry) => void): () => void {
    this.listeners.push(callback);
    callback({ ...this.currentWind });
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb({ ...this.currentWind }));
  }
}

export const windTelemetryService = new WindTelemetryService();

// Calculate initial bearing in degrees from point 1 to point 2 (0-360°)
export const calculateBearingDeg = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
};

// Calculate effective headwind (positive = opposing, negative = tailwind)
// and crosswind component for a given flight bearing
export const calculateWindComponents = (
  flightBearingDeg: number,
  windSpeedKmh: number,
  windFromDeg: number
) => {
  // Angular difference between flight heading and wind vector
  const deltaAngleRad = ((flightBearingDeg - windFromDeg) * Math.PI) / 180;

  // Headwind is positive when wind opposes flight direction
  // cos(0) = 1 (pure headwind), cos(180) = -1 (pure tailwind)
  const headwindKmh = Math.round(windSpeedKmh * Math.cos(deltaAngleRad));
  const crosswindKmh = Math.round(Math.abs(windSpeedKmh * Math.sin(deltaAngleRad)));

  return {
    headwindKmh, // positive: opposing headwind; negative: assisting tailwind
    crosswindKmh,
    isHeadwind: headwindKmh > 4,
    isTailwind: headwindKmh < -4,
  };
};
