import type { GeoPoint } from "./types";

/** Great-circle distance in km. The API uses PostGIS; this is for clients and tests. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A few Dhaka areas for the area picker and demo data. */
export const DHAKA_AREAS: Record<string, GeoPoint> = {
  Farmgate: { lat: 23.7577, lng: 90.3897 },
  Dhanmondi: { lat: 23.7461, lng: 90.3742 },
  Mirpur: { lat: 23.8223, lng: 90.3654 },
  Mohammadpur: { lat: 23.7662, lng: 90.3589 },
  Uttara: { lat: 23.8759, lng: 90.3795 },
  Mohakhali: { lat: 23.7781, lng: 90.4050 },
  Badda: { lat: 23.7806, lng: 90.4267 },
  "Azimpur / Lalbagh": { lat: 23.7255, lng: 90.3860 },
};
