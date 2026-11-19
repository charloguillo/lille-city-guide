"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, type ReactNode } from "react"
import { XClose } from "@untitledui/icons"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  /** false = no scrim: the map behind stays usable (pan, zoom, tap pins). */
  modal?: boolean
  children: ReactNode
}

/** Sheet that slides up from the bottom. The map stays visible above it. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  modal = true,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {modal && (
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-stone-950/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={onClose}
            />
          )}
          <motion.div
            key="sheet"
            role="dialog"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80svh] max-w-lg overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 shadow-[0_-8px_32px_rgb(0_0_0/0.08)] ring-1 ring-stone-200"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose()
            }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-300" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
            >
              <XClose className="size-5" />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
