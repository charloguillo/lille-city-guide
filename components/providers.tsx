"use client"

import { useEffect } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { FluidProvider } from "@/lib/fluid-provider"
import { untitleduiIcons } from "@/lib/icons-untitledui"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return (
    // Light theme only in v1.
    <ThemeProvider
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
    >
      <FluidProvider shape="rounded" size="default" icons={untitleduiIcons}>
        {children}
      </FluidProvider>
    </ThemeProvider>
  )
}
