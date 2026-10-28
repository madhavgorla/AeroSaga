// Landmark & Reverse Geocoding Service for AeroSaga Mission Control Airspace

export interface Landmark {
  id: string;
  name: string;
  category: 'HUB' | 'HOSPITAL' | 'DEPOT' | 'CORRIDOR' | 'LANDMARK' | 'WAYPOINT';
  latitude: number;
  longitude: number;
  description: string;
  zone: string;
}

export interface NearestPlaceResult {
  placeName: string;
  formattedLocation: string; // e.g. "Near Sector 4 Coastal Depot (210m NW)"
  distanceMeters: number;
  direction: string;
  category: string;
  zone: string;
  landmark: Landmark;
}

export const AIRSPACE_LANDMARKS: Landmark[] = [
  {
    id: 'hub-alpha',
    name: 'Dispatch Hub Alpha',
    category: 'HUB',
    latitude: 16.5062,
    longitude: 80.6480,
    description: 'Central automated drone launchpad, charging dock & ground control station.',
    zone: 'Zone Alpha-1 Primary Base',
  },
  {
    id: 'warehouse-b',
    name: 'Warehouse B Logistics Terminal',
    category: 'DEPOT',
    latitude: 16.5200,
    longitude: 80.6300,
    description: 'Heavy cargo fulfillment center and distribution sorting facility.',
    zone: 'Zone Bravo-2 Logistics Park',
  },
  {
    id: 'sector-4-depot',
    name: 'Sector 4 Coastal Depot',
    category: 'DEPOT',
    latitude: 16.5280,
    longitude: 80.6210,
    description: 'Coastal maritime supply depot and emergency medical staging hangar.',
    zone: 'Zone Delta-4 Coastal Corridor',
  },
  {
    id: 'metro-clinic',
    name: 'Metro Emergency Clinic',
    category: 'HOSPITAL',
    latitude: 16.5190,
    longitude: 80.6550,
    description: 'Specialized trauma care hospital rooftop dropzone & helipad.',
    zone: 'Zone Charlie-1 Medical Grid',
  },
  {
    id: 'north-airfield',
    name: 'North Airfield Staging Depot',
    category: 'DEPOT',
    latitude: 16.5340,
    longitude: 80.6410,
    description: 'Long-range scout transit hub and secondary runway apron.',
    zone: 'Zone Echo-3 North Air Corridor',
  },
  {
    id: 'krishna-river-bridge',
    name: 'Krishna River Waterway Corridor',
    category: 'CORRIDOR',
    latitude: 16.5120,
    longitude: 80.6380,
    description: 'Designated low-altitude water transit vector and obstacle-free lane.',
    zone: 'River Corridor Vector-R',
  },
  {
    id: 'trauma-helipad',
    name: 'Trauma Center Helipad',
    category: 'HOSPITAL',
    latitude: 16.5180,
    longitude: 80.6510,
    description: 'Direct medical aerial transfer point for blood and emergency supplies.',
    zone: 'Emergency Transit Sector C',
  },
  {
    id: 'benz-circle',
    name: 'Benz Circle Commercial Airway',
    category: 'LANDMARK',
    latitude: 16.5010,
    longitude: 80.6450,
    description: 'High-density urban commercial corridor with geofenced building buffers.',
    zone: 'Urban Metro Buffer Z-9',
  },
  {
    id: 'canal-navigation-point',
    name: 'Port Canal Navigation Point',
    category: 'CORRIDOR',
    latitude: 16.5150,
    longitude: 80.6280,
    description: 'Industrial canal waypoint for automated waypoint synchronization.',
    zone: 'Canal Transport Path B',
  },
  {
    id: 'highway-junction',
    name: 'Gannavaram Highway Flyover Junction',
    category: 'LANDMARK',
    latitude: 16.5250,
    longitude: 80.6390,
    description: 'Elevated highway intersection with high visual reconnaissance visibility.',
    zone: 'National Highway Corridor NH-16',
  },
];

// Calculate distance in meters using Haversine formula
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Calculate cardinal direction from source to destination
export const calculateDirection = (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): string => {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  const normalized = (angle + 360) % 360;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const index = Math.round(normalized / 45);
  return directions[index];
};

// Reverse geocode drone coordinates to the nearest landmark/place location
export const getNearestPlace = (latitude: number, longitude: number): NearestPlaceResult => {
  let closestLandmark = AIRSPACE_LANDMARKS[0];
  let minDistance = calculateDistanceMeters(
    latitude,
    longitude,
    closestLandmark.latitude,
    closestLandmark.longitude
  );

  for (let i = 1; i < AIRSPACE_LANDMARKS.length; i++) {
    const lm = AIRSPACE_LANDMARKS[i];
    const dist = calculateDistanceMeters(latitude, longitude, lm.latitude, lm.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestLandmark = lm;
    }
  }

  const direction = calculateDirection(
    closestLandmark.latitude,
    closestLandmark.longitude,
    latitude,
    longitude
  );

  let formattedLocation = '';
  if (minDistance <= 70) {
    formattedLocation = `At ${closestLandmark.name}`;
  } else if (minDistance < 1000) {
    formattedLocation = `Near ${closestLandmark.name} (${minDistance}m ${direction})`;
  } else {
    const km = (minDistance / 1000).toFixed(1);
    formattedLocation = `Near ${closestLandmark.name} (${km} km ${direction})`;
  }

  return {
    placeName: closestLandmark.name,
    formattedLocation,
    distanceMeters: minDistance,
    direction,
    category: closestLandmark.category,
    zone: closestLandmark.zone,
    landmark: closestLandmark,
  };
};
