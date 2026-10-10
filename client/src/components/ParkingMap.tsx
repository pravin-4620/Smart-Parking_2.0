import React, { useState } from 'react';
import { NearbyParkingResponse } from '@smart-parking/shared';
import { Navigation, Car, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ParkingMapProps {
  userLat: number;
  userLng: number;
  locations: NearbyParkingResponse[];
  selectedId?: string;
  onSelectLocation?: (id: string) => void;
}

export const ParkingMap: React.FC<ParkingMapProps> = ({
  userLat,
  userLng,
  locations,
  selectedId,
  onSelectLocation,
}) => {
  const [activePin, setActivePin] = useState<NearbyParkingResponse | null>(null);

  // Map viewport scaling relative to user coordinates
  const bounds = locations.reduce(
    (acc, loc) => ({
      minLat: Math.min(acc.minLat, loc.coordinates[1]),
      maxLat: Math.max(acc.maxLat, loc.coordinates[1]),
      minLng: Math.min(acc.minLng, loc.coordinates[0]),
      maxLng: Math.max(acc.maxLng, loc.coordinates[0]),
    }),
    {
      minLat: userLat - 0.05,
      maxLat: userLat + 0.05,
      minLng: userLng - 0.05,
      maxLng: userLng + 0.05,
    }
  );

  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.02);
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.02);

  // Convert lat/lng to percentage X/Y
  const getCoordsPercentage = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / lngRange) * 80 + 10; // 10% to 90% padding
    const y = 90 - ((lat - bounds.minLat) / latRange) * 80; // invert Y
    return { x, y };
  };

  const userPos = getCoordsPercentage(userLat, userLng);

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between">
      {/* Grid background simulation */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      ></div>

      {/* Map Header Overlay */}
      <div className="relative z-10 p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
          <Navigation className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>
            Center: [{userLat.toFixed(4)}, {userLng.toFixed(4)}]
          </span>
        </div>
        <span className="text-[11px] bg-slate-800 text-sky-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
          {locations.length} Locations Found
        </span>
      </div>

      {/* Interactive Canvas Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Distance Rings around user */}
        <div
          className="absolute border border-sky-500/20 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${userPos.x}%`,
            top: `${userPos.y}%`,
            width: '180px',
            height: '180px',
          }}
        ></div>
        <div
          className="absolute border border-sky-500/10 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${userPos.x}%`,
            top: `${userPos.y}%`,
            width: '320px',
            height: '320px',
          }}
        ></div>

        {/* User Location Marker */}
        <div
          className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
          style={{ left: `${userPos.x}%`, top: `${userPos.y}%` }}
        >
          <div className="w-5 h-5 bg-sky-500 rounded-full border-2 border-white shadow-lg shadow-sky-500/50 flex items-center justify-center animate-ping absolute opacity-75"></div>
          <div className="w-5 h-5 bg-sky-600 rounded-full border-2 border-white shadow-md flex items-center justify-center relative">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap font-mono">
            You are here
          </div>
        </div>

        {/* Parking Pins */}
        {locations.map((loc) => {
          const pos = getCoordsPercentage(loc.coordinates[1], loc.coordinates[0]);
          const isSelected = selectedId === loc.parkingId || activePin?.parkingId === loc.parkingId;
          const isAvailable = loc.availableSlots > 0;
          const isUnavailable = loc.telemetryStatus === 'UNAVAILABLE';

          return (
            <div
              key={loc.parkingId}
              onClick={() => {
                setActivePin(loc);
                if (onSelectLocation) onSelectLocation(loc.parkingId);
              }}
              className="absolute z-30 transform -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-200 hover:scale-125"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div
                className={`p-1.5 rounded-full border-2 shadow-lg flex items-center justify-center ${
                  isSelected
                    ? 'bg-amber-500 border-white text-slate-900 ring-4 ring-amber-500/30'
                    : isAvailable
                    ? 'bg-emerald-600 border-white text-white'
                    : isUnavailable
                    ? 'bg-slate-500 border-white text-white'
                    : 'bg-red-600 border-white text-white'
                }`}
              >
                <Car className="w-4 h-4" />
              </div>
              <div className="mt-0.5 text-center">
                <span className="bg-slate-900/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700 shadow whitespace-nowrap">
                  {isUnavailable ? 'Unknown' : `${loc.availableSlots}/${loc.totalSlots}`}
                </span>
              </div>
            </div>
          );
        })}

        {/* Popup Card for Active Selection */}
        {activePin && (
          <div className="absolute bottom-4 left-4 right-4 z-40 bg-slate-900/95 border border-slate-700 text-white p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-sm text-sky-400">{activePin.name}</h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    activePin.operatingStatus === 'OPEN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {activePin.operatingStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{activePin.address}</p>
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-300 mt-2">
                <span>📍 {activePin.distance} km away</span>
                <span className={activePin.telemetryStatus === 'UNAVAILABLE' ? 'text-slate-300 font-bold' : 'text-emerald-400 font-bold'}>
                  {activePin.telemetryStatus === 'UNAVAILABLE' ? 'Live occupancy unavailable' : `${activePin.availableSlots} / ${activePin.totalSlots} Slots Free`}
                </span>
                <span>₹{activePin.startingPrice}/hr</span>
              </div>
            </div>

            <Link
              to={`/parking/${activePin.parkingId}`}
              className="bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1 transition-colors"
            >
              <span>View Lot</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Map Footer Legend */}
      <div className="relative z-10 px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
            <span>Telemetry unavailable</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>Your Location</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Available Slots</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Full / Closed</span>
          </div>
        </div>
        <span className="font-mono text-slate-500">GeoJSON 2dsphere Indexed</span>
      </div>
    </div>
  );
};
