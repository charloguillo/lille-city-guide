"use client"

import * as maplibregl from "maplibre-gl"
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Pin } from "@/components/pin"
import {
  quartiersGeoJSON,
  walkStreetsGeoJSON,
  type DensityStyle,
} from "@/lib/density"
import { GRAND_PLACE } from "@/lib/geo"
import type { Flags, Place } from "@/lib/places"
import { MAP_STYLES, type MapStyleId } from "@/lib/settings"

// Next bundles maplibre into a chunk, so the worker file is served from /public (copied at build).
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs")

export type MapMode = "ambiance" | "details"

interface MapViewProps {
  places: Place[]
  flags: Flags
  mode: MapMode
  density: DensityStyle
  styleId: MapStyleId
  selectedId: string | null
  onSelect: (id: string) => void
}

function pointsGeoJSON(
  places: Place[],
  flags: Flags
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: places
      .filter((p) => p.category !== "hotel")
      .map((p) => ({
        type: "Feature",
        properties: { weight: flags[p.id]?.mustDo ? 2 : 1 },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
  }
}

function spotsOf(places: Place[], flags: Flags) {
  return places
    .filter((p) => p.category !== "hotel")
    .map((p) => ({
      lat: p.lat,
      lng: p.lng,
      weight: flags[p.id]?.mustDo ? 2 : 1,
    }))
}

// Streets we use for "Balades" (no motorways, no rail).
const WALK_CLASSES = [
  "primary",
  "secondary",
  "tertiary",
  "minor",
  "service",
  "path",
  "pedestrian",
  "street",
]

// Density layers, and which density style shows each one.
const DENSITY_LAYERS: Record<string, DensityStyle> = {
  "glow-heat": "glow",
  "glow-dots": "glow",
  "quartiers-fill": "quartiers",
  "quartiers-line": "quartiers",
  "walks-glow": "walks",
  "walks-line": "walks",
  bubbles: "bubbles",
}

function routesGeoJSON(places: Place[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: places
      .filter((p) => p.route && p.route.length > 1)
      .map((p) => ({
        type: "Feature",
        properties: { id: p.id },
        geometry: {
          type: "LineString",
          coordinates: p.route!.map(([lat, lng]) => [lng, lat]),
        },
      })),
  }
}

export default function MapView({
  places,
  flags,
  mode,
  density,
  styleId,
  selectedId,
  onSelect,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markers = useRef(
    new Map<string, { marker: maplibregl.Marker; el: HTMLElement }>()
  )
  const [els, setEls] = useState<Record<string, HTMLElement>>({})
  const [styleReady, setStyleReady] = useState(0)
  const updateWalks = useRef(() => {})
  const dataRef = useRef({ places, flags, mode, density })
  useEffect(() => {
    dataRef.current = { places, flags, mode, density }
  })

  // Create the map once.
  useEffect(() => {
    if (!container.current) return
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLES.find((s) => s.id === styleId)!.url,
      center: [GRAND_PLACE.lng, GRAND_PLACE.lat],
      zoom: 13.6,
      attributionControl: { compact: true },
    })
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "bottom-right"
    )
    map.on("style.load", () => setStyleReady((n) => n + 1))
    mapRef.current = map
    const current = markers.current
    return () => {
      map.remove()
      current.clear()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch map style (Noir et blanc / Couleur).
  const firstStyle = useRef(true)
  useEffect(() => {
    if (firstStyle.current) {
      firstStyle.current = false
      return
    }
    mapRef.current?.setStyle(MAP_STYLES.find((s) => s.id === styleId)!.url)
  }, [styleId])

  // Add our layers after each style load.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    const { places, flags, mode } = dataRef.current
    if (!map.getSource("places")) {
      map.addSource("places", {
        type: "geojson",
        data: pointsGeoJSON(places, flags),
      })
      map.addSource("routes", { type: "geojson", data: routesGeoJSON(places) })
      map.addLayer({
        id: "routes",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#1c1917",
          "line-width": 3,
          "line-dasharray": [1, 1.6],
          "line-opacity": mode === "details" ? 0.85 : 0,
          "line-opacity-transition": { duration: 250 },
        },
      })
      // Put area layers under the map labels, so street names stay readable.
      const firstSymbol = map
        .getStyle()
        .layers.find((l) => l.type === "symbol")?.id
      const spots = spotsOf(places, flags)
      map.addSource("quartiers", {
        type: "geojson",
        data: quartiersGeoJSON(spots),
      })
      map.addSource("walks", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })
      map.addSource("clusters", {
        type: "geojson",
        data: pointsGeoJSON(places, flags),
        cluster: true,
        clusterRadius: 70,
        clusterMaxZoom: 17,
        clusterProperties: { w: ["+", ["get", "weight"]] },
      })
      const hidden = { visibility: "none" as const }
      // 1. Quartiers: each neighbourhood glows warmer with more spots.
      map.addLayer(
        {
          id: "quartiers-fill",
          type: "fill",
          source: "quartiers",
          layout: hidden,
          paint: {
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1,
              "#fde68a",
              4,
              "#fbbf24",
              8,
              "#f97316",
              14,
              "#ea580c",
            ],
            "fill-opacity": 0.3,
          },
        },
        firstSymbol
      )
      map.addLayer(
        {
          id: "quartiers-line",
          type: "line",
          source: "quartiers",
          layout: hidden,
          paint: {
            "line-color": "#ffffff",
            "line-width": 2,
            "line-opacity": 0.9,
          },
        },
        firstSymbol
      )
      // 3. Balades: streets that pass near many spots.
      map.addLayer(
        {
          id: "walks-glow",
          type: "line",
          source: "walks",
          layout: { ...hidden, "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#fbbf24",
            "line-width": ["interpolate", ["linear"], ["zoom"], 12, 6, 16, 16],
            "line-blur": 6,
            "line-opacity": 0.45,
          },
        },
        firstSymbol
      )
      map.addLayer(
        {
          id: "walks-line",
          type: "line",
          source: "walks",
          layout: { ...hidden, "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": [
              "interpolate",
              ["linear"],
              ["get", "score"],
              2,
              "#fbbf24",
              4,
              "#f97316",
              7,
              "#dc2626",
            ],
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              ["interpolate", ["linear"], ["get", "score"], 2, 1.5, 6, 3],
              16,
              ["interpolate", ["linear"], ["get", "score"], 2, 3, 6, 7],
            ],
            "line-opacity": 0.9,
          },
        },
        firstSymbol
      )
      // 2. Lueurs: soft golden lights, like a city seen at night.
      map.addLayer({
        id: "glow-heat",
        type: "heatmap",
        source: "places",
        layout: hidden,
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            0.6,
            16,
            1.2,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            18,
            14,
            40,
            17,
            80,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(253,230,138,0)",
            0.15,
            "rgba(253,230,138,0.3)",
            0.4,
            "rgba(252,211,77,0.5)",
            0.7,
            "rgba(251,191,36,0.6)",
            1,
            "rgba(245,158,11,0.7)",
          ],
          "heatmap-opacity": 0.9,
        },
      })
      map.addLayer({
        id: "glow-dots",
        type: "circle",
        source: "places",
        layout: hidden,
        paint: {
          "circle-color": "#fbbf24",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 6, 16, 16],
          "circle-blur": 1,
          "circle-opacity": 0.55,
        },
      })
      // 4. Bulles: one circle per group of spots, bigger with more spots. No number.
      map.addLayer({
        id: "bubbles",
        type: "circle",
        source: "clusters",
        layout: hidden,
        paint: {
          "circle-color": "rgba(251,191,36,0.32)",
          "circle-stroke-color": "rgba(217,119,6,0.7)",
          "circle-stroke-width": 1.5,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "w"], ["get", "weight"]],
            1,
            12,
            4,
            22,
            10,
            34,
            25,
            50,
          ],
        },
      })
    }
  }, [styleReady])

  // Keep layer data in sync.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    ;(map.getSource("places") as GeoJSONSource | undefined)?.setData(
      pointsGeoJSON(places, flags)
    )
    ;(map.getSource("routes") as GeoJSONSource | undefined)?.setData(
      routesGeoJSON(places)
    )
    ;(map.getSource("clusters") as GeoJSONSource | undefined)?.setData(
      pointsGeoJSON(places, flags)
    )
    ;(map.getSource("quartiers") as GeoJSONSource | undefined)?.setData(
      quartiersGeoJSON(spotsOf(places, flags))
    )
    updateWalks.current()
  }, [places, flags, styleReady])

  // "Balades": score the streets from the map tiles. Runs when the map stops moving.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    updateWalks.current = () => {
      const { places, flags, mode, density } = dataRef.current
      const src = map.getSource("walks") as GeoJSONSource | undefined
      if (!src || mode !== "ambiance" || density !== "walks") return
      const sourceId = Object.entries(map.getStyle().sources).find(
        ([, s]) => s.type === "vector"
      )?.[0]
      if (!sourceId) return
      const lines: [number, number][][] = []
      for (const f of map.querySourceFeatures(sourceId, {
        sourceLayer: "transportation",
        filter: ["in", ["get", "class"], ["literal", WALK_CLASSES]],
      })) {
        const g = f.geometry
        if (g.type === "LineString")
          lines.push(g.coordinates as [number, number][])
        else if (g.type === "MultiLineString")
          lines.push(...(g.coordinates as [number, number][][]))
      }
      src.setData(walkStreetsGeoJSON(lines, spotsOf(places, flags)))
    }
    const run = () => updateWalks.current()
    map.on("idle", run)
    return () => {
      map.off("idle", run)
    }
  }, [])

  // Spots / Heatmap switch, and which density style shows.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady || !map.getLayer("bubbles")) return
    for (const [id, style] of Object.entries(DENSITY_LAYERS)) {
      map.setLayoutProperty(
        id,
        "visibility",
        mode === "ambiance" && density === style ? "visible" : "none"
      )
    }
    map.setPaintProperty(
      "routes",
      "line-opacity",
      mode === "details" ? 0.85 : 0
    )
    // Neighbourhoods are big: zoom out a little so several show at once.
    if (mode === "ambiance" && density === "quartiers" && map.getZoom() > 13)
      map.easeTo({ zoom: 12.6, duration: 400 })
    updateWalks.current()
  }, [mode, density, styleReady])

  // HTML markers (one per visible place). React renders the pin into each one.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const wanted = new Set(places.map((p) => p.id))
    for (const [id, m] of markers.current) {
      if (!wanted.has(id)) {
        m.marker.remove()
        markers.current.delete(id)
      }
    }
    for (const p of places) {
      if (markers.current.has(p.id)) continue
      const el = document.createElement("button")
      el.type = "button"
      el.className = "pin grid size-11 place-items-center"
      el.setAttribute("aria-label", p.name)
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        onSelect(p.id)
      })
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .addTo(map)
      markers.current.set(p.id, { marker, el })
    }
    setEls(
      Object.fromEntries([...markers.current].map(([id, m]) => [id, m.el]))
    )
  }, [places, onSelect])

  // Fly to the selected place.
  useEffect(() => {
    const map = mapRef.current
    const p = places.find((x) => x.id === selectedId)
    if (map && p) {
      map.resize()
      map.flyTo({
        center: [p.lng, p.lat],
        zoom: Math.max(map.getZoom(), 16),
        // The sheet covers the bottom: center the pin in the visible part.
        offset: [0, -Math.round(map.getContainer().clientHeight * 0.3)],
        duration: 600,
        essential: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const byId = new Map(places.map((p) => [p.id, p]))
  return (
    <>
      <div
        className={`absolute inset-0 ${mode === "ambiance" ? "mode-ambiance" : ""}`}
      >
        <div ref={container} className="h-full w-full" />
      </div>
      {Object.entries(els).map(([id, el]) => {
        const p = byId.get(id)
        return p
          ? createPortal(
              <Pin place={p} flag={flags[id]} selected={id === selectedId} />,
              el,
              id
            )
          : null
      })}
    </>
  )
}
