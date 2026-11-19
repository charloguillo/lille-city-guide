# Lille City Guide — brief for agents

## Vision
A personal, mobile-first web app for a 3-day weekend in Lille. A premium black-and-white map of the places Charles likes (cafés, restaurants, museums, shops, thrift stores, walks...). Two users: Charles and Myrtille. They see the same "à faire" and "fait" flags on their own phones.
Charles is not technical. He prompts changes from his phone. Each change = a branch, a PR, a Vercel preview. Keep changes small and ship them.

## How Charles works (read first)
- Write to him in French, short simple sentences. Never ask him for code review.
- When he approves a plan, do all steps (merge and prod deploy included). Ask only on surprise, failure, or a new product decision.
- Adding or editing places = edit `data/places.json` only. No in-app add form.

## Stack
- Next.js (App Router) + TypeScript, created from the Fluid Functionalism starter (shadcn CLI, Base UI flavor).
- UI: Fluid Functionalism components in `components/ui`. Add more with `npx shadcn@latest add @fluid/base/<name>`. Do not hand-write a component that Fluid already has.
- Map: MapLibre GL JS + OpenFreeMap vector tiles (`https://tiles.openfreemap.org/styles/positron`). Free, no API key. Not Google Maps (needs billing account + key).
- Shared flags: Upstash Redis (Vercel Marketplace integration, Pay As You Go plan; connected to the Vercel project on 2026-11-19). Env vars `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) are injected by Vercel.
- PWA: web manifest + small service worker (app shell + places JSON). Install to home screen.
- Hosting: Vercel, linked to the GitHub repo `charloguillo/lille-city-guide`. Every PR gets a preview URL. `main` = production.
- Checks: `npm run lint` and `npm run typecheck` (tsc --noEmit). Plus one small Vitest file for pure logic (distance sort, filters). No E2E.

## Architecture
```
data/places.json          Source of truth for places (edited by Claude, committed)
lib/places.ts             Types, category labels (FR) + icons, filters
lib/geo.ts                Haversine distance, sort by proximity
lib/flags.ts              Client store for flags: localStorage cache + sync with /api/flags
app/api/flags/route.ts    GET all flags, POST { id, mustDo?, done? } -> Redis hash "flags"
app/page.tsx              App shell: MapView or ListView + filter bar + bottom tabs
components/map-view.tsx   MapLibre map, "Heatmap" (heatmap layer) / "Places" (pins) toggle
components/list-view.tsx  List sorted by distance from the user's position
components/place-sheet.tsx Bottom sheet: name, category, why, tags, À faire / Fait / Y aller
public/manifest.webmanifest, public/sw.js
```
Place shape:
`{ id (stable kebab slug, never change), name, category, address, lat, lng, why (FR), source_url, tags[], hours?, route?: [lat,lng][], photo_url?, photo_credit?, diet?: "meat"|"veggie"|"unknown" (restaurants only) }`
Categories: cafe, restaurant, bar, shop, gallery, museum, thrift, walk, viewpoint, local.

Flags shape (Redis hash `flags`, field = place id): `{ mustDo: boolean, done: boolean, updatedAt: number }`. Last write wins per place. The client polls every ~20 s and on window focus. Optimistic UI: write local first, then POST; retry when back online.

## Core flows
1. Open app -> full-screen map in "Heatmap" mode. Toggle to "Places" to see pins.
2. Category chips on top (multi-select). Restaurant chip shows a diet sub-filter: Carné / Végé / Inconnu.
3. Toggle "Masquer les lieux faits" (on by default).
4. Tap a pin -> bottom sheet. Buttons: "À faire" (must do), "Fait" (done), "Y aller" (opens Apple Plans / Google Maps directions).
5. Tab "Liste" -> same filters, sorted by distance from the user's GPS position (fallback: Grand Place).
6. Walks show their route as a line in "Places" mode.
7. Settings menu (gear icon, top right, opens a sheet): map style "Noir et blanc" (OpenFreeMap positron, default) / "Couleur" (OpenFreeMap liberty). Built so more modes can be added later (dark, etc.). Choice saved in localStorage.

## Art direction
- Premium, calm, black and white. No teal: remove the starter accent. Accent = black (light theme).
- Grays: Tailwind `stone` (warm gray with a hint of yellow).
- Map: OpenFreeMap "positron" style (light gray) by default; "liberty" in color mode (settings).
- Pins: round markers with a category icon (Untitled UI icons), so the place type reads at a glance (fork-knife = restaurant, coffee = café, glass = bar, bag = shop, hanger = thrift, frame = gallery, building = museum, footprints = walk, eye = viewpoint, star = local). Must do = black fill + white icon. Others = white fill + stone icon + thin border.
- Heatmap ramp in stone/black, never rainbow.
- Fonts: Inter (body, opsz axis) + Plus Jakarta Sans for headings (see starter instructions).
- Motion: short and smooth (150–300 ms), ease-out. Sheet slides up, pins fade/scale in, Heatmap/Places crossfade. Respect `prefers-reduced-motion` (FluidProvider already does).
- Light theme only in v1. Dark theme is in docs/FRIDGE.md.
- UI language: French.

## Conventions
- Small PRs, one feature each. Title in French is fine. Fill the PR body with what changed in plain words.
- Mobile first: test at 390x844. Tap targets >= 44 px. Safe-area insets for the bottom tabs.
- No secrets in the repo. Env vars live in Vercel.

## Gotchas
- MapLibre needs `"use client"` and a dynamic import (no SSR). Import `maplibre-gl/dist/maplibre-gl.css`.
- The cloud sandbox must use the "lille-city-guide" environment: it allows fluidfunctionalism.com, Google Fonts and tiles.openfreemap.org.
- `npx shadcn add ... --overwrite` is needed in a non-interactive shell.
- Without Redis env vars (local dev), `/api/flags` falls back to an in-memory map, and the client still works from localStorage.
- Place ids are keys in Redis. Renaming an id loses its flags.
- Photos: `photo_url` is a remote image (place's own site, blog, Le Fooding, Office de Tourisme, Wikimedia). Served through next/image, so its host must be in `PHOTO_HOSTS` in `next.config.ts`. Do not use Instagram, Facebook or Google Maps image URLs: they expire. Photos are grayscale in "Noir et blanc" mode. The sandbox server cannot fetch them: set `PHOTOS_UNOPTIMIZED=1` for local screenshots.
