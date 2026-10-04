import { useState, useEffect } from 'react';

export interface LocationState {
  lat: number;
  lng: number;
  locationName: string;
  isBrowserLocation: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable';
  isLoading: boolean;
  error: string | null;
}

// Default Fallback: Bengaluru City Center (12.9716, 77.5946)
export const DEFAULT_LOCATION = {
  lat: 12.9716,
  lng: 77.5946,
  locationName: 'Bengaluru City Center (Default)',
};

export const PRESET_LOCATIONS = [
  { name: 'Bengaluru City Center (MG Road)', lat: 12.9716, lng: 77.5946 },
  { name: 'Outer Ring Road (Kadubeesanahalli)', lat: 12.9279, lng: 77.6974 },
  { name: 'Indiranagar Metro Concourse', lat: 12.9783, lng: 77.6080 },
  { name: 'Kempegowda Int. Airport', lat: 13.1986, lng: 77.7062 },
];

export const useGeolocation = () => {
  const [location, setLocation] = useState<LocationState>({
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    locationName: DEFAULT_LOCATION.locationName,
    isBrowserLocation: false,
    permissionStatus: 'prompt',
    isLoading: true,
    error: null,
  });

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        permissionStatus: 'unavailable',
        isLoading: false,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          locationName: 'My Current Location',
          isBrowserLocation: true,
          permissionStatus: 'granted',
          isLoading: false,
          error: null,
        });
      },
      (err) => {
        let errorMsg = 'Failed to retrieve location';
        let status: LocationState['permissionStatus'] = 'denied';

        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied by user. Using manual fallback location.';
          status = 'denied';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }

        setLocation((prev) => ({
          ...prev,
          permissionStatus: status,
          isLoading: false,
          error: errorMsg,
        }));
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    requestBrowserLocation();
  }, []);

  const setManualLocation = (preset: { name: string; lat: number; lng: number }) => {
    setLocation({
      lat: preset.lat,
      lng: preset.lng,
      locationName: preset.name,
      isBrowserLocation: false,
      permissionStatus: location.permissionStatus,
      isLoading: false,
      error: null,
    });
  };

  return {
    location,
    requestBrowserLocation,
    setManualLocation,
  };
};
