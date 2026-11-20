"use client"

import * as maplibregl from "maplibre-gl"
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Pin } from "@/components/pin"
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
  const dataRef = useRef({ places, flags, mode })
  useEffect(() => {
    dataRef.current = { places, flags, mode }
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
      map.addLayer({
        id: "heat",
        type: "heatmap",
        source: "places",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            0.7,
            16,
            1.6,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            22,
            14,
            48,
            17,
            90,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(12,10,9,0)",
            0.1,
            "rgba(214,211,209,0.5)",
            0.3,
            "rgba(168,162,158,0.65)",
            0.55,
            "rgba(87,83,78,0.75)",
            0.8,
            "rgba(41,37,36,0.85)",
            1,
            "rgba(12,10,9,0.9)",
          ],
          "heatmap-opacity": mode === "ambiance" ? 1 : 0,
          "heatmap-opacity-transition": { duration: 250 },
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
  }, [places, flags, styleReady])

  // Heatmap / Places crossfade.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady || !map.getLayer("heat")) return
    map.setPaintProperty("heat", "heatmap-opacity", mode === "ambiance" ? 1 : 0)
    map.setPaintProperty(
      "routes",
      "line-opacity",
      mode === "details" ? 0.85 : 0
    )
  }, [mode, styleReady])

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
      const home = p.category === "hotel"
      el.className = home
        ? "pin-home grid h-11 place-items-center"
        : "pin grid size-11 place-items-center"
      el.setAttribute("aria-label", p.name)
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        onSelect(p.id)
      })
      if (home) el.style.zIndex = "1"
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
