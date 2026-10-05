export interface MapCoordinate {
  lat: number;
  lng: number;
}

export const buildGoogleMapsDirectionsUrl = (
  destination: MapCoordinate,
  origin?: MapCoordinate | null
): string => {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
  });
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
