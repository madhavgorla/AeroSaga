import React, { useState, useEffect } from 'react';
import type { Drone, CapturedDroneImage } from '../../types';
import daylightImage from '../../assets/drone-camera-daylight.jpg';
import thermalImage from '../../assets/drone-camera-thermal.jpg';
import { capturedImagesService } from '../../services/capturedImages';
import { getNearestPlace } from '../../services/landmarks';
import { CapturedImageModal } from './CapturedImageModal';
import { useToast } from '../ui/Toast';
import {
  Camera,
  Eye,
  Maximize2,
  Minimize2,
  Radio,
  Flame,
  Moon,
  Sun,
  ZoomIn,
  ZoomOut,
  Target,
  Download,
  Crosshair,
  Wifi,
  Compass,
  Images,
  MapPin,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface DroneCameraFeedProps {
  drones: Drone[];
  activeDroneId?: string;
  onSelectDrone?: (droneId: string) => void;
  isCompact?: boolean;
}

export const DroneCameraFeed: React.FC<DroneCameraFeedProps> = ({
  drones,
  activeDroneId,
  onSelectDrone,
  isCompact = false,
}) => {
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string>(
    activeDroneId || drones[0]?.droneId || 'DRONE-001'
  );
  const [cameraMode, setCameraMode] = useState<'daylight' | 'thermal' | 'night'>('daylight');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [recSeconds, setRecSeconds] = useState<number>(884); // 14m 44s
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Captured Images state
  const [capturedImages, setCapturedImages] = useState<CapturedDroneImage[]>([]);
  const [lastCapturedImage, setLastCapturedImage] = useState<CapturedDroneImage | null>(null);
  const [viewingImage, setViewingImage] = useState<CapturedDroneImage | null>(null);
  const [showGalleryBar, setShowGalleryBar] = useState<boolean>(true);

  // Subscribe to captured images service
  useEffect(() => {
    const unsubscribe = capturedImagesService.subscribe((imgs) => {
      setCapturedImages(imgs);
    });
    return () => unsubscribe();
  }, []);

  // Sync selectedId when activeDroneId changes
  useEffect(() => {
    if (activeDroneId) {
      setSelectedId(activeDroneId);
    }
  }, [activeDroneId]);

  // Timer loop for video feed HUD
  useEffect(() => {
    const timer = setInterval(() => {
      setRecSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDrone = drones.find((d) => d.droneId === selectedId) || drones[0];
  const activePlace = activeDrone
    ? getNearestPlace(activeDrone.currentLocation.latitude, activeDrone.currentLocation.longitude)
    : null;

  const formatRecTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle capturing an image from the drone camera
  const handleCaptureSnapshot = () => {
    setIsCapturing(true);

    const place = getNearestPlace(
      activeDrone.currentLocation.latitude,
      activeDrone.currentLocation.longitude
    );

    const newImage = capturedImagesService.addImage({
      droneId: activeDrone.droneId,
      droneModel: activeDrone.model,
      imageUrl: cameraMode === 'thermal' ? thermalImage : daylightImage,
      cameraMode,
      location: {
        latitude: activeDrone.currentLocation.latitude,
        longitude: activeDrone.currentLocation.longitude,
        placeName: place.formattedLocation,
        altitudeMeters: activeDrone.altitudeMeters || 118,
      },
      resolution:
        cameraMode === 'thermal' ? '1280 x 720 (FLIR IR)' : '3840 x 2160 (4K UHD Optical)',
      gimbalPitchDeg: -45,
      missionId: activeDrone.currentMissionId || undefined,
      notes: `Recon snapshot captured during live flight patrol near ${place.placeName}.`,
    });

    setTimeout(() => {
      setIsCapturing(false);
      setLastCapturedImage(newImage);

      showToast({
        type: 'success',
        title: `📸 Photo Captured: ${activeDrone.droneId}`,
        description: `Saved high-resolution reconnaissance snapshot at ${place.formattedLocation}.`,
      });
    }, 300);
  };

  return (
    <div
      className={`relative rounded-2xl border border-slate-800/80 bg-[#070b16] overflow-hidden flex flex-col shadow-2xl transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 max-h-[92vh]'
          : isCompact
          ? 'h-[320px]'
          : 'h-[420px] lg:h-[480px]'
      }`}
    >
      {/* Top HUD Toolbar */}
      <div className="p-3 border-b border-slate-800/60 bg-[#080d1a]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono-numbers text-rose-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>LIVE 4K GIMBAL</span>
          </div>

          {/* Drone Selector Switcher */}
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              if (onSelectDrone) onSelectDrone(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 px-2.5 py-1 font-mono-numbers focus:outline-none focus:border-sky-500"
          >
            {drones.map((d) => (
              <option key={d.droneId} value={d.droneId}>
                {d.droneId} ({d.status})
              </option>
            ))}
          </select>
        </div>

        {/* Camera Mode & Lens Controls */}
        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[11px] font-medium font-mono-numbers">
            <button
              onClick={() => setCameraMode('daylight')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                cameraMode === 'daylight'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Optical Daylight 4K"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">Optical</span>
            </button>

            <button
              onClick={() => setCameraMode('thermal')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                cameraMode === 'thermal'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="FLIR Thermal Infrared"
            >
              <Flame className="w-3 h-3" />
              <span className="hidden sm:inline">Thermal</span>
            </button>

            <button
              onClick={() => setCameraMode('night')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                cameraMode === 'night'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Night Reconnaissance NVG"
            >
              <Moon className="w-3 h-3" />
              <span className="hidden sm:inline">NVG</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-mono-numbers text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              className="p-1 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-semibold text-sky-400">
              {zoomLevel}x
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
              className="p-1 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Captured Photos Gallery Toggle Button */}
          <button
            onClick={() => setShowGalleryBar(!showGalleryBar)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-numbers transition-colors border ${
              showGalleryBar
                ? 'bg-sky-950/70 text-sky-300 border-sky-600 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle captured reconnaissance photo gallery"
          >
            <Images className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Photos ({capturedImages.length})</span>
          </button>

          {/* Capture Snapshot Action Button */}
          <button
            onClick={handleCaptureSnapshot}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
            title="Capture Instant Recon Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Feed'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Optical Viewport with Live HUD Elements */}
      <div className="relative flex-1 w-full h-full overflow-hidden select-none bg-black flex items-center justify-center">
        {/* Shutter flash animation on capture */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-300 pointer-events-none" />
        )}

        {/* Live Video Camera Image Stream with Zoom and Filter */}
        <div
          className={`w-full h-full relative transition-transform duration-300 ${
            cameraMode === 'night' ? 'brightness-125 contrast-125 hue-rotate-90 saturate-200' : ''
          }`}
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={cameraMode === 'thermal' ? thermalImage : daylightImage}
            alt="Live Drone Optical Feed"
            className="w-full h-full object-cover object-center"
          />

          {/* Night Vision green phosphor scanline overlay */}
          {cameraMode === 'night' && (
            <div className="absolute inset-0 bg-emerald-950/30 mix-blend-color-burn pointer-events-none" />
          )}
        </div>

        {/* HUD OVERLAY LAYER (Crisp Aerospace Crosshairs & Gauges) */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 text-xs font-mono-numbers z-10 text-white/90">
          {/* Top HUD Line */}
          <div className="flex items-start justify-between">
            {/* Top Left: REC & Resolution */}
            <div className="space-y-0.5 bg-black/50 backdrop-blur-sm p-2 rounded-lg border border-white/10 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-bold text-white tracking-widest">
                  REC {formatRecTime(recSeconds)}
                </span>
                <span className="text-[10px] text-slate-400">4K UHD</span>
              </div>
              <div className="text-[10px] text-slate-400">
                SENSOR: SONY IMX586 1/2" CMOS · 48MP
              </div>
            </div>

            {/* Top Right: Signal & Place Location */}
            <div className="space-y-0.5 bg-black/50 backdrop-blur-sm p-2 rounded-lg border border-white/10 text-right text-[11px]">
              <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-semibold">
                <Wifi className="w-3.5 h-3.5" />
                <span>5.8 GHz O3 LINK: 99.4%</span>
              </div>
              {activePlace && (
                <div className="text-[10px] text-sky-300 font-sans font-medium flex items-center justify-end gap-1">
                  <MapPin className="w-3 h-3 text-sky-400" />
                  <span>{activePlace.formattedLocation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Center Target Acquisition Crosshair & Artificial Horizon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Outer Gimbal Reticle */}
            <div className="relative w-48 h-48 border border-white/20 rounded-full flex items-center justify-center">
              {/* Center Crosshairs */}
              <div className="w-8 h-[1px] bg-sky-400/80 absolute" />
              <div className="h-8 w-[1px] bg-sky-400/80 absolute" />
              <div className="w-2 h-2 border border-sky-400 rounded-sm absolute" />

              {/* Pitch Ladder notches */}
              <div className="w-12 h-[1px] bg-white/40 absolute -top-10" />
              <div className="w-12 h-[1px] bg-white/40 absolute -bottom-10" />

              {/* Target Lock Box */}
              <div className="absolute -top-6 -right-12 border-2 border-emerald-400/90 w-16 h-16 rounded animate-pulse flex flex-col justify-between p-1">
                <span className="text-[9px] font-bold text-emerald-400 bg-black/60 px-1 rounded">
                  RECON TARGET
                </span>
                <span className="text-[8px] text-emerald-300 font-mono">
                  LOCK 98%
                </span>
              </div>
            </div>
          </div>

          {/* Bottom HUD Line */}
          <div className="flex items-end justify-between">
            {/* Bottom Left: GPS Coordinates & Speed */}
            <div className="bg-black/50 backdrop-blur-sm p-2.5 rounded-lg border border-white/10 space-y-1 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="text-sky-300 font-bold">
                  ALT: {activeDrone?.altitudeMeters || 82}m AGL
                </span>
                <span className="text-white">
                  SPD: {activeDrone?.speedKmh || 42} km/h
                </span>
                <span className="text-amber-300">
                  BAT: {activeDrone?.batteryPercent || 78}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                GPS: {activeDrone?.currentLocation.latitude.toFixed(5)}°N,{' '}
                {activeDrone?.currentLocation.longitude.toFixed(5)}°E
              </div>
            </div>

            {/* Bottom Right: Gimbal Angle & Heading */}
            <div className="bg-black/50 backdrop-blur-sm p-2.5 rounded-lg border border-white/10 text-right space-y-1 text-[11px]">
              <div className="flex items-center justify-end gap-2 text-slate-200">
                <span>GIMBAL: -45° PITCH</span>
                <span className="text-sky-400 font-bold">044° HDG (NE)</span>
              </div>
              <div className="text-[10px] text-slate-400">
                PAYLOAD: SECURED · ALT HOLD ACTIVE
              </div>
            </div>
          </div>
        </div>

        {/* INSTANT CAPTURE PREVIEW POPUP CARD (Displays when image is captured!) */}
        {lastCapturedImage && (
          <div className="absolute bottom-4 right-4 z-30 max-w-sm p-3 rounded-xl bg-slate-950/95 border border-emerald-500/90 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-300 select-none">
            <div className="flex items-center gap-3">
              <img
                src={lastCapturedImage.imageUrl}
                alt="Captured thumbnail preview"
                className="w-14 h-14 rounded-lg object-cover border border-emerald-400/60 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setViewingImage(lastCapturedImage)}
              />

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-wider">
                    RECON IMAGE CAPTURED
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate font-sans mt-0.5">
                  {lastCapturedImage.location.placeName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setViewingImage(lastCapturedImage)}
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 font-sans flex items-center gap-1"
                  >
                    <span>Inspect Image</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setLastCapturedImage(null)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Dismiss capture preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HORIZONTAL CAPTURED RECON GALLERY FILMSTRIP TRAY (Shows all captured images) */}
      {showGalleryBar && (
        <div className="p-2.5 bg-[#050811] border-t border-slate-800/80 flex items-center gap-3 overflow-x-auto z-20 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono-numbers text-slate-400 pl-1 shrink-0">
            <Images className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-300">CAPTURED IMAGES:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {capturedImages.map((img) => (
              <div
                key={img.id}
                onClick={() => setViewingImage(img)}
                className="group relative w-20 h-14 rounded-lg overflow-hidden border border-slate-700/80 hover:border-sky-400 shrink-0 cursor-pointer transition-all hover:scale-105 shadow-sm"
                title={`${img.droneId} at ${img.location.placeName}`}
              >
                <img
                  src={img.imageUrl}
                  alt={img.id}
                  className="w-full h-full object-cover group-hover:brightness-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                  <span className="text-[8px] font-mono-numbers text-white font-bold truncate">
                    {img.droneId}
                  </span>
                  <span className="text-[7px] font-mono-numbers text-sky-300 truncate">
                    {new Date(img.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Footer Banner */}
      <div className="px-4 py-2 bg-[#060a14] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono-numbers shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300 font-sans">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>Target Recon: <strong>{activePlace?.placeName || 'Sector Dropzone'}</strong></span>
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline text-slate-400">
            Telemetry 5.8 GHz Link Active
          </span>
        </div>

        <div className="text-[11px] text-slate-400">
          TOTAL SNAPSHOTS: <strong className="text-white font-bold">{capturedImages.length}</strong>
        </div>
      </div>

      {/* High-Resolution Full-Screen Image Inspector Modal */}
      <CapturedImageModal
        image={viewingImage}
        allImages={capturedImages}
        onClose={() => setViewingImage(null)}
        onSelectImage={(img) => setViewingImage(img)}
      />
    </div>
  );
};
