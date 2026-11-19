import placesData from "@/data/places.json"

export type Category =
  | "cafe"
  | "restaurant"
  | "bar"
  | "shop"
  | "gallery"
  | "museum"
  | "thrift"
  | "walk"
  | "viewpoint"
  | "local"

export type Diet = "meat" | "veggie" | "unknown"

export interface Place {
  id: string
  name: string
  category: Category
  address: string
  lat: number
  lng: number
  why: string
  source_url: string
  tags: string[]
  hours?: string
  route?: [number, number][]
  photo_url?: string
  photo_credit?: string
  diet?: Diet
}

export const places = placesData as Place[]

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "restaurant", label: "Restos" },
  { id: "cafe", label: "Cafés" },
  { id: "bar", label: "Bars" },
  { id: "museum", label: "Musées" },
  { id: "gallery", label: "Galeries" },
  { id: "shop", label: "Boutiques" },
  { id: "thrift", label: "Fripes" },
  { id: "walk", label: "Balades" },
  { id: "viewpoint", label: "Points de vue" },
  { id: "local", label: "Spots locaux" },
]

export const CATEGORY_LABEL: Record<Category, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  museum: "Musée",
  gallery: "Galerie",
  shop: "Boutique",
  thrift: "Friperie",
  walk: "Balade",
  viewpoint: "Point de vue",
  local: "Spot local",
}

export const DIETS: { id: Diet; label: string }[] = [
  { id: "meat", label: "Carné" },
  { id: "veggie", label: "Végé" },
  { id: "unknown", label: "Inconnu" },
]

export interface Flag {
  mustDo: boolean
  done: boolean
  updatedAt: number
}
export type Flags = Record<string, Flag>

export interface Filters {
  categories: Category[] // empty = all
  diets: Diet[] // empty = all (restaurants only)
  hideDone: boolean
  mustDoOnly?: boolean
}

export function filterPlaces(
  list: Place[],
  filters: Filters,
  flags: Flags
): Place[] {
  return list.filter((p) => {
    if (filters.categories.length && !filters.categories.includes(p.category))
      return false
    if (p.category === "restaurant" && filters.diets.length) {
      if (!filters.diets.includes(p.diet ?? "unknown")) return false
    }
    const f = flags[p.id]
    if (filters.hideDone && f?.done) return false
    if (filters.mustDoOnly && !f?.mustDo) return false
    return true
  })
}
