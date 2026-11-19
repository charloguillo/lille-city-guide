"use client"

import { useEffect, useState } from "react"

/** useState saved in localStorage. */
export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {}
  }, [key])
  const update = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem(key, JSON.stringify(v))
    } catch {}
  }
  return [value, update]
}
