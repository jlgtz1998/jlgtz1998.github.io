'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorData, DesignMode, SlidersState } from '../types';
import { PRESETS } from '../data/presets';
import { HARMONIES } from '../lib/harmony';
import { isColorInGamut, oklchToHex } from '../lib/color-spaces';
import { NEUTRAL_SLIDERS } from '../lib/variation';
import { checkApca, checkWcag } from '../lib/accessibility';
import { normalizeHexDraft } from './mutationHelpers';
import { MAX_PALETTE_SIZE } from '../lib/palette';

import { useIdentity } from './useIdentity';
import { usePanelState } from './usePanelState';
import { useColorHistory } from './useColorHistory';
import { useColorMutations } from './useColorMutations';
import { useExportActions } from './useExportActions';
import { useStudioEnvironment } from './useStudioEnvironment';

type VisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export function useStudioState() {
  // ── Core States ────────────────────────────────────────────────────
  const [colors, setColors] = useState<ColorData[]>([]);
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const [harmonyBaseColorId, setHarmonyBaseColorId] = useState<string | null>(null);
  const [sliders, setSliders] = useState<SlidersState>(NEUTRAL_SLIDERS);
  const [blindnessSim, setBlindnessSim] = useState<VisionMode>('normal');

  // ── Sub-hooks Composition ──────────────────────────────────────────
  const historyHook = useColorHistory(
    colors,
    setColors,
    setSliders,
    activeColorId,
    setActiveColorId,
  );

  const env = useStudioEnvironment(
    setColors,
    historyHook.setHistory,
    historyHook.setHistoryIndex,
    setActiveColorId,
    setHarmonyBaseColorId,
  );

  const { identity } = useIdentity(env.mounted);
  const panels = usePanelState();

  const setColorsKeepingActive = useCallback(
    (nextColors: ColorData[]) => {
      setColors(nextColors);
      if (!nextColors.some((color) => color.id === activeColorId)) {
        setActiveColorId(nextColors[nextColors.length - 1]?.id ?? null);
      }
    },
    [activeColorId],
  );

  const activeColor = useMemo(
    () => colors.find((color) => color.id === activeColorId) || colors[0] || null,
    [activeColorId, colors],
  );

  const contrastColors = useMemo(
    () => colors.slice(0, Math.min(colors.length, 8)),
    [colors],
  );

  const mutations = useColorMutations(
    colors,
    setColors,
    activeColorId,
    setActiveColorId,
    activeColor,
    env.mode,
    env.setMode,
    sliders,
    setSliders,
    identity,
    env.paletteSize,
    env.setPaletteSize,
    env.paletteName,
    env.setPaletteName,
    env.viewMode,
    historyHook.pushHistory,
    historyHook.updateColorsAndPushHistory,
    setColorsKeepingActive,
  );

  // Link environment's harmonyBaseColorId setting to mutations hook state
  useEffect(() => {
    if (harmonyBaseColorId !== null) {
      mutations.setHarmonyBaseColorId(harmonyBaseColorId);
    }
  }, [harmonyBaseColorId, mutations]);

  const exports = useExportActions(
    colors,
    env.paletteName,
    env.mode,
    env.lang,
    env.isDarkMode,
    env.getTranslatedModeName,
    env.paletteSize,
  );

  // Hex drafts and local OKLCH sync hooks
  useEffect(() => {
    mutations.setHexDrafts(() => {
      const next: Record<string, string> = {};
      colors.forEach((color) => {
        next[color.id] = color.hex.toUpperCase();
      });
      return next;
    });
  }, [colors, mutations]);

  useEffect(() => {
    if (activeColor) {
      const localHex = mutations.localOklch ? oklchToHex(mutations.localOklch) : '';
      if (localHex !== activeColor.hex) {
        mutations.setLocalOklch(activeColor.oklch);
      }
    } else {
      mutations.setLocalOklch(null);
    }
  }, [activeColor, mutations]);

  // ── Mode Change Handler ────────────────────────────────────────────
  const handleModeChange = useCallback(
    (newMode: DesignMode) => {
      env.setMode(newMode);
      localStorage.setItem('cran3o_mode', newMode);
      panels.setSettingsOpen(false);
      panels.setExportOpen(false);
      panels.setContrastOpen(false);
      panels.setPresetsOpen(false);
    },
    [panels, env],
  );

  return {
    // Basic state from env / panel / history / exports
    mounted: env.mounted,
    mode: env.mode,
    colors,
    activeColorId,
    activeHarmonyId: mutations.activeHarmonyId,
    sliders,
    identity,
    mutationStrength: mutations.mutationStrength,
    blindnessSim,
    isDarkMode: env.isDarkMode,
    paletteName: env.paletteName,
    paletteSize: env.paletteSize,
    copied: exports.copied,
    settingsOpen: panels.settingsOpen,
    exportOpen: panels.exportOpen,
    presetsOpen: panels.presetsOpen,
    contrastOpen: panels.contrastOpen,
    identityOpen: panels.identityOpen,
    draggingId: mutations.draggingId,
    dragStartColors: mutations.dragStartColors,
    hoveredColorId: activeColorId,
    copiedColorId: exports.copiedColorId,
    historyIndex: historyHook.historyIndex,
    localOklch: mutations.localOklch,
    hexDrafts: mutations.hexDrafts,
    addColorDraft: mutations.addColorDraft,
    addColorInvalid: mutations.addColorInvalid,
    slidersOpen: panels.slidersOpen,
    pickerShape: env.pickerShape,
    slidersTarget: mutations.slidersTarget,
    helpOpen: panels.helpOpen,
    viewMode: env.viewMode,
    harmonyBaseColorId: mutations.harmonyBaseColorId,
    lang: env.lang,

    // Computed
    activeColor,
    contrastColors,

    // Translation from environment
    t: env.t,
    getTooltipText: env.getTooltipText,
    getTranslatedModeName: env.getTranslatedModeName,

    // Setters (for UI toggles)
    setActiveColorId,
    setHoveredColorId: setActiveColorId,
    setDraggingId: mutations.setDraggingId,
    setDragStartColors: mutations.setDragStartColors,
    setPickerShape: env.setPickerShape,
    setViewMode: env.setViewMode,
    setSlidersOpen: panels.setSlidersOpen,
    setIdentityOpen: panels.setIdentityOpen,
    setHelpOpen: panels.setHelpOpen,
    setSettingsOpen: panels.setSettingsOpen,
    setExportOpen: panels.setExportOpen,
    setPresetsOpen: panels.setPresetsOpen,
    setContrastOpen: panels.setContrastOpen,
    setLang: env.setLang,
    setIsDarkMode: env.setIsDarkMode,
    setBlindnessSim,
    setPaletteSize: env.setPaletteSize,
    setMutationStrength: mutations.setMutationStrength,
    setSlidersTarget: mutations.setSlidersTarget,
    setHarmonyBaseColorId: mutations.setHarmonyBaseColorId,
    setAddColorDraft: mutations.setAddColorDraft,
    setAddColorInvalid: mutations.setAddColorInvalid,
    setHexDrafts: mutations.setHexDrafts,
    setLocalOklch: mutations.setLocalOklch,

    // Handlers
    handleModeChange,
    handleDeleteColor: mutations.handleDeleteColor,
    handleAddColor: mutations.handleAddColor,
    commitAddColorDraft: mutations.commitAddColorDraft,
    handlePasteAddColor: mutations.handlePasteAddColor,
    handleGenerateHarmony: mutations.handleGenerateHarmony,
    handleHarmonyChange: mutations.handleHarmonyChange,
    handleRefinePalette: mutations.handleRefinePalette,
    handleMutatePalette: mutations.handleMutatePalette,
    handleIdentitySliderChange: mutations.handleIdentitySliderChange,
    handleIdentityInteractionEnd: mutations.handleIdentityInteractionEnd,
    handleColorWheelChange: mutations.handleColorWheelChange,
    handleIndividualColorOklchChange: mutations.handleIndividualColorOklchChange,
    handleSliderChange: mutations.handleSliderChange,
    handlePresetSelect: mutations.handlePresetSelect,
    handleToggleLock: mutations.handleToggleLock,
    handleRenameColor: mutations.handleRenameColor,
    handleHexDraftChange: mutations.handleHexDraftChange,
    commitHexChange: mutations.commitHexChange,
    handleMoveColor: mutations.handleMoveColor,
    handlePreviewMoveColor: mutations.handlePreviewMoveColor,
    finishDragReorder: mutations.finishDragReorder,
    handleUndo: historyHook.handleUndo,
    handleRedo: historyHook.handleRedo,

    // Export
    handleExportSvg: exports.handleExportSvg,
    handleExportJson: exports.handleExportJson,
    handleExportCss: exports.handleExportCss,
    handleCopyClipboardList: exports.handleCopyClipboardList,
    handleCopySwatchCard: exports.handleCopySwatchCard,
    handleExportPng: exports.handleExportPng,
    handlePrintPdf: exports.handlePrintPdf,
    handleHarmonyBaseClick: mutations.handleHarmonyBaseClick,

    // Utilities exposed to UI
    isColorInGamut,
    HARMONIES,
    PRESETS,
    MAX_PALETTE_SIZE,
    normalizeHexDraft,
    checkWcag,
    checkApca,
  };
}
