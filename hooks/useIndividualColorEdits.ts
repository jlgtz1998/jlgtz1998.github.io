'use client';

import { useCallback, useState } from 'react';
import { ColorData, OklchColor } from '../types';
import { createColorFromHex, hexToOklch } from '../lib/color-spaces';
import { generateColorName } from '../lib/naming';
import { normalizeHexDraft, updateOklchForColor } from './mutationHelpers';

export function useIndividualColorEdits(
  colors: ColorData[],
  setColors: React.Dispatch<React.SetStateAction<ColorData[]>>,
  activeColor: ColorData | null,
  viewMode: string,
  harmonyBaseColorId: string | null,
  activeHarmonyId: string,
  chroma: number,
  updateColorsAndPushHistory: (newColors: ColorData[]) => void,
) {
  const [localOklch, setLocalOklch] = useState<OklchColor | null>(null);
  const [hexDrafts, setHexDrafts] = useState<Record<string, string>>({});

  const handleToggleLock = useCallback((id: string) => {
    updateColorsAndPushHistory(colors.map((c) => c.id === id ? { ...c, locked: !c.locked } : c));
  }, [colors, updateColorsAndPushHistory]);

  const handleRenameColor = useCallback((id: string, newName: string) => {
    setColors(colors.map((c) => c.id === id ? { ...c, displayName: newName } : c));
  }, [colors, setColors]);

  const handleHexDraftChange = useCallback((id: string, value: string) => {
    setHexDrafts((current) => ({ ...current, [id]: value.toUpperCase() }));
  }, []);

  const commitHexChange = useCallback((id: string) => {
    const current = colors.find((c) => c.id === id);
    if (!current) return;
    const nextHex = normalizeHexDraft(hexDrafts[id] ?? current.hex);
    if (!nextHex || nextHex === current.hex) {
      setHexDrafts((drafts) => ({ ...drafts, [id]: current.hex.toUpperCase() }));
      return;
    }
    const nextColor = createColorFromHex(nextHex, generateColorName(hexToOklch(nextHex)));
    nextColor.id = current.id;
    nextColor.role = current.role;
    nextColor.locked = current.locked;
    setLocalOklch(nextColor.oklch);
    updateColorsAndPushHistory(colors.map((c) => c.id === id ? nextColor : c));
  }, [colors, hexDrafts, updateColorsAndPushHistory]);

  const handleColorWheelChange = useCallback((newOklch: OklchColor) => {
    if (!activeColor) return;
    setLocalOklch(newOklch);
    setColors(updateOklchForColor(colors, activeColor.id, newOklch, viewMode, harmonyBaseColorId, activeHarmonyId, chroma));
  }, [colors, viewMode, harmonyBaseColorId, activeHarmonyId, chroma, activeColor, setColors]);

  const handleIndividualColorOklchChange = useCallback((id: string, newOklch: OklchColor) => {
    setColors(updateOklchForColor(colors, id, newOklch, viewMode, harmonyBaseColorId, activeHarmonyId, chroma));
  }, [colors, viewMode, harmonyBaseColorId, activeHarmonyId, chroma, setColors]);

  return {
    localOklch,
    setLocalOklch,
    hexDrafts,
    setHexDrafts,
    handleToggleLock,
    handleRenameColor,
    handleHexDraftChange,
    commitHexChange,
    handleColorWheelChange,
    handleIndividualColorOklchChange,
  };
}
