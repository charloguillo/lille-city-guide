import type { NextConfig } from "next"

// Hosts that serve the place photos (data/places.json -> photo_url).
// Add a host here when a new photo comes from a new site.
const PHOTO_HOSTS = [
  "api.cloudly.space",
  "aupetitvieux.fr",
  "bienvenue.cafe",
  "cdn.lefooding.com",
  "contrepoint-lacatholille.fr",
  "itsy-bitsy.onataste.fr",
  "lilleaddict.fr",
  "upload.wikimedia.org",
  "uploads.lebonbon.fr",
  "www.fripe-chic.fr",
  "www.kilo-shop.com",
  "www.lefresnoy.net",
  "www.pariszigzag.fr",
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: PHOTO_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Local sandbox only: the server cannot reach photo hosts.
    unoptimized: process.env.PHOTOS_UNOPTIMIZED === "1",
  },
}

export default nextConfig
