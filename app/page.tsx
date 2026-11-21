"use client"

import dynamic from "next/dynamic"
import { useCallback, useMemo, useState } from "react"
import { List, Map01, MarkerPin01, Settings01 } from "@untitledui/icons"
import { Chip } from "@/components/chip"
import { ListView } from "@/components/list-view"
import type { MapMode } from "@/components/map-view"
import { PlaceSheet } from "@/components/place-sheet"
import { SettingsSheet } from "@/components/settings-sheet"
import { Tabs, TabsItem } from "@/components/ui/tabs"
import { useFlags } from "@/lib/flags"
import {
  CATEGORIES,
  DIETS,
  filterPlaces,
  places,
  type Category,
  type Diet,
} from "@/lib/places"
import { useMapStyle } from "@/lib/settings"
import { useLocalState } from "@/lib/use-local-state"

const MapView = dynamic(() => import("@/components/map-view"), { ssr: false })

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export default function Page() {
  const flags = useFlags()
  const [styleId, setStyleId] = useMapStyle()
  // Bottom tabs: 0 = Spots (pins), 1 = Heatmap, 2 = Liste. Saved so the app reopens on the last tab.
  const [tab, setTab] = useLocalState<number>("lcg:tab", 1)
  const mode: MapMode = tab === 1 ? "ambiance" : "details"
  const isMap = tab !== 2
  const [categories, setCategories] = useState<Category[]>([])
  const [diets, setDiets] = useState<Diet[]>([])
  const [mustDoOnly, setMustDoOnly] = useState(false)
  const [hideDone, setHideDone] = useLocalState("lcg:hide-done", true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const visible = useMemo(
    () =>
      filterPlaces(places, { categories, diets, hideDone, mustDoOnly }, flags),
    [categories, diets, hideDone, mustDoOnly, flags]
  )
  const selected = places.find((p) => p.id === selectedId) ?? null
  const onSelect = useCallback((id: string) => setSelectedId(id), [])
  // From the list: show the place on the map, with its pin. Closing the sheet goes back to the list.
  const [fromList, setFromList] = useState(false)
  const onSelectFromList = useCallback((id: string) => {
    setFromList(true)
    setTab(0)
    setSelectedId(id)
  }, [setTab])
  const onCloseSheet = () => {
    setSelectedId(null)
    if (fromList) {
      setFromList(false)
      setTab(2)
    }
  }
  const showDiet = categories.includes("restaurant")

  return (
    <main className="fixed inset-0 overflow-hidden bg-stone-100">
      <div className={isMap ? "contents" : "invisible"}>
        <MapView
          places={visible}
          flags={flags}
          mode={mode}
          styleId={styleId}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
      {tab === 2 && (
        <ListView
          places={visible.filter((p) => p.category !== "hotel")}
          flags={flags}
          onSelect={onSelectFromList}
        />
      )}

      {/* Top bar: filters + settings */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="pointer-events-auto flex items-center gap-2 py-3 pl-4">
          <div className="no-scrollbar flex min-w-0 flex-1 [scrollbar-width:none] gap-2 overflow-x-auto py-1 pr-1">
            <Chip active={mustDoOnly} onClick={() => setMustDoOnly((v) => !v)}>
              ★ À faire
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                active={categories.includes(c.id)}
                onClick={() => {
                  setCategories((l) => toggle(l, c.id))
                  if (c.id === "restaurant") setDiets([])
                }}
              >
                {c.label}
              </Chip>
            ))}
          </div>
          <button
            type="button"
            aria-label="Réglages"
            onClick={() => setSettingsOpen(true)}
            className="mr-3 grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-stone-800 shadow-[0_1px_4px_rgb(0_0_0/0.12)] ring-1 ring-stone-200 backdrop-blur"
          >
            <Settings01 className="size-5" />
          </button>
        </div>
        {showDiet && (
          <div className="pointer-events-auto flex gap-2 px-4 pb-2">
            {DIETS.map((d) => (
              <Chip
                key={d.id}
                active={diets.includes(d.id)}
                onClick={() => setDiets((l) => toggle(l, d.id))}
                className="h-8 text-[12px]"
              >
                {d.label}
              </Chip>
            ))}
          </div>
        )}
      </header>

      {/* Bottom tabs */}
      <nav className="absolute inset-x-0 bottom-0 z-10 flex justify-center pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="rounded-2xl bg-white/95 p-1.5 shadow-[0_4px_20px_rgb(0_0_0/0.12)] ring-1 ring-stone-200 backdrop-blur [&_[role=tab]]:min-h-11 [&_[role=tab]]:px-4">
          <Tabs
            selectedIndex={tab}
            onSelect={(i) => {
              setFromList(false)
              setTab(i)
            }}
          >
            <TabsItem index={0} icon={MarkerPin01} label="Spots" />
            <TabsItem index={1} icon={Map01} label="Heatmap" />
            <TabsItem index={2} icon={List} label="Liste" />
          </Tabs>
        </div>
      </nav>

      <PlaceSheet
        place={selected}
        flag={selected ? flags[selected.id] : undefined}
        onClose={onCloseSheet}
      />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        styleId={styleId}
        onStyle={setStyleId}
        hideDone={hideDone}
        onHideDone={setHideDone}
      />
    </main>
  )
}
