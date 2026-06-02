'use client';

import { useCallback, useState } from 'react';
import { ColorData, DesignMode, MutationStrength, OklchColor, SlidersState, UserIdentity, Preset } from '../types';
import { mutateColor, applySliders, NEUTRAL_SLIDERS, generateFromIdentity } from '../lib/variation';
import { createColorFromHex, createColorFromOklch, hexToOklch } from '../lib/color-spaces';
import { generateColorName } from '../lib/naming';
import { roleForIndex, moveColor, createPaletteFromPresetNative, createPaletteFromPreset, MAX_PALETTE_SIZE } from '../lib/palette';
import { generateHarmony } from '../lib/harmony';
import { normalizeHexDraft, updateOklchForColor } from './mutationHelpers';

type PresetSizingMode = 'native' | 'current';

export function useColorMutations(
  colors: ColorData[],
  setColors: React.Dispatch<React.SetStateAction<ColorData[]>>,
  activeColorId: string | null,
  setActiveColorId: React.Dispatch<React.SetStateAction<string | null>>,
  activeColor: ColorData | null,
  mode: DesignMode,
  setMode: React.Dispatch<React.SetStateAction<DesignMode>>,
  sliders: SlidersState,
  setSliders: React.Dispatch<React.SetStateAction<SlidersState>>,
  identity: UserIdentity,
  paletteSize: number,
  setPaletteSize: React.Dispatch<React.SetStateAction<number>>,
  paletteName: string,
  setPaletteName: React.Dispatch<React.SetStateAction<string>>,
  viewMode: string,
  pushHistory: (newColors: ColorData[]) => void,
  updateColorsAndPushHistory: (newColors: ColorData[]) => void,
  setColorsKeepingActive: (newColors: ColorData[]) => void,
) {
  const [activeHarmonyId, setActiveHarmonyId] = useState<string>('material');
  const [mutationStrength, setMutationStrength] = useState<MutationStrength>('balanced');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartColors, setDragStartColors] = useState<ColorData[] | null>(null);
  const [localOklch, setLocalOklch] = useState<OklchColor | null>(null);
  const [hexDrafts, setHexDrafts] = useState<Record<string, string>>({});
  const [addColorDraft, setAddColorDraft] = useState('');
  const [addColorInvalid, setAddColorInvalid] = useState(false);
  const [slidersTarget, setSlidersTarget] = useState<'all' | 'selected'>('all');
  const [harmonyBaseColorId, setHarmonyBaseColorId] = useState<string | null>(null);

  const handleDeleteColor = useCallback((id: string) => {
    const nextColors = colors.filter((c) => c.id !== id);
    setPaletteSize(nextColors.length);
    setColorsKeepingActive(nextColors);
    if (harmonyBaseColorId === id) setHarmonyBaseColorId(nextColors[0]?.id ?? null);
    pushHistory(nextColors);
  }, [colors, harmonyBaseColorId, pushHistory, setColorsKeepingActive, setPaletteSize]);

  const handleAddColor = useCallback((hexOverride?: string) => {
    if (colors.length >= MAX_PALETTE_SIZE) return;
    const normalizedHex = hexOverride ? normalizeHexDraft(hexOverride) : null;
    const baseColor = activeColor || colors[colors.length - 1];
    const newColor = normalizedHex
      ? createColorFromHex(normalizedHex, generateColorName(hexToOklch(normalizedHex)))
      : baseColor ? mutateColor(baseColor, 'subtle') : createColorFromHex('#d6cec1', 'Bone Dust');
    newColor.id = `color-${Date.now()}`;
    newColor.locked = false;
    newColor.role = roleForIndex(mode, colors.length);
    const nextColors = [...colors, newColor];
    setPaletteSize(nextColors.length);
    setColorsKeepingActive(nextColors);
    setActiveColorId(newColor.id);
    setAddColorDraft('');
    setAddColorInvalid(false);
    pushHistory(nextColors);
  }, [colors, activeColor, mode, pushHistory, setColorsKeepingActive, setActiveColorId, setPaletteSize]);

  const commitAddColorDraft = useCallback(() => {
    if (!addColorDraft.trim()) {
      setAddColorInvalid(false);
      return;
    }
    const nextHex = normalizeHexDraft(addColorDraft);
    if (!nextHex) {
      setAddColorInvalid(true);
      return;
    }
    handleAddColor(nextHex);
  }, [addColorDraft, handleAddColor]);

  const handlePasteAddColor = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const nextHex = normalizeHexDraft(text);
      if (!nextHex) {
        setAddColorDraft(text.trim().toUpperCase());
        setAddColorInvalid(true);
      } else {
        handleAddColor(nextHex);
      }
    } catch {
      setAddColorInvalid(true);
    }
  }, [handleAddColor]);

  const handleGenerateHarmony = useCallback(() => {
    const seedColor = colors.find((c) => c.id === harmonyBaseColorId) || activeColor || colors[0];
    if (!seedColor) return;
    const generatedOklchs = generateHarmony(seedColor.oklch, activeHarmonyId, identity.chroma / 50);
    const nextColors = colors.map((color, index) => {
      if (color.locked) return color;
      const oklch = generatedOklchs[index % generatedOklchs.length];
      const nextColor = createColorFromOklch(oklch, generateColorName(oklch));
      nextColor.id = color.id; nextColor.role = color.role; nextColor.locked = false;
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
      nextColor.id = color.id; nextColor.role = color.role; nextColor.locked = false;
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

  const handleIdentitySliderChange = useCallback((newIdentity: UserIdentity) => {
    const generated = generateFromIdentity(newIdentity, paletteSize);
    setPaletteName('Identity Preset');
    const nextColors = colors.map((color, index) => {
      if (color.locked) return color;
      const nextColor = generated[index % generated.length];
      nextColor.id = color.id; nextColor.role = color.role; nextColor.locked = color.locked;
      return nextColor;
    });
    setSliders(NEUTRAL_SLIDERS);
    setColors(nextColors);
  }, [colors, paletteSize, setPaletteName, setColors, setSliders]);

  const handleIdentityInteractionEnd = useCallback(() => pushHistory(colors), [colors, pushHistory]);

  const handleColorWheelChange = useCallback((newOklch: OklchColor) => {
    if (!activeColor) return;
    setLocalOklch(newOklch);
    setColors(updateOklchForColor(colors, activeColor.id, newOklch, viewMode, harmonyBaseColorId, activeHarmonyId, identity.chroma));
  }, [colors, viewMode, harmonyBaseColorId, activeHarmonyId, identity.chroma, activeColor, setColors]);

  const handleIndividualColorOklchChange = useCallback((id: string, newOklch: OklchColor) => {
    setColors(updateOklchForColor(colors, id, newOklch, viewMode, harmonyBaseColorId, activeHarmonyId, identity.chroma));
  }, [colors, viewMode, harmonyBaseColorId, activeHarmonyId, identity.chroma, setColors]);

  const handleSliderChange = useCallback((key: keyof SlidersState, value: number) => {
    const nextSliders = { ...sliders, [key]: value };
    setSliders(nextSliders);
    setColors(applySliders(colors, nextSliders, slidersTarget === 'selected' ? activeColorId : null));
  }, [sliders, colors, slidersTarget, activeColorId, setSliders, setColors]);

  const handlePresetSelect = useCallback((preset: Preset, sizing: PresetSizingMode = 'native') => {
    const nextMode = preset.mode ?? mode;
    const nextColors = sizing === 'native'
      ? createPaletteFromPresetNative(preset, mode, colors)
      : createPaletteFromPreset(preset, paletteSize, nextMode, colors);
    if (preset.mode) {
      setMode(preset.mode);
      localStorage.setItem('cran3o_mode', preset.mode);
    }
    setPaletteName(preset.name);
    setSliders(NEUTRAL_SLIDERS);
    setPaletteSize(nextColors.length);
    updateColorsAndPushHistory(nextColors);
    setActiveColorId(nextColors[Math.min(4, nextColors.length - 1)]?.id ?? null);
    setHarmonyBaseColorId(nextColors[0]?.id ?? null);
  }, [paletteSize, mode, colors, updateColorsAndPushHistory, setMode, setPaletteName, setSliders, setPaletteSize, setActiveColorId]);

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
    nextColor.id = current.id; nextColor.role = current.role; nextColor.locked = current.locked;
    setLocalOklch(nextColor.oklch);
    updateColorsAndPushHistory(colors.map((c) => c.id === id ? nextColor : c));
  }, [colors, hexDrafts, updateColorsAndPushHistory]);

  const handleMoveColor = useCallback((fromIndex: number, toIndex: number) => {
    updateColorsAndPushHistory(moveColor(colors, fromIndex, toIndex));
  }, [colors, updateColorsAndPushHistory]);

  const handlePreviewMoveColor = useCallback((targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setColors((currentColors) => {
      const fromIndex = currentColors.findIndex((c) => c.id === draggingId);
      const toIndex = currentColors.findIndex((c) => c.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return currentColors;
      return moveColor(currentColors, fromIndex, toIndex);
    });
  }, [draggingId, setColors]);

  const finishDragReorder = useCallback(() => {
    if (draggingId && dragStartColors) pushHistory(colors);
    setDraggingId(null);
    setDragStartColors(null);
  }, [draggingId, dragStartColors, colors, pushHistory]);

  const handleHarmonyBaseClick = useCallback((color: ColorData) => {
    setHarmonyBaseColorId(color.id);
    const generatedOklchs = generateHarmony(color.oklch, activeHarmonyId, identity.chroma / 50);
    const nextColors = colors.map((col, idx) => {
      if (col.id === color.id) return col;
      if (col.locked) return col;
      const oklch = generatedOklchs[idx % generatedOklchs.length];
      const nextColor = createColorFromOklch(oklch, generateColorName(oklch));
      nextColor.id = col.id; nextColor.role = col.role; nextColor.locked = false;
      return nextColor;
    });
    updateColorsAndPushHistory(nextColors);
  }, [colors, activeHarmonyId, identity.chroma, updateColorsAndPushHistory]);

  return {
    activeHarmonyId,
    setActiveHarmonyId,
    mutationStrength,
    setMutationStrength,
    draggingId,
    setDraggingId,
    dragStartColors,
    setDragStartColors,
    localOklch,
    setLocalOklch,
    hexDrafts,
    setHexDrafts,
    addColorDraft,
    setAddColorDraft,
    addColorInvalid,
    setAddColorInvalid,
    slidersTarget,
    setSlidersTarget,
    harmonyBaseColorId,
    setHarmonyBaseColorId,
    handleDeleteColor,
    handleAddColor,
    commitAddColorDraft,
    handlePasteAddColor,
    handleGenerateHarmony,
    handleHarmonyChange,
    handleRefinePalette,
    handleMutatePalette,
    handleIdentitySliderChange,
    handleIdentityInteractionEnd,
    handleColorWheelChange,
    handleIndividualColorOklchChange,
    handleSliderChange,
    handlePresetSelect,
    handleToggleLock,
    handleRenameColor,
    handleHexDraftChange,
    commitHexChange,
    handleMoveColor,
    handlePreviewMoveColor,
    finishDragReorder,
    handleHarmonyBaseClick,
  };
}
