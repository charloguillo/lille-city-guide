"use client"

import { Check } from "lucide-react"
import { useEffect, useState } from "react"
import { PlacePhoto } from "@/components/place-photo"
import { CATEGORY_ICON } from "@/lib/category-icons"
import {
  formatDistance,
  GRAND_PLACE,
  sortByDistance,
  walkMinutes,
  type LatLng,
} from "@/lib/geo"
import { CATEGORY_LABEL, type Flags, type Place } from "@/lib/places"
import { cn } from "@/lib/utils"

export function ListView({
  places,
  flags,
  onSelect,
}: {
  places: Place[]
  flags: Flags
  onSelect: (id: string) => void
}) {
  const [pos, setPos] = useState<LatLng | null>(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30_000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])
  const sorted = sortByDistance(places, pos ?? GRAND_PLACE)

  return (
    <div className="absolute inset-0 z-[5] overflow-y-auto bg-stone-50 pt-[calc(env(safe-area-inset-top)+108px)] pb-[calc(env(safe-area-inset-bottom)+88px)]">
      <p className="px-5 pb-2 text-[12px] text-stone-500">
        {sorted.length} lieux · distance depuis{" "}
        {pos ? "ta position" : "la Grand Place"}
      </p>
      <ul className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
        {sorted.map((p) => {
          const Icon = CATEGORY_ICON[p.category]
          const f = flags[p.id]
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-5 py-3 text-left active:bg-stone-100",
                  f?.done && "opacity-50"
                )}
              >
                <span className="relative size-14 shrink-0">
                  <PlacePhotoOrIcon place={p} />
                  <span
                    className={cn(
                      "absolute -right-1.5 -bottom-1.5 grid size-6 place-items-center rounded-full ring-2 ring-white",
                      f?.mustDo
                        ? "bg-stone-950 text-white"
                        : "bg-white text-stone-600 ring-stone-200"
                    )}
                  >
                    <Icon className="size-3" strokeWidth={2} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-[15px] font-medium text-stone-950">
                    {p.name}
                    {f?.done && <Check className="size-3.5 shrink-0" />}
                  </span>
                  <span className="block truncate text-[13px] text-stone-500">
                    {CATEGORY_LABEL[p.category]} · {p.why}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[12px] text-stone-500 tabular-nums">
                  {formatDistance(p.distance)}
                  <br />
                  {walkMinutes(p.distance)} min
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {sorted.length === 0 && (
        <p className="px-5 py-10 text-center text-stone-500">
          Aucun lieu avec ces filtres.
        </p>
      )}
    </div>
  )
}

function PlacePhotoOrIcon({ place }: { place: Place }) {
  const Icon = CATEGORY_ICON[place.category]
  const icon = (
    <span className="grid size-14 place-items-center rounded-xl bg-stone-100 text-stone-400">
      <Icon className="size-5" strokeWidth={1.5} />
    </span>
  )
  if (!place.photo_url) return icon
  return (
    <PlacePhoto
      src={place.photo_url}
      alt=""
      sizes="56px"
      className="size-14 rounded-xl"
      fallback={icon}
    />
  )
}
