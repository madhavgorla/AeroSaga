import type { CapturedDroneImage } from '../types';
import daylightImage from '../assets/drone-camera-daylight.jpg';
import thermalImage from '../assets/drone-camera-thermal.jpg';

const STORAGE_KEY = 'aerosaga_captured_drone_images_v1';

// Seed initial captured reconnaissance photos
const INITIAL_CAPTURED_IMAGES: CapturedDroneImage[] = [
  {
    id: 'IMG-REC-101',
    droneId: 'DRONE-001',
    droneModel: 'AeroSky Courier X4',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    imageUrl: daylightImage,
    cameraMode: 'daylight',
    location: {
      latitude: 16.5124,
      longitude: 80.6421,
      placeName: 'Near Sector 4 Coastal Depot (210m NW)',
      altitudeMeters: 118,
    },
    resolution: '3840 x 2160 (4K UHD)',
    gimbalPitchDeg: -45,
    missionId: 'MSN-7841',
    notes: 'Perimeter corridor inspection clear. No aerial obstacles detected.',
  },
  {
    id: 'IMG-REC-102',
    droneId: 'DRONE-001',
    droneModel: 'AeroSky Courier X4',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    imageUrl: thermalImage,
    cameraMode: 'thermal',
    location: {
      latitude: 16.5135,
      longitude: 80.6432,
      placeName: 'Sector 4 Coastal Depot Hangar Apron',
      altitudeMeters: 112,
    },
    resolution: '1280 x 720 (FLIR IR)',
    gimbalPitchDeg: -60,
    missionId: 'MSN-7841',
    notes: 'Thermal signature analysis nominal. Ground facility cooling vents active.',
  },
  {
    id: 'IMG-REC-103',
    droneId: 'DRONE-002',
    droneModel: 'AeroSky HeavyLift V2',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    imageUrl: daylightImage,
    cameraMode: 'daylight',
    location: {
      latitude: 16.5192,
      longitude: 80.6548,
      placeName: 'Metro Emergency Clinic Rooftop Dropzone',
      altitudeMeters: 94,
    },
    resolution: '3840 x 2160 (4K UHD)',
    gimbalPitchDeg: -90,
    missionId: 'MSN-7842',
    notes: 'Rooftop delivery target zone clear. Wind conditions nominal.',
  },
  {
    id: 'IMG-REC-104',
    droneId: 'DRONE-003',
    droneModel: 'AeroSky Courier X4',
    timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    imageUrl: thermalImage,
    cameraMode: 'thermal',
    location: {
      latitude: 16.5118,
      longitude: 80.6382,
      placeName: 'Krishna River Waterway Corridor Sector B',
      altitudeMeters: 85,
    },
    resolution: '1280 x 720 (FLIR IR)',
    gimbalPitchDeg: -30,
    notes: 'Routine water corridor infrared sweep completed.',
  },
];

class CapturedImagesService {
  private images: CapturedDroneImage[] = [];
  private listeners: Array<(images: CapturedDroneImage[]) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.images = parsed;
          return;
        }
      }
    } catch {
      // Fallback
    }
    this.images = [...INITIAL_CAPTURED_IMAGES];
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.images));
    } catch {
      // Ignore
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((cb) => cb([...this.images]));
  }

  public getImages(): CapturedDroneImage[] {
    return [...this.images];
  }

  public getImagesByDrone(droneId: string): CapturedDroneImage[] {
    return this.images.filter((img) => img.droneId.toLowerCase() === droneId.toLowerCase());
  }

  public addImage(
    img: Omit<CapturedDroneImage, 'id' | 'timestamp'>
  ): CapturedDroneImage {
    const newImage: CapturedDroneImage = {
      ...img,
      id: `IMG-REC-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
    };
    this.images = [newImage, ...this.images];
    this.saveToStorage();
    return newImage;
  }

  public subscribe(callback: (images: CapturedDroneImage[]) => void): () => void {
    this.listeners.push(callback);
    callback([...this.images]);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public deleteImage(id: string) {
    this.images = this.images.filter((img) => img.id !== id);
    this.saveToStorage();
  }
}

export const capturedImagesService = new CapturedImagesService();
