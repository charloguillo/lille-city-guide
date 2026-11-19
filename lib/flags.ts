"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import type { Flag, Flags } from "@/lib/places"

const KEY = "lcg:flags"
const PENDING_KEY = "lcg:flags-pending"
const POLL_MS = 20_000

let flags: Flags = {}
let pending: Record<string, Flag> = {}
const listeners = new Set<() => void>()
let loaded = false

function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    flags = JSON.parse(localStorage.getItem(KEY) || "{}")
    pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "{}")
  } catch {
    flags = {}
    pending = {}
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(flags))
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {}
}

function emit() {
  for (const l of listeners) l()
}

function merge(remote: Flags) {
  const next: Flags = { ...flags }
  for (const [id, f] of Object.entries(remote)) {
    const local = next[id]
    if (!local || f.updatedAt > local.updatedAt) next[id] = f
  }
  // Local writes not yet sent win.
  for (const [id, f] of Object.entries(pending)) next[id] = f
  flags = next
  save()
  emit()
}

async function pushPending() {
  for (const [id, f] of Object.entries(pending)) {
    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...f }),
      })
      if (!res.ok) return
      if (pending[id]?.updatedAt === f.updatedAt) delete pending[id]
      save()
    } catch {
      return // offline: retry later
    }
  }
}

export async function syncFlags() {
  await pushPending()
  try {
    const res = await fetch("/api/flags", { cache: "no-store" })
    if (res.ok) merge((await res.json()) as Flags)
  } catch {}
}

export function setFlag(
  id: string,
  patch: Partial<Pick<Flag, "mustDo" | "done">>
) {
  load()
  const cur = flags[id] ?? { mustDo: false, done: false, updatedAt: 0 }
  const next: Flag = { ...cur, ...patch, updatedAt: Date.now() }
  flags = { ...flags, [id]: next }
  pending[id] = next
  save()
  emit()
  void pushPending()
}

function subscribe(l: () => void) {
  load()
  listeners.add(l)
  return () => listeners.delete(l)
}

const EMPTY: Flags = {}

export function useFlags(): Flags {
  const snap = useSyncExternalStore(
    subscribe,
    () => {
      load()
      return flags
    },
    () => EMPTY
  )

  const sync = useCallback(() => void syncFlags(), [])
  useEffect(() => {
    sync()
    const t = setInterval(sync, POLL_MS)
    const onVis = () => document.visibilityState === "visible" && sync()
    window.addEventListener("focus", sync)
    window.addEventListener("online", sync)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", sync)
      window.removeEventListener("online", sync)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [sync])

  return snap
}
