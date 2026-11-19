"use client"

import { useEffect, useState } from "react"

export type MapStyleId = "bw" | "color"

/** Add more modes here later (dark, etc.). */
export const MAP_STYLES: { id: MapStyleId; label: string; url: string }[] = [
  {
    id: "bw",
    label: "Noir et blanc",
    url: "https://tiles.openfreemap.org/styles/positron",
  },
  {
    id: "color",
    label: "Couleur",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
]

const KEY = "lcg:map-style"

export function useMapStyle(): [MapStyleId, (id: MapStyleId) => void] {
  const [style, setStyle] = useState<MapStyleId>("bw")
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "bw" || v === "color") setStyle(v)
    } catch {}
  }, [])
  const update = (id: MapStyleId) => {
    setStyle(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {}
  }
  return [style, update]
}
