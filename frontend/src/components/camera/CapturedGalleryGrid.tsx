import React, { useState } from 'react';
import type { CapturedDroneImage } from '../../types';
import {
  Camera,
  MapPin,
  Calendar,
  Download,
  Eye,
  Filter,
  Flame,
  Sun,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { CapturedImageModal } from './CapturedImageModal';

interface CapturedGalleryGridProps {
  images: CapturedDroneImage[];
  onDeleteImage?: (id: string) => void;
}

export const CapturedGalleryGrid: React.FC<CapturedGalleryGridProps> = ({
  images,
  onDeleteImage,
}) => {
  const [selectedDroneFilter, setSelectedDroneFilter] = useState<string>('all');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');
  const [inspectingImage, setInspectingImage] = useState<CapturedDroneImage | null>(null);

  // Available drones in captured images
  const uniqueDrones = Array.from(new Set(images.map((img) => img.droneId)));

  const filteredImages = images.filter((img) => {
    if (selectedDroneFilter !== 'all' && img.droneId !== selectedDroneFilter) return false;
    if (selectedModeFilter !== 'all' && img.cameraMode !== selectedModeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Gallery Header & Filter Controls */}
      <div className="p-4 rounded-2xl bg-[#080d1a]/90 border border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
            <Camera className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono-numbers">
              Fleet Captured Reconnaissance Imagery
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Archived aerial sensor snapshots and target area verifications ({filteredImages.length} photos)
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-numbers">
          {/* Drone Filter */}
          <select
            value={selectedDroneFilter}
            onChange={(e) => setSelectedDroneFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Drones ({images.length})</option>
            {uniqueDrones.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>

          {/* Camera Sensor Mode Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setSelectedModeFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedModeFilter === 'all'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Modes
            </button>
            <button
              onClick={() => setSelectedModeFilter('daylight')}
              className={`px-2 py-1 rounded transition-colors ${
                selectedModeFilter === 'daylight'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daylight 4K
            </button>
            <button
              onClick={() => setSelectedModeFilter('thermal')}
              className={`px-2 py-1 rounded transition-colors ${
                selectedModeFilter === 'thermal'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FLIR Thermal
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Captured Images */}
      {filteredImages.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 text-slate-400 space-y-2">
          <Camera className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No captured images found</p>
          <p className="text-xs text-slate-500">
            Switch to the live camera feed and click "Capture" to record photos during drone flight.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              onClick={() => setInspectingImage(img)}
              className="group relative rounded-2xl bg-[#070b16] border border-slate-800/80 hover:border-sky-500/70 overflow-hidden shadow-xl transition-all duration-200 cursor-pointer flex flex-col hover:-translate-y-0.5"
            >
              {/* Image Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <img
                  src={img.imageUrl}
                  alt={img.id}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Sensor Mode Badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-numbers uppercase font-semibold border backdrop-blur-md shadow-md ${
                      img.cameraMode === 'thermal'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                        : 'bg-sky-950/80 text-sky-300 border-sky-600/60'
                    }`}
                  >
                    {img.cameraMode === 'thermal' ? 'FLIR IR' : '4K Daylight'}
                  </span>
                </div>

                {/* Drone ID Badge */}
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers font-bold bg-black/80 text-white border border-slate-700/80 backdrop-blur-md">
                    {img.droneId}
                  </span>
                </div>

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="px-3 py-1.5 rounded-lg bg-sky-600/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Inspect Image</span>
                  </div>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-start gap-1.5 text-xs text-sky-200 font-bold font-sans">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{img.location.placeName}</span>
                  </div>

                  <div className="mt-1 text-[11px] font-mono-numbers text-slate-400 flex items-center justify-between">
                    <span>ALT: {img.location.altitudeMeters}m AGL</span>
                    <span>PITCH: {img.gimbalPitchDeg}°</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono-numbers text-slate-400">
                  <span>{new Date(img.timestamp).toLocaleString()}</span>
                  <span className="text-sky-400 font-semibold group-hover:underline">
                    View 4K →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Image Inspector Modal */}
      <CapturedImageModal
        image={inspectingImage}
        allImages={filteredImages}
        onClose={() => setInspectingImage(null)}
        onSelectImage={(img) => setInspectingImage(img)}
      />
    </div>
  );
};
