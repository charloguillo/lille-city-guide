import { describe, expect, it } from "vitest"
import { distance, formatDistance, GRAND_PLACE, sortByDistance } from "./geo"
import { filterPlaces, type Place } from "./places"

const base = { address: "", why: "", source_url: "", tags: [] }
const resto = (id: string, diet?: Place["diet"]): Place => ({
  ...base,
  id,
  name: id,
  category: "restaurant",
  lat: 50.63,
  lng: 3.06,
  diet,
})

describe("geo", () => {
  it("measures ~1.1 km between Grand Place and Lille-Flandres", () => {
    const d = distance(GRAND_PLACE, { lat: 50.6365, lng: 3.0707 })
    expect(d).toBeGreaterThan(400)
    expect(d).toBeLessThan(600)
  })
  it("sorts nearest first", () => {
    const sorted = sortByDistance(
      [
        { lat: 50.7, lng: 3.1 },
        { lat: 50.637, lng: 3.064 },
      ],
      GRAND_PLACE
    )
    expect(sorted[0].lat).toBe(50.637)
  })
  it("formats distance in French", () => {
    expect(formatDistance(1530)).toBe("1,5 km")
    expect(formatDistance(234)).toBe("230 m")
  })
})

describe("filters", () => {
  const list = [
    resto("a", "meat"),
    resto("b", "veggie"),
    resto("c"),
    { ...resto("d"), category: "bar" as const },
  ]
  it("filters restaurants by diet, missing diet = unknown", () => {
    const r = filterPlaces(
      list,
      { categories: [], diets: ["unknown"], hideDone: false },
      {}
    )
    expect(r.map((p) => p.id)).toEqual(["c", "d"])
  })
  it("hides done places", () => {
    const r = filterPlaces(
      list,
      { categories: ["restaurant"], diets: [], hideDone: true },
      { a: { mustDo: false, done: true, updatedAt: 1 } }
    )
    expect(r.map((p) => p.id)).toEqual(["b", "c"])
  })
})
