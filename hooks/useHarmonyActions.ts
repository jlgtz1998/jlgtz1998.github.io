'use client';

import { useCallback, useState } from 'react';
import { ColorData, DesignMode, MutationStrength, SlidersState, UserIdentity } from '../types';
import { generatePaletteHarmony } from '../lib/palette';
import { mutateColor, NEUTRAL_SLIDERS } from '../lib/variation';

export function useHarmonyActions(
  colors: ColorData[],
  activeColor: ColorData | null,
  identity: UserIdentity,
  mode: DesignMode,
  setSliders: React.Dispatch<React.SetStateAction<SlidersState>>,
  updateColorsAndPushHistory: (newColors: ColorData[]) => void,
) {
  const [activeHarmonyId, setActiveHarmonyId] = useState<string>('material');
  const [harmonyBaseColorId, setHarmonyBaseColorId] = useState<string | null>(null);
  const [mutationStrength, setMutationStrength] = useState<MutationStrength>('balanced');

  const handleGenerateHarmony = useCallback(() => {
    const seedColor = colors.find((c) => c.id === harmonyBaseColorId) || activeColor || colors[0];
    if (!seedColor) return;
    const nextColors = generatePaletteHarmony(colors, seedColor, activeHarmonyId, mode, identity.chroma / 50);
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, harmonyBaseColorId, activeHarmonyId, identity.chroma, activeColor, mode, updateColorsAndPushHistory, setSliders]);

  const handleHarmonyChange = useCallback((harmonyId: string) => {
    setActiveHarmonyId(harmonyId);
    const seedColor = colors.find((c) => c.id === harmonyBaseColorId) || activeColor || colors[0];
    if (!seedColor) return;
    const nextColors = generatePaletteHarmony(colors, seedColor, harmonyId, mode, identity.chroma / 50);
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, harmonyBaseColorId, identity.chroma, activeColor, mode, updateColorsAndPushHistory, setSliders]);

  const handleRefinePalette = useCallback(() => {
    const nextColors = colors.map((c) => c.locked ? c : mutateColor(c, 'subtle'));
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, updateColorsAndPushHistory, setSliders]);

  const handleMutatePalette = useCallback(() => {
    const nextColors = colors.map((c) => c.locked ? c : mutateColor(c, mutationStrength));
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, mutationStrength, updateColorsAndPushHistory, setSliders]);

  const handleHarmonyBaseClick = useCallback((color: ColorData) => {
    setHarmonyBaseColorId(color.id);
    const nextColors = generatePaletteHarmony(colors, color, activeHarmonyId, mode, identity.chroma / 50);
    updateColorsAndPushHistory(nextColors);
  }, [colors, activeHarmonyId, identity.chroma, mode, updateColorsAndPushHistory]);

  return {
    activeHarmonyId,
    setActiveHarmonyId,
    harmonyBaseColorId,
    setHarmonyBaseColorId,
    mutationStrength,
    setMutationStrength,
    handleGenerateHarmony,
    handleHarmonyChange,
    handleRefinePalette,
    handleMutatePalette,
    handleHarmonyBaseClick,
  };
}
