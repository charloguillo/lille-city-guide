"use client"

import { BottomSheet } from "@/components/bottom-sheet"
import { RadioGroup, RadioItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { MAP_STYLES, type MapStyleId } from "@/lib/settings"

interface Props {
  open: boolean
  onClose: () => void
  styleId: MapStyleId
  onStyle: (id: MapStyleId) => void
  hideDone: boolean
  onHideDone: (v: boolean) => void
}

export function SettingsSheet({
  open,
  onClose,
  styleId,
  onStyle,
  hideDone,
  onHideDone,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Réglages">
      <h2 className="text-[20px] font-semibold tracking-tight text-stone-950">
        Réglages
      </h2>
      <h3 className="mt-5 mb-2 text-[12px] font-medium tracking-wide text-stone-500 uppercase">
        Style de carte
      </h3>
      <RadioGroup
        value={styleId}
        onValueChange={(v) => onStyle(v as MapStyleId)}
      >
        {MAP_STYLES.map((s, i) => (
          <RadioItem key={s.id} index={i} value={s.id} label={s.label} />
        ))}
      </RadioGroup>
      <h3 className="mt-6 mb-2 text-[12px] font-medium tracking-wide text-stone-500 uppercase">
        Lieux
      </h3>
      <Switch
        label="Masquer les lieux faits"
        checked={hideDone}
        onToggle={() => onHideDone(!hideDone)}
      />
    </BottomSheet>
  )
}
