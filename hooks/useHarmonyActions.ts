'use client';

import { useCallback, useState } from 'react';
import { ColorData, MutationStrength, SlidersState, UserIdentity } from '../types';
import { generateHarmony } from '../lib/harmony';
import { createColorFromOklch } from '../lib/color-spaces';
import { generateColorName } from '../lib/naming';
import { mutateColor, NEUTRAL_SLIDERS } from '../lib/variation';

export function useHarmonyActions(
  colors: ColorData[],
  activeColor: ColorData | null,
  identity: UserIdentity,
  setSliders: React.Dispatch<React.SetStateAction<SlidersState>>,
  updateColorsAndPushHistory: (newColors: ColorData[]) => void,
) {
  const [activeHarmonyId, setActiveHarmonyId] = useState<string>('material');
  const [harmonyBaseColorId, setHarmonyBaseColorId] = useState<string | null>(null);
  const [mutationStrength, setMutationStrength] = useState<MutationStrength>('balanced');

  const handleGenerateHarmony = useCallback(() => {
    const seedColor = colors.find((c) => c.id === harmonyBaseColorId) || activeColor || colors[0];
    if (!seedColor) return;
    const generatedOklchs = generateHarmony(seedColor.oklch, activeHarmonyId, identity.chroma / 50);
    const nextColors = colors.map((color, index) => {
      if (color.locked) return color;
      const oklch = generatedOklchs[index % generatedOklchs.length];
      const nextColor = createColorFromOklch(oklch, generateColorName(oklch));
      nextColor.id = color.id;
      nextColor.role = color.role;
      nextColor.locked = false;
      return nextColor;
    });
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, harmonyBaseColorId, activeHarmonyId, identity.chroma, activeColor, updateColorsAndPushHistory, setSliders]);

  const handleHarmonyChange = useCallback((harmonyId: string) => {
    setActiveHarmonyId(harmonyId);
    const seedColor = colors.find((c) => c.id === harmonyBaseColorId) || activeColor || colors[0];
    if (!seedColor) return;
    const generatedOklchs = generateHarmony(seedColor.oklch, harmonyId, identity.chroma / 50);
    const nextColors = colors.map((color, index) => {
      if (color.locked) return color;
      const oklch = generatedOklchs[index % generatedOklchs.length];
      const nextColor = createColorFromOklch(oklch, generateColorName(oklch));
      nextColor.id = color.id;
      nextColor.role = color.role;
      nextColor.locked = false;
      return nextColor;
    });
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, harmonyBaseColorId, identity.chroma, activeColor, updateColorsAndPushHistory, setSliders]);

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
    const generatedOklchs = generateHarmony(color.oklch, activeHarmonyId, identity.chroma / 50);
    const nextColors = colors.map((col, idx) => {
      if (col.id === color.id) return col;
      if (col.locked) return col;
      const oklch = generatedOklchs[idx % generatedOklchs.length];
      const nextColor = createColorFromOklch(oklch, generateColorName(oklch));
      nextColor.id = col.id;
      nextColor.role = col.role;
      nextColor.locked = false;
      return nextColor;
    });
    updateColorsAndPushHistory(nextColors);
  }, [colors, activeHarmonyId, identity.chroma, updateColorsAndPushHistory]);

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
