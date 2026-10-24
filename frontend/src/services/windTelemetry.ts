// Wind & Atmospheric Telemetry Service for AeroSaga Airspace
// Provides live wind vector data, gust telemetry, radar precipitation cells, and coordinate-specific alerts.

export interface WindTelemetry {
  speedKmh: number; // Wind speed in km/h
  directionDeg: number; // Meteorological compass direction (0-360) wind is blowing FROM
  directionCardinal: string; // e.g. "NW", "NE", "E"
  gustKmh: number; // Peak gust speed in km/h
  turbulenceLevel: 'LIGHT' | 'MODERATE' | 'SEVERE';
  lastUpdated: string;
}

export interface PrecipitationCell {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  intensityMmH: number; // e.g. 8.4 mm/h
  type: 'DRIZZLE' | 'RAIN' | 'SQUALL' | 'THUNDERSTORM';
  alertLevel: 'ADVISORY' | 'WARNING' | 'CRITICAL';
}

export interface CoordinateWeather {
  latitude: number;
  longitude: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windCardinal: string;
  gustKmh: number;
  precipitationMmH: number;
  precipitationProbability: number;
  precipitationType: 'NONE' | 'DRIZZLE' | 'RAIN' | 'SQUALL' | 'THUNDERSTORM';
  condition: 'CLEAR' | 'BREEZY' | 'LIGHT_RAIN' | 'SQUALL' | 'THUNDERSTORM';
  hasAlert: boolean;
  alertType?: 'WIND' | 'PRECIPITATION' | 'COMBINED';
  alertSeverity: 'NONE' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  alertMessage?: string;
  flightSafety: 'SAFE' | 'MARGINAL' | 'RESTRICTED';
}

// Preset weather conditions for testing & operational simulation
export const WIND_PRESETS = [
  { id: 'calm', label: 'Calm Clear (8 km/h)', speedKmh: 8, directionDeg: 180, gustKmh: 12 },
  { id: 'moderate', label: 'Moderate Wind & Drizzle (24 km/h)', speedKmh: 24, directionDeg: 315, gustKmh: 34 },
  { id: 'high', label: 'High Gusts & Squall Alert (38 km/h)', speedKmh: 38, directionDeg: 330, gustKmh: 48 },
  { id: 'severe', label: 'Severe Gale & Thunderstorm (48 km/h)', speedKmh: 48, directionDeg: 345, gustKmh: 64 },
];

export const getCardinalDirection = (deg: number): string => {
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

  // Active microclimate precipitation cells in Vijayawada / Krishna River Basin corridor
  private precipitationCells: PrecipitationCell[] = [
    {
      id: 'CELL-KRISHNA-SQUALL',
      name: 'Krishna River Basin Squall Cell',
      latitude: 16.516,
      longitude: 80.628,
      radiusKm: 1.8,
      intensityMmH: 6.8, // 6.8 mm/h rain
      type: 'SQUALL',
      alertLevel: 'WARNING',
    },
    {
      id: 'CELL-EAST-DRIZZLE',
      name: 'Autonagar Industrial Cloud Cluster',
      latitude: 16.498,
      longitude: 80.658,
      radiusKm: 1.4,
      intensityMmH: 2.6,
      type: 'DRIZZLE',
      alertLevel: 'ADVISORY',
    },
  ];

  private listeners: Array<(wind: WindTelemetry) => void> = [];

  constructor() {
    // Subtle real-time oscillation of natural wind telemetry every 3.5 seconds
    setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 1.8;
      const baseSpeed = Math.max(5, Math.min(65, this.currentWind.speedKmh + fluctuation));
      this.currentWind = {
        ...this.currentWind,
        speedKmh: Math.round(baseSpeed * 10) / 10,
        gustKmh: Math.round((baseSpeed + 8 + Math.random() * 4) * 10) / 10,
        lastUpdated: new Date().toISOString(),
      };
      this.notify();
    }, 3500);
  }

  public getWind(): WindTelemetry {
    return { ...this.currentWind };
  }

  public getPrecipitationCells(): PrecipitationCell[] {
    return [...this.precipitationCells];
  }

  public setPrecipitationCells(cells: PrecipitationCell[]) {
    this.precipitationCells = cells;
    this.notify();
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

  public applyPreset(presetId: string) {
    const preset = WIND_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    this.setWind(preset.speedKmh, preset.directionDeg, preset.gustKmh);

    if (preset.id === 'calm') {
      this.precipitationCells = [];
    } else if (preset.id === 'moderate') {
      this.precipitationCells = [
        {
          id: 'CELL-EAST-DRIZZLE',
          name: 'Autonagar Light Drizzle',
          latitude: 16.502,
          longitude: 80.652,
          radiusKm: 1.3,
          intensityMmH: 2.2,
          type: 'DRIZZLE',
          alertLevel: 'ADVISORY',
        },
      ];
    } else if (preset.id === 'high') {
      this.precipitationCells = [
        {
          id: 'CELL-KRISHNA-SQUALL',
          name: 'Krishna Squall Front',
          latitude: 16.516,
          longitude: 80.628,
          radiusKm: 2.0,
          intensityMmH: 7.4,
          type: 'SQUALL',
          alertLevel: 'WARNING',
        },
        {
          id: 'CELL-BENZ-RAIN',
          name: 'Benz Circle Rain Cloud',
          latitude: 16.501,
          longitude: 80.644,
          radiusKm: 1.2,
          intensityMmH: 4.8,
          type: 'RAIN',
          alertLevel: 'WARNING',
        },
      ];
    } else if (preset.id === 'severe') {
      this.precipitationCells = [
        {
          id: 'CELL-KRISHNA-STORM',
          name: 'Severe Storm Vortex',
          latitude: 16.512,
          longitude: 80.635,
          radiusKm: 2.8,
          intensityMmH: 14.5,
          type: 'THUNDERSTORM',
          alertLevel: 'CRITICAL',
        },
      ];
    }
    this.notify();
  }

  // Calculate high-fidelity localized wind speed, gusts, precipitation & alerts for a specific coordinate
  public getWeatherAtCoordinate(lat: number, lng: number): CoordinateWeather {
    const baseWind = this.currentWind;

    // Topology microclimate variance: River valley slightly accelerates wind
    const distToRiver = Math.abs(lat - 16.515);
    const riverWindBonus = Math.max(0, (0.015 - distToRiver) * 120);
    const localWindSpeed = Math.round((baseWind.speedKmh + riverWindBonus) * 10) / 10;
    const localGust = Math.round((baseWind.gustKmh + riverWindBonus * 1.2) * 10) / 10;

    // Check intersection with any precipitation radar cells
    let maxPrecip = 0;
    let precipCell: PrecipitationCell | null = null;

    for (const cell of this.precipitationCells) {
      // Distance calculation in km
      const dLat = (lat - cell.latitude) * 111;
      const dLng = (lng - cell.longitude) * 111 * Math.cos((lat * Math.PI) / 180);
      const distKm = Math.hypot(dLat, dLng);

      if (distKm <= cell.radiusKm) {
        // Falloff from center of precipitation cell
        const ratio = 1 - (distKm / cell.radiusKm);
        const cellPrecip = cell.intensityMmH * Math.max(0.3, ratio);
        if (cellPrecip > maxPrecip) {
          maxPrecip = cellPrecip;
          precipCell = cell;
        }
      }
    }

    const roundedPrecip = Math.round(maxPrecip * 10) / 10;
    const precipProb = roundedPrecip > 0 ? Math.min(100, Math.round(40 + roundedPrecip * 8)) : 10;

    let precipType: 'NONE' | 'DRIZZLE' | 'RAIN' | 'SQUALL' | 'THUNDERSTORM' = 'NONE';
    if (roundedPrecip > 9.0) precipType = 'THUNDERSTORM';
    else if (roundedPrecip > 5.0) precipType = 'SQUALL';
    else if (roundedPrecip > 2.0) precipType = 'RAIN';
    else if (roundedPrecip > 0) precipType = 'DRIZZLE';

    // Condition
    let condition: 'CLEAR' | 'BREEZY' | 'LIGHT_RAIN' | 'SQUALL' | 'THUNDERSTORM' = 'CLEAR';
    if (precipType === 'THUNDERSTORM') condition = 'THUNDERSTORM';
    else if (precipType === 'SQUALL') condition = 'SQUALL';
    else if (precipType === 'RAIN' || precipType === 'DRIZZLE') condition = 'LIGHT_RAIN';
    else if (localWindSpeed > 24) condition = 'BREEZY';

    // Flight Safety & Alert evaluation
    // Limits: Safe: Wind <= 28 km/h, Rain <= 2 mm/h
    // Advisory: Wind 28-35 km/h OR Rain 2-5 mm/h
    // Warning/Critical: Wind > 35 km/h OR Rain > 5 mm/h
    let hasAlert = false;
    let alertType: 'WIND' | 'PRECIPITATION' | 'COMBINED' | undefined = undefined;
    let alertSeverity: 'NONE' | 'ADVISORY' | 'WARNING' | 'CRITICAL' = 'NONE';
    let alertMessage: string | undefined = undefined;
    let flightSafety: 'SAFE' | 'MARGINAL' | 'RESTRICTED' = 'SAFE';

    const windWarning = localWindSpeed > 35 || localGust > 45;
    const windAdvisory = (localWindSpeed > 28 && !windWarning) || (localGust > 36 && !windWarning);
    const rainWarning = roundedPrecip > 5.0;
    const rainAdvisory = roundedPrecip > 1.8 && !rainWarning;

    if (windWarning && rainWarning) {
      hasAlert = true;
      alertType = 'COMBINED';
      alertSeverity = roundedPrecip > 9 || localWindSpeed > 45 ? 'CRITICAL' : 'WARNING';
      alertMessage = `High Wind Alert (${localWindSpeed} km/h, gusts ${localGust} km/h) & Squall (${roundedPrecip} mm/h)`;
      flightSafety = 'RESTRICTED';
    } else if (windWarning) {
      hasAlert = true;
      alertType = 'WIND';
      alertSeverity = localWindSpeed > 45 ? 'CRITICAL' : 'WARNING';
      alertMessage = `Wind Speed Alert: ${localWindSpeed} km/h (Gusts up to ${localGust} km/h)`;
      flightSafety = 'RESTRICTED';
    } else if (rainWarning) {
      hasAlert = true;
      alertType = 'PRECIPITATION';
      alertSeverity = roundedPrecip > 9 ? 'CRITICAL' : 'WARNING';
      alertMessage = `Precipitation Alert: ${precipType} active (${roundedPrecip} mm/h) in flight corridor`;
      flightSafety = 'RESTRICTED';
    } else if (windAdvisory || rainAdvisory) {
      hasAlert = true;
      alertType = windAdvisory && rainAdvisory ? 'COMBINED' : windAdvisory ? 'WIND' : 'PRECIPITATION';
      alertSeverity = 'ADVISORY';
      alertMessage = windAdvisory
        ? `Moderate Crosswind Advisory (${localWindSpeed} km/h)`
        : `Light Precipitation Advisory (${roundedPrecip} mm/h)`;
      flightSafety = 'MARGINAL';
    }

    return {
      latitude: lat,
      longitude: lng,
      windSpeedKmh: localWindSpeed,
      windDirectionDeg: baseWind.directionDeg,
      windCardinal: baseWind.directionCardinal,
      gustKmh: localGust,
      precipitationMmH: roundedPrecip,
      precipitationProbability: precipProb,
      precipitationType: precipType,
      condition,
      hasAlert,
      alertType,
      alertSeverity,
      alertMessage,
      flightSafety,
    };
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
  const deltaAngleRad = ((flightBearingDeg - windFromDeg) * Math.PI) / 180;
  const headwindKmh = Math.round(windSpeedKmh * Math.cos(deltaAngleRad));
  const crosswindKmh = Math.round(Math.abs(windSpeedKmh * Math.sin(deltaAngleRad)));

  return {
    headwindKmh, // positive: opposing headwind; negative: assisting tailwind
    crosswindKmh,
    isHeadwind: headwindKmh > 4,
    isTailwind: headwindKmh < -4,
  };
};
