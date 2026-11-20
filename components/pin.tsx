import { Check } from "lucide-react"
import { CATEGORY_ICON } from "@/lib/category-icons"
import type { Flag, Place } from "@/lib/places"
import { cn } from "@/lib/utils"

export function Pin({
  place,
  flag,
  selected,
}: {
  place: Place
  flag?: Flag
  selected?: boolean
}) {
  const Icon = CATEGORY_ICON[place.category]
  const mustDo = flag?.mustDo
  return (
    <span className="pin-wrap block">
      <span
        className={cn(
          "pin-inner relative grid size-8 place-items-center rounded-full transition-transform duration-200 ease-out",
          mustDo
            ? "bg-stone-950 text-white shadow-[0_2px_6px_rgb(0_0_0/0.25)]"
            : "bg-white text-stone-600 shadow-[0_1px_4px_rgb(0_0_0/0.12)] ring-1 ring-stone-300",
          flag?.done && "opacity-50",
          selected && "scale-125"
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
        {flag?.done && (
          <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-stone-950 text-white ring-2 ring-white">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        )}
      </span>
    </span>
  )
}
