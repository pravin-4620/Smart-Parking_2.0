import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { MapPin, Navigation, Compass, ShieldCheck, Loader2, Search, SlidersHorizontal } from 'lucide-react';

export const NearbyParkingPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [geoStatus, setCoordsStatus] = useState<'requesting' | 'granted' | 'fallback'>('requesting');

  useEffect(() => {
    requestUserLocation();
  }, [radiusKm]);

  const requestUserLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setCoords({ lat: userLat, lng: userLng });
          setCoordsStatus('granted');
          fetchNearby(userLat, userLng);
        },
        (err) => {
          console.warn('Geolocation fallback activated:', err.message);
          setCoordsStatus('fallback');
          fetchNearby(12.9716, 77.5946);
        }
      );
    } else {
      setCoordsStatus('fallback');
      fetchNearby(12.9716, 77.5946);
    }
  };

  const fetchNearby = async (lat: number, lng: number) => {
    try {
      const res = await apiClient.get(
        `/parking/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm * 1000}`
      );
      setLocations(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch nearby parking:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-7 h-7 text-indigo-600" /> Nearby Parking Locations
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            {geoStatus === 'granted' ? 'Using precise GPS device location' : 'Using Bengaluru default center point'}
          </p>
        </div>

        <button
          onClick={requestUserLocation}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition"
        >
          <Navigation className="w-4 h-4 text-indigo-600" /> Recalibrate Location
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by facility name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 shrink-0">Radius: {radiusKm} km</span>
          <input
            type="range"
            min="1"
            max="30"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Parking Locations Found</h3>
          <p className="text-xs text-slate-400 mt-1">Try expanding the search radius slider or clearing search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((loc) => (
            <div
              key={loc.parkingId}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h2 className="font-bold text-slate-900 text-lg">{loc.name}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      loc.operatingStatus === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {loc.operatingStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  {loc.address} ({(loc.distance / 1000).toFixed(2)} km away)
                </p>

                <div className="grid grid-cols-2 gap-2 my-4 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase block">Occupancy</span>
                    <span className="text-sm font-extrabold text-indigo-600">
                      {loc.availableSlots} / {loc.totalSlots} Available
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase block">Starting Rate</span>
                    <span className="text-sm font-extrabold text-slate-800">₹{loc.startingPrice}/hr</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Real-Time Sensors
                </span>
                <button
                  onClick={() => navigate(`/parking/${loc.parkingId}`)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  Reserve Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
