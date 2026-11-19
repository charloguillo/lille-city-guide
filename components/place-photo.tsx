"use client"

import Image from "next/image"
import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Photo of a place. Always in color (Charles prefers it).
 * If the remote image fails to load, shows `fallback` (or nothing).
 */
export function PlacePhoto({
  src,
  alt,
  sizes,
  className,
  priority,
  fallback = null,
  caption,
}: {
  src: string
  alt: string
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
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
      {caption}
    </>
  )
}
