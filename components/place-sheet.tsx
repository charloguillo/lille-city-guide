"use client"

import { Check, Navigation } from "lucide-react"
import { BottomSheet } from "@/components/bottom-sheet"
import { PlacePhoto } from "@/components/place-photo"
import { Button } from "@/components/ui/button"
import { CATEGORY_ICON } from "@/lib/category-icons"
import { setFlag } from "@/lib/flags"
import { CATEGORY_LABEL, DIETS, type Flag, type Place } from "@/lib/places"
import { Star01 } from "@untitledui/icons"

function directionsUrl(p: Place) {
  const isApple =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|Macintosh/.test(navigator.userAgent)
  return isApple
    ? `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`
}

export function PlaceSheet({
  place,
  flag,
  onClose,
}: {
  place: Place | null
  flag?: Flag
  onClose: () => void
}) {
  return (
    <BottomSheet
      open={!!place}
      onClose={onClose}
      title={place?.name}
      modal={false}
    >
      {place && <PlaceBody place={place} flag={flag} />}
    </BottomSheet>
  )
}

function PlaceBody({ place, flag }: { place: Place; flag?: Flag }) {
  const Icon = CATEGORY_ICON[place.category]
  const mustDo = !!flag?.mustDo
  const done = !!flag?.done
  const diet =
    place.category === "restaurant"
      ? DIETS.find((d) => d.id === (place.diet ?? "unknown"))
      : null
  return (
    <div>
      {place.photo_url && (
        <figure className="mb-4">
          <PlacePhoto
            key={place.id}
            src={place.photo_url}
            alt={place.name}
            priority
            sizes="(max-width: 512px) 100vw, 512px"
            className="aspect-[16/9] w-full rounded-2xl"
            caption={
              place.photo_credit && (
                <figcaption className="mt-1.5 text-[11px] text-stone-400">
                  Photo : {place.photo_credit}
                </figcaption>
              )
            }
          />
        </figure>
      )}
      <div className="pr-8">
        <div className="flex items-center gap-1.5 text-[13px] text-stone-500">
          <Icon className="size-3.5" strokeWidth={1.75} />
          <span>{CATEGORY_LABEL[place.category]}</span>
          {diet && <span>· {diet.label}</span>}
        </div>
        <h2 className="mt-1 text-[22px] leading-7 font-semibold tracking-tight text-stone-950">
          {place.name}
        </h2>
        <p className="mt-1 text-[13px] text-stone-500">{place.address}</p>
        <p className="mt-3 text-[15px] leading-6 text-stone-800">{place.why}</p>
        {place.hours && (
          <p className="mt-2 text-[13px] text-stone-500">{place.hours}</p>
        )}
        {place.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {place.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-stone-100 px-2.5 py-1 text-[12px] text-stone-600"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div
          className={`mt-5 -mr-8 grid gap-2 [&_a]:h-11 [&_button]:h-11 ${place.category === "hotel" ? "grid-cols-1" : "grid-cols-3"}`}
        >
          {place.category !== "hotel" && (
            <>
              <Button
                variant={mustDo ? "primary" : "tertiary"}
                leadingIcon={Star01}
                onClick={() => setFlag(place.id, { mustDo: !mustDo })}
                aria-pressed={mustDo}
              >
                À faire
              </Button>
              <Button
                variant={done ? "primary" : "tertiary"}
                leadingIcon={Check}
                onClick={() => setFlag(place.id, { done: !done })}
                aria-pressed={done}
              >
                Fait
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            leadingIcon={Navigation}
            render={
              <a href={directionsUrl(place)} target="_blank" rel="noreferrer" />
            }
          >
            Y aller
          </Button>
        </div>
        {place.source_url && (
          <a
            href={place.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-[13px] text-stone-500 underline underline-offset-2"
          >
            Source
          </a>
        )}
      </div>
    </div>
  )
}
