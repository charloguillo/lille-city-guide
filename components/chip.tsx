import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "relative h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ease-out",
        // 44px tap area
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        active
          ? "bg-stone-950 text-white"
          : "bg-white/95 text-stone-700 ring-1 ring-stone-200 backdrop-blur hover:bg-stone-100",
        className
      )}
      {...props}
    />
  )
}
