import React, { useState } from 'react';
import type { CapturedDroneImage } from '../../types';
import {
  X,
  MapPin,
  Camera,
  Download,
  Calendar,
  Compass,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Share2,
  Trash2,
  Check,
  Eye,
  Crosshair,
  Flame,
  Sun,
  ShieldCheck,
} from 'lucide-react';

interface CapturedImageModalProps {
  image: CapturedDroneImage | null;
  allImages?: CapturedDroneImage[];
  onClose: () => void;
  onSelectImage?: (img: CapturedDroneImage) => void;
  onDeleteImage?: (id: string) => void;
}

export const CapturedImageModal: React.FC<CapturedImageModalProps> = ({
  image,
  allImages = [],
  onClose,
  onSelectImage,
  onDeleteImage,
}) => {
  const [copiedGps, setCopiedGps] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'normal' | 'infrared' | 'high_contrast'>('normal');

  if (!image) return null;

  const currentIndex = allImages.findIndex((img) => img.id === image.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allImages.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectImage) {
      onSelectImage(allImages[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectImage) {
      onSelectImage(allImages[currentIndex + 1]);
    }
  };

  const handleCopyGps = () => {
    navigator.clipboard.writeText(
      `${image.location.latitude.toFixed(6)}, ${image.location.longitude.toFixed(6)}`
    );
    setCopiedGps(true);
    setTimeout(() => setCopiedGps(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `AeroSaga-Captured-${image.droneId}-${image.id}.jpg`;
    link.href = image.imageUrl;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#070b16] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 border-b border-slate-800/80 bg-[#080d1a]/95 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Camera className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono-numbers">
                  {image.id}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers uppercase font-semibold bg-sky-950/70 text-sky-300 border border-sky-800/50">
                  {image.droneId} ({image.cameraMode})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Captured by {image.droneModel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasPrev && (
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Previous photo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {hasNext && (
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Next photo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Download high-resolution image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close image inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Image View Area */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[300px] lg:min-h-[420px]">
          {/* Captured Image display with visual filter modes */}
          <img
            src={image.imageUrl}
            alt={`Captured by ${image.droneId}`}
            className={`max-w-full max-h-[58vh] object-contain transition-all duration-300 ${
              activeFilter === 'infrared'
                ? 'hue-rotate-180 invert brightness-110 contrast-125'
                : activeFilter === 'high_contrast'
                ? 'contrast-150 saturate-150'
                : ''
            }`}
          />

          {/* Optical Recon Crosshairs & Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-24 h-24 border border-sky-400/30 rounded-full flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-sky-400/40" />
            </div>
            {/* Corner Framing Brackets */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-sky-400/40" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-sky-400/40" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-sky-400/40" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-sky-400/40" />
          </div>

          {/* Telemetry Stamp Overlay in bottom left */}
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-[10px] font-mono-numbers text-slate-300 space-y-0.5">
            <div className="text-sky-300 font-semibold">{image.location.placeName}</div>
            <div>
              {image.location.latitude.toFixed(6)}°N, {image.location.longitude.toFixed(6)}°E · ALT {image.location.altitudeMeters}m AGL
            </div>
            <div className="text-slate-400">
              GIMBAL {image.gimbalPitchDeg}° · {new Date(image.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Sensor Filter Toggles in top right */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/75 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 text-[10px] font-mono-numbers">
            <button
              onClick={() => setActiveFilter('normal')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'normal'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw
            </button>
            <button
              onClick={() => setActiveFilter('high_contrast')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'high_contrast'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Enhance
            </button>
            <button
              onClick={() => setActiveFilter('infrared')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'infrared'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FLIR Pseudo
            </button>
          </div>
        </div>

        {/* Modal Info Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080d1a] space-y-3 shrink-0">
          {/* Prominent Location Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono-numbers">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-white font-sans font-bold text-sm">
                {image.location.placeName}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-300 text-[11px]">
              <span>
                {image.location.latitude.toFixed(6)}°N, {image.location.longitude.toFixed(6)}°E
              </span>
              <button
                onClick={handleCopyGps}
                className="text-sky-400 hover:text-sky-300 font-sans text-[11px] underline"
              >
                {copiedGps ? 'Copied!' : 'Copy GPS'}
              </button>
            </div>
          </div>

          {/* Quick Aerospace Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-numbers text-slate-300">
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">ALTITUDE AGL</span>
              <span className="text-white font-semibold">{image.location.altitudeMeters} meters</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">GIMBAL PITCH</span>
              <span className="text-white font-semibold">{image.gimbalPitchDeg}° Nadir</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">SENSOR RESOLUTION</span>
              <span className="text-white font-semibold">{image.resolution}</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block">TIMESTAMP</span>
              <span className="text-white font-semibold">{new Date(image.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          {image.notes && (
            <p className="text-[11px] text-slate-400 font-sans italic border-l-2 border-sky-500/40 pl-2">
              Reconnaissance note: {image.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
