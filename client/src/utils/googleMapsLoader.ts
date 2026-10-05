export interface GoogleMapsLibraries {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
}

const SCRIPT_ID = 'google-maps-javascript-api';
const READY_CALLBACK = '__smartParkingGoogleMapsReady';
let librariesPromise: Promise<GoogleMapsLibraries> | null = null;

declare global {
  interface Window {
    __smartParkingGoogleMapsReady?: () => void;
  }
}

const waitForBootstrap = (apiKey: string): Promise<void> => {
  if (typeof window.google?.maps?.importLibrary === 'function') return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement('script');

    const cleanup = () => {
      delete window.__smartParkingGoogleMapsReady;
    };
    window.__smartParkingGoogleMapsReady = () => {
      cleanup();
      resolve();
    };
    script.addEventListener('error', () => {
      cleanup();
      reject(new Error('Google Maps JavaScript API failed to load'));
    }, { once: true });

    if (!existingScript) {
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${READY_CALLBACK}`;
      script.async = true;
      document.head.appendChild(script);
    } else if (typeof window.google?.maps?.importLibrary === 'function') {
      cleanup();
      resolve();
    }
  });
};

export const loadGoogleMapsLibraries = (apiKey: string): Promise<GoogleMapsLibraries> => {
  if (!librariesPromise) {
    librariesPromise = waitForBootstrap(apiKey)
      .then(async () => {
        const [maps, marker] = await Promise.all([
          google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
        ]);
        return { maps, marker };
      })
      .catch((error: unknown) => {
        librariesPromise = null;
        throw error;
      });
  }
  return librariesPromise;
};
