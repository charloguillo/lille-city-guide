"use client"

import Image from "next/image"
import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Photo of a place. Black and white when the map is in "Noir et blanc" mode.
 * If the remote image fails to load, shows `fallback` (or nothing).
 */
export function PlacePhoto({
  src,
  alt,
  mono,
  sizes,
  className,
  priority,
  fallback = null,
  caption,
}: {
  src: string
  alt: string
  mono: boolean
  sizes: string
  className?: string
  priority?: boolean
  fallback?: ReactNode
  caption?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (failed) return fallback
  return (
    <>
      <div className={cn("relative overflow-hidden bg-stone-100", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          className={cn(
            "object-cover transition-[opacity,filter] duration-300 ease-out",
            mono && "contrast-[1.05] grayscale",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
      {caption}
    </>
  )
}
