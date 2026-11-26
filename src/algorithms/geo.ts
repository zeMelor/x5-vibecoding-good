import { Coordinates } from '../types';

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in kilometers with urban road factor (1.28x) */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const straightKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  return Number((straightKm * 1.28).toFixed(2));
}

export function travelMinutes(distKm: number, speedKmh: number, stopOverheadMin = 5): number {
  return Math.max(2, Math.round((distKm / speedKmh) * 60 + stopOverheadMin));
}
