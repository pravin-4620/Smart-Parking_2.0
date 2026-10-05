import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NearbyParkingResponse } from '@smart-parking/shared';
import { parkingService } from '../services/parkingService.js';
import { buildGoogleMapsDirectionsUrl } from '../utils/maps.js';
import { GoogleMapsLibraries, loadGoogleMapsLibraries } from '../utils/googleMapsLoader.js';
import { MapPin, Navigation, Compass, ShieldCheck, Loader2, Search, SlidersHorizontal, AlertCircle } from 'lucide-react';

type Coordinates = { lat: number; lng: number };
type DiscoveryLocation = NearbyParkingResponse & { distanceAvailable: boolean };
type FacilityMarker = {
  marker: google.maps.marker.AdvancedMarkerElement;
  listener: EventListener;
};

export const NearbyParkingPage: React.FC = () => {
  const navigate = useNavigate();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef(new Map<string, FacilityMarker>());
  const userMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<DiscoveryLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState('Requesting your current location…');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapsLibraries, setMapsLibraries] = useState<GoogleMapsLibraries | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const selected = locations.find((location) => location.parkingId === selectedId) ?? null;
  const filteredLocations = useMemo(() => locations.filter((location) =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.toLowerCase().includes(searchQuery.toLowerCase())
  ), [locations, searchQuery]);

  const loadAllFacilities = useCallback(async () => {
    const rows = await parkingService.getAllParkingLocations();
    const details = await Promise.all(rows.map((row) => {
      const raw = row as unknown as { _id: string };
      return parkingService.getParkingDetails(row.parkingId ?? raw._id);
    }));
    return details.map((detail) => {
      const raw = detail as unknown as {
        _id: string;
        geoLocation: { coordinates: [number, number] };
        slotStats: { total: number; available: number; occupied: number };
        pricingProfile?: { baseHourlyRate: number };
      };
      return {
        ...detail,
        parkingId: detail.parkingId ?? raw._id,
        coordinates: detail.coordinates ?? raw.geoLocation.coordinates,
        totalSlots: detail.totalSlots ?? raw.slotStats.total,
        availableSlots: detail.availableSlots ?? raw.slotStats.available,
        occupancy: detail.occupancy ?? (raw.slotStats.total ? Math.round((raw.slotStats.occupied / raw.slotStats.total) * 100) : 0),
        startingPrice: detail.startingPrice ?? raw.pricingProfile?.baseHourlyRate ?? 0,
        distance: 0,
        distanceAvailable: false,
      };
    });
  }, []);

  const requestUserLocation = useCallback(() => {
    setLoading(true);
    setApiError(null);
    if (!navigator.geolocation) {
      setCoords(null);
      setGeoMessage('Geolocation is unavailable in this browser. Showing all parking facilities.');
      loadAllFacilities().then(setLocations).catch(() => setApiError('Parking facilities could not be loaded.')).finally(() => setLoading(false));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(current);
        setGeoMessage('Using your current browser location');
        parkingService.getNearbyParking({ ...current, radius: radiusKm })
          .then((rows) => setLocations(rows.map((row) => ({ ...row, distanceAvailable: true }))))
          .catch(() => setApiError('Nearby parking could not be loaded. Please try again.'))
          .finally(() => setLoading(false));
      },
      () => {
        setCoords(null);
        setGeoMessage('Location permission was denied. Showing all parking facilities without distance filtering.');
        loadAllFacilities().then(setLocations).catch(() => setApiError('Parking facilities could not be loaded.')).finally(() => setLoading(false));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [loadAllFacilities, radiusKm]);

  useEffect(requestUserLocation, [requestUserLocation]);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setMapError('Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to the client environment.');
      return;
    }
    let active = true;
    loadGoogleMapsLibraries(key)
      .then((libraries) => { if (active) setMapsLibraries(libraries); })
      .catch((error: unknown) => {
        console.error('Google Maps initialization failed', error);
        if (active) setMapError('Google Maps failed to load. The parking list remains available.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mapsLibraries || !mapElement.current || mapInstance.current) return;
    const { Map } = mapsLibraries.maps;
    mapInstance.current = new Map(mapElement.current, {
      center: { lat: 12.9716, lng: 77.5946 },
      zoom: 13,
      mapTypeControl: false,
      mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
    });

    return () => {
      markers.current.forEach(({ marker, listener }) => {
        marker.removeEventListener('gmp-click', listener);
        marker.map = null;
      });
      markers.current.clear();
      if (userMarker.current) {
        google.maps.event.clearInstanceListeners(userMarker.current);
        userMarker.current.map = null;
        userMarker.current = null;
      }
      if (mapInstance.current) google.maps.event.clearInstanceListeners(mapInstance.current);
      mapInstance.current = null;
    };
  }, [mapsLibraries]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!mapsLibraries || !map) return;
    const { AdvancedMarkerElement } = mapsLibraries.marker;
    const valid = locations.filter((location) => Number.isFinite(location.coordinates?.[0]) && Number.isFinite(location.coordinates?.[1]));
    const center = coords ?? (valid[0]
      ? { lat: valid[0].coordinates[1], lng: valid[0].coordinates[0] }
      : { lat: 12.9716, lng: 77.5946 });
    map.setCenter(center);
    map.setZoom(13);
    markers.current.forEach(({ marker, listener }) => {
      marker.removeEventListener('gmp-click', listener);
      marker.map = null;
    });
    markers.current.clear();
    if (userMarker.current) {
      userMarker.current.map = null;
      userMarker.current = null;
    }
    if (coords) {
      const dot = document.createElement('div');
      dot.setAttribute('aria-label', 'Your current location');
      dot.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)';
      userMarker.current = new AdvancedMarkerElement({ map, position: coords, title: 'Your current location', content: dot });
    }
    valid.forEach((location) => {
      const marker = new AdvancedMarkerElement({ map, position: { lat: location.coordinates[1], lng: location.coordinates[0] }, title: location.name, gmpClickable: true });
      const listener: EventListener = () => setSelectedId(location.parkingId);
      marker.addEventListener('gmp-click', listener);
      markers.current.set(location.parkingId, { marker, listener });
    });
  }, [locations, coords, mapsLibraries]);

  const testInBengaluru = () => {
    const bengaluru = { lat: 12.9716, lng: 77.5946 };
    setLoading(true);
    setApiError(null);
    setCoords(bengaluru);
    setGeoMessage('Using Bengaluru test coordinates');
    parkingService.getNearbyParking({ ...bengaluru, radius: radiusKm })
      .then((rows) => setLocations(rows.map((row) => ({ ...row, distanceAvailable: true }))))
      .catch(() => setApiError('Nearby parking could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  };

  const showAllFacilities = () => {
    setLoading(true);
    setApiError(null);
    setCoords(null);
    setGeoMessage('Showing all parking facilities');
    loadAllFacilities().then(setLocations).catch(() => setApiError('Parking facilities could not be loaded.')).finally(() => setLoading(false));
  };

  const selectLocation = (location: DiscoveryLocation) => {
    setSelectedId(location.parkingId);
    mapInstance.current?.panTo({ lat: location.coordinates[1], lng: location.coordinates[0] });
    mapInstance.current?.setZoom(16);
  };

  const openDirections = (location: DiscoveryLocation) => {
    window.open(buildGoogleMapsDirectionsUrl(
      { lat: location.coordinates[1], lng: location.coordinates[0] },
      coords
    ), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Compass className="w-7 h-7 text-indigo-600" /> Nearby Parking</h1><p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-emerald-600" />{geoMessage}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={requestUserLocation} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2"><Navigation className="w-4 h-4 text-indigo-600" /> Use My Location</button><button onClick={testInBengaluru} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs">Test in Bengaluru</button><button onClick={showAllFacilities} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">All Facilities</button></div>
      </div>
      {(apiError || mapError) && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle className="w-5 h-5 shrink-0" /><span>{apiError ?? mapError}</span></div>}
      <div className="relative h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
        <div ref={mapElement} className="h-full w-full" aria-label="Nearby parking map" />
        {selected && <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 rounded-xl bg-white p-4 shadow-xl border border-slate-200"><h2 className="font-bold text-slate-900">{selected.name}</h2><p className="text-xs text-slate-500">{selected.address}</p><p className="mt-2 text-xs font-semibold">{selected.distanceAvailable ? `${selected.distance.toFixed(2)} km away · ` : ''}{selected.availableSlots}/{selected.totalSlots} slots available · {selected.occupancy}% occupied</p><div className="mt-3 flex gap-2"><button onClick={() => navigate(`/parking/${selected.parkingId}`)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Parking Details</button><button onClick={() => openDirections(selected)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white flex items-center gap-1"><Navigation className="w-4 h-4" /> Navigate</button></div></div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-2 relative"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type="text" placeholder="Search by facility name or address..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
        <div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-slate-500" /><span className="text-xs font-semibold text-slate-600 shrink-0">Radius: {radiusKm} km</span><input type="range" min="1" max="30" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} className="w-full accent-indigo-600" disabled={!coords} /></div>
      </div>
      {loading ? <div className="min-h-[30vh] flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div> : filteredLocations.length === 0 ? <div className="bg-white border rounded-2xl p-12 text-center text-slate-500"><MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" /><h3 className="text-lg font-bold">No Parking Locations Found</h3></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredLocations.map((location) => <button type="button" key={location.parkingId} onClick={() => selectLocation(location)} className={`text-left bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition ${selectedId === location.parkingId ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}><div className="flex justify-between"><h2 className="font-bold text-slate-900 text-lg">{location.name}</h2><span className="text-xs font-bold text-emerald-700">{location.operatingStatus}</span></div><p className="text-xs text-slate-500 mt-2"><MapPin className="w-4 h-4 inline" /> {location.address}{location.distanceAvailable ? ` (${location.distance.toFixed(2)} km)` : ''}</p><div className="grid grid-cols-2 gap-2 my-4 bg-slate-50 p-3 rounded-xl"><div><span className="text-[11px] text-slate-400 font-bold uppercase block">Available</span><span className="text-sm font-extrabold text-indigo-600">{location.availableSlots} / {location.totalSlots}</span></div><div><span className="text-[11px] text-slate-400 font-bold uppercase block">Starting Rate</span><span className="text-sm font-extrabold">₹{location.startingPrice}/hr</span></div></div><span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Select on map</span></button>)}</div>}
    </div>
  );
};
