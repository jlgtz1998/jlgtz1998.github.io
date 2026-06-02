'use client';

import { useCallback, useState } from 'react';
import { ColorData, DesignMode, SlidersState, UserIdentity, Preset } from '../types';
import { applySliders, generateFromIdentity, mutateColor, NEUTRAL_SLIDERS } from '../lib/variation';
import { createColorFromHex, hexToOklch } from '../lib/color-spaces';
import { generateColorName } from '../lib/naming';
import { roleForIndex, createPaletteFromPresetNative, createPaletteFromPreset, MAX_PALETTE_SIZE } from '../lib/palette';
import { normalizeHexDraft } from './mutationHelpers';
import { usePaletteReorder } from './usePaletteReorder';
import { useIndividualColorEdits } from './useIndividualColorEdits';
import { useHarmonyActions } from './useHarmonyActions';

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
  const [addColorDraft, setAddColorDraft] = useState('');
  const [addColorInvalid, setAddColorInvalid] = useState(false);
  const [slidersTarget, setSlidersTarget] = useState<'all' | 'selected'>('all');

  const harmonyHook = useHarmonyActions(
    colors,
    activeColor,
    identity,
    mode,
    setSliders,
    updateColorsAndPushHistory,
  );
  const {
    activeHarmonyId,
    setActiveHarmonyId,
    harmonyBaseColorId,
    setHarmonyBaseColorId,
    mutationStrength,
    setMutationStrength,
  } = harmonyHook;

  const reorderHook = usePaletteReorder(colors, setColors, pushHistory);
  const { draggingId, setDraggingId, dragStartColors, setDragStartColors } = reorderHook;

  const editsHook = useIndividualColorEdits(
    colors,
    setColors,
    activeColor,
    viewMode,
    harmonyBaseColorId,
    activeHarmonyId,
    identity.chroma,
    updateColorsAndPushHistory,
  );
  const { localOklch, setLocalOklch, hexDrafts, setHexDrafts } = editsHook;

  const handleDeleteColor = useCallback((id: string) => {
    const nextColors = colors.filter((c) => c.id !== id);
    setPaletteSize(nextColors.length);
    setColorsKeepingActive(nextColors);
    if (harmonyBaseColorId === id) setHarmonyBaseColorId(nextColors[0]?.id ?? null);
    pushHistory(nextColors);
  }, [colors, harmonyBaseColorId, pushHistory, setColorsKeepingActive, setPaletteSize, setHarmonyBaseColorId]);

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

  const handleGenerateHarmony = harmonyHook.handleGenerateHarmony;
  const handleHarmonyChange = harmonyHook.handleHarmonyChange;
  const handleRefinePalette = harmonyHook.handleRefinePalette;
  const handleMutatePalette = harmonyHook.handleMutatePalette;

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

  const handleColorWheelChange = editsHook.handleColorWheelChange;
  const handleIndividualColorOklchChange = editsHook.handleIndividualColorOklchChange;

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
  }, [paletteSize, mode, colors, updateColorsAndPushHistory, setMode, setPaletteName, setSliders, setPaletteSize, setActiveColorId, setHarmonyBaseColorId]);

  const handleToggleLock = editsHook.handleToggleLock;
  const handleRenameColor = editsHook.handleRenameColor;
  const handleHexDraftChange = editsHook.handleHexDraftChange;
  const commitHexChange = editsHook.commitHexChange;

  const handleMoveColor = reorderHook.handleMoveColor;
  const handlePreviewMoveColor = reorderHook.handlePreviewMoveColor;
  const finishDragReorder = reorderHook.finishDragReorder;

  const handleHarmonyBaseClick = harmonyHook.handleHarmonyBaseClick;

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
