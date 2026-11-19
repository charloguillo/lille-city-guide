export interface LatLng {
  lat: number
  lng: number
}

/** Grand Place, Lille. Fallback when GPS is not available. */
export const GRAND_PLACE: LatLng = { lat: 50.63716, lng: 3.06353 }

/** Distance in meters (haversine). */
export function distance(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function sortByDistance<T extends LatLng>(
  list: T[],
  from: LatLng
): (T & { distance: number })[] {
  return list
    .map((p) => ({ ...p, distance: distance(from, p) }))
    .sort((a, b) => a.distance - b.distance)
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`
}

/** Walking time at ~4.8 km/h. */
export function walkMinutes(m: number): number {
  return Math.max(1, Math.round(m / 80))
}
