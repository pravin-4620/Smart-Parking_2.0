import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NearbyParkingResponse } from '@smart-parking/shared';
import { parkingService } from '../services/parkingService.js';
import { buildGoogleMapsDirectionsUrl } from '../utils/maps.js';
import { GoogleMapsLibraries, loadGoogleMapsLibraries } from '../utils/googleMapsLoader.js';
import { MapPin, Navigation, Search, SlidersHorizontal, AlertCircle, ArrowUpRight } from 'lucide-react';
import { PageHeader, Panel, StatusBadge, SkeletonCards } from '../components/ui/MobilityUI';

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
    <div className="parking-discovery">
      <PageHeader eyebrow="Explore your next stop" title="Find parking near you"
        description={<span className="flex items-center gap-2"><Navigation size={14} />{geoMessage}</span>}
        actions={<><button onClick={requestUserLocation} className="ui-button"><Navigation size={14} />Use My Location</button><button onClick={testInBengaluru} className="ui-button">Test in Bengaluru</button><button onClick={showAllFacilities} className="ui-button ui-button-primary">All Facilities</button></>} />
      {(apiError || mapError) && <div role="alert" className="inline-notice"><AlertCircle size={18} className="shrink-0" /><span>{apiError ?? mapError}</span></div>}
      <div className="discovery-controls">
        <div className="discovery-search"><Search size={17} /><input aria-label="Search facilities by name or address" placeholder="Search a facility or address" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div>
        <div className="discovery-radius"><SlidersHorizontal size={16} /><label htmlFor="discovery-radius">Within {radiusKm} km</label><input id="discovery-radius" type="range" min="1" max="30" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} disabled={!coords} /></div>
      </div>
      <div className="discovery-layout">
        <div className="map-frame">
          <div ref={mapElement} className="h-full w-full" aria-label="Nearby parking map" />
          <div className="map-label"><MapPin size={14} />Parking discovery</div>
          {selected && <div className="map-overlay">
            <h2>{selected.name}</h2><p>{selected.address}</p>
            <p className="mt-2">{selected.distanceAvailable ? `${selected.distance.toFixed(2)} km away · ` : ''}{selected.availableSlots}/{selected.totalSlots} slots available · {selected.occupancy}% occupied</p>
            <div className="overlay-actions"><button onClick={() => navigate(`/parking/${selected.parkingId}`)} className="ui-button ui-button-dark">Parking Details</button><button onClick={() => openDirections(selected)} className="ui-button"><Navigation size={14} />Navigate</button></div>
          </div>}
        </div>
        <section className="discovery-results" aria-label="Parking facilities">
          <div className="results-heading"><h2>Places to park</h2><span>{loading ? 'Finding spaces…' : `${filteredLocations.length} facilities`}</span></div>
          {loading ? <SkeletonCards count={3} label="Finding parking facilities" /> : filteredLocations.length === 0 ?
            <Panel className="empty-discovery"><MapPin size={36} /><h3>No parking locations found</h3><p>Try a wider radius or choose All Facilities.<br />You can still explore the map.</p></Panel> :
            <div className="facility-list">{filteredLocations.map((location) => <article key={location.parkingId} className={`facility-card ${selectedId === location.parkingId ? 'facility-card-selected' : ''}`}>
              <button type="button" className="facility-select" onClick={() => selectLocation(location)} aria-pressed={selectedId === location.parkingId} aria-label={`Select ${location.name} on map`}>
                <div className="facility-title"><h3>{location.name}</h3><span className="facility-distance">{location.operatingStatus}</span></div>
                <p className="facility-address"><MapPin size={13} />{location.address}</p>
                <div className="facility-meta"><StatusBadge tone={location.availableSlots > 0 ? 'success' : 'neutral'}>{location.availableSlots} / {location.totalSlots} spaces available</StatusBadge>{location.distanceAvailable && <span className="facility-distance">{location.distance.toFixed(2)} km away</span>}</div>
              </button>
              <div className="facility-bottom"><div className="facility-price"><strong>₹{location.startingPrice}</strong><small>starting rate / hour</small></div><button onClick={() => navigate(`/parking/${location.parkingId}`)} className="ui-button ui-button-dark">View parking <ArrowUpRight size={14} /></button></div>
            </article>)}</div>}
        </section>
      </div>
    </div>
  );
};
