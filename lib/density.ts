// Density views for the "Heatmap" tab. Charles tests 4 looks and keeps one.
// Pure functions (no MapLibre import) so they stay easy to test.

export type DensityStyle = "glow" | "quartiers" | "walks" | "bubbles"

export const DENSITY_STYLES: { id: DensityStyle; label: string }[] = [
  { id: "glow", label: "Lueurs" },
  { id: "quartiers", label: "Quartiers" },
  { id: "walks", label: "Balades" },
  { id: "bubbles", label: "Bulles" },
]

export function isDensityStyle(v: unknown): v is DensityStyle {
  return DENSITY_STYLES.some((s) => s.id === v)
}

interface Pt {
  lat: number
  lng: number
}

// Local flat projection in meters around Lille (good enough at city scale).
const LAT0 = 50.63
const KX = Math.cos((LAT0 * Math.PI) / 180) * 111320
const KY = 110540
const toXY = (lng: number, lat: number): [number, number] => [
  lng * KX,
  lat * KY,
]
const toLngLat = ([x, y]: [number, number]): [number, number] => [
  x / KX,
  y / KY,
]

// Approximate centers of Lille neighbourhoods (and nearby towns with spots).
// Cells are built around them (Voronoi), cut to a circle.
export const QUARTIERS: {
  name: string
  lat: number
  lng: number
  r: number
}[] = [
  { name: "Vieux-Lille", lat: 50.6425, lng: 3.0635, r: 1100 },
  { name: "Lille-Centre", lat: 50.6345, lng: 3.0645, r: 1100 },
  { name: "Wazemmes", lat: 50.6265, lng: 3.0485, r: 1100 },
  { name: "Moulins", lat: 50.6205, lng: 3.0705, r: 1100 },
  { name: "Fives", lat: 50.6315, lng: 3.0905, r: 1200 },
  { name: "Saint-Maurice", lat: 50.6435, lng: 3.0875, r: 1100 },
  { name: "Vauban-Esquermes", lat: 50.6335, lng: 3.0425, r: 1100 },
  { name: "Bois-Blancs", lat: 50.6375, lng: 3.0225, r: 1100 },
  { name: "Faubourg de Béthune", lat: 50.6195, lng: 3.0355, r: 1100 },
  { name: "Lille-Sud", lat: 50.6095, lng: 3.0565, r: 1200 },
  { name: "Hellemmes", lat: 50.6275, lng: 3.1085, r: 1100 },
  { name: "Villeneuve-d'Ascq", lat: 50.6395, lng: 3.1505, r: 1400 },
  { name: "Croix", lat: 50.6775, lng: 3.1505, r: 1300 },
  { name: "Roubaix", lat: 50.6905, lng: 3.1765, r: 1500 },
  { name: "Tourcoing", lat: 50.7235, lng: 3.1605, r: 1500 },
]

type Poly = [number, number][]

function circle(c: [number, number], r: number, n = 48): Poly {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as [number, number]
  })
}

// Keep the part of the polygon closer to a than to b (Sutherland–Hodgman, one half-plane).
function clipHalf(poly: Poly, a: [number, number], b: [number, number]): Poly {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const nx = b[0] - a[0]
  const ny = b[1] - a[1]
  const side = (p: [number, number]) => (p[0] - mx) * nx + (p[1] - my) * ny // < 0 = a side
  const out: Poly = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const sp = side(p)
    const sq = side(q)
    if (sp <= 0) out.push(p)
    if (sp <= 0 !== sq <= 0) {
      const t = sp / (sp - sq)
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return out
}

/** One polygon per neighbourhood, with the number of spots inside (must-do counts double). */
export function quartiersGeoJSON(
  spots: (Pt & { weight: number })[]
): GeoJSON.FeatureCollection {
  const centers = QUARTIERS.map((q) => toXY(q.lng, q.lat))
  const counts = QUARTIERS.map(() => 0)
  for (const s of spots) {
    const p = toXY(s.lng, s.lat)
    let best = -1
    let bestD = Infinity
    centers.forEach((c, i) => {
      const d = Math.hypot(p[0] - c[0], p[1] - c[1])
      if (d <= QUARTIERS[i].r && d < bestD) {
        bestD = d
        best = i
      }
    })
    if (best >= 0) counts[best] += s.weight
  }
  return {
    type: "FeatureCollection",
    features: QUARTIERS.map((q, i) => {
      let poly = circle(centers[i], q.r)
      centers.forEach((c, j) => {
        if (j !== i) poly = clipHalf(poly, centers[i], c)
      })
      const ring = poly.map(toLngLat)
      ring.push(ring[0])
      return {
        type: "Feature" as const,
        properties: { name: q.name, count: counts[i] },
        geometry: { type: "Polygon" as const, coordinates: [ring] },
      }
    }).filter((f) => f.properties.count > 0),
  }
}

function distToSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  const t = l2
    ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    : 0
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/**
 * "Balades": street pieces that pass near many spots.
 * lines = street geometries [lng, lat][] (from the map tiles).
 * Returns one feature per street piece with score >= minScore.
 */
export function walkStreetsGeoJSON(
  lines: [number, number][][],
  spots: (Pt & { weight: number })[],
  { radius = 80, minScore = 2 } = {}
): GeoJSON.FeatureCollection {
  const pts = spots.map((s) => ({ p: toXY(s.lng, s.lat), w: s.weight }))
  const seen = new Set<string>()
  const features: GeoJSON.Feature[] = []
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a0 = line[i]
      const b0 = line[i + 1]
      const key =
        a0[0] < b0[0] || (a0[0] === b0[0] && a0[1] < b0[1])
          ? `${a0[0].toFixed(5)},${a0[1].toFixed(5)},${b0[0].toFixed(5)},${b0[1].toFixed(5)}`
          : `${b0[0].toFixed(5)},${b0[1].toFixed(5)},${a0[0].toFixed(5)},${a0[1].toFixed(5)}`
      if (seen.has(key)) continue
      seen.add(key)
      const a = toXY(a0[0], a0[1])
      const b = toXY(b0[0], b0[1])
      const minX = Math.min(a[0], b[0]) - radius
      const maxX = Math.max(a[0], b[0]) + radius
      const minY = Math.min(a[1], b[1]) - radius
      const maxY = Math.max(a[1], b[1]) + radius
      let score = 0
      for (const s of pts) {
        if (s.p[0] < minX || s.p[0] > maxX || s.p[1] < minY || s.p[1] > maxY)
          continue
        if (distToSegment(s.p, a, b) <= radius) score += s.w
      }
      if (score >= minScore)
        features.push({
          type: "Feature",
          properties: { score },
          geometry: { type: "LineString", coordinates: [a0, b0] },
        })
    }
  }
  return { type: "FeatureCollection", features }
}
