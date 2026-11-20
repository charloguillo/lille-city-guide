import {
  BedDouble,
  Coffee,
  Eye,
  Footprints,
  Frame,
  Landmark,
  ShoppingBag,
  Shirt,
  Star,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react"
import type { Category } from "@/lib/places"

// Untitled UI has no fork-knife, coffee, glass, hanger or footprints icon,
// so category icons come from Lucide (same line style).
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  bar: Wine,
  shop: ShoppingBag,
  thrift: Shirt,
  gallery: Frame,
  museum: Landmark,
  walk: Footprints,
  viewpoint: Eye,
  local: Star,
  hotel: BedDouble,
}
