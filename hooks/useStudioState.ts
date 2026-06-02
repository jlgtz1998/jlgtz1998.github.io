'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ColorData,
  DesignMode,
  SlidersState,
} from '../types';
import { PRESETS } from '../data/presets';
import { TRANSLATIONS } from '../data/translations';
import { INFLUENCES } from '../data/influences';
import { HARMONIES } from '../lib/harmony';
import {
  oklchToHex,
  isColorInGamut,
} from '../lib/color-spaces';
import { NEUTRAL_SLIDERS } from '../lib/variation';
import { checkApca, checkWcag } from '../lib/accessibility';
import {
  createPaletteFromPreset,
  DEFAULT_PALETTE_SIZE,
  MAX_PALETTE_SIZE,
} from '../lib/palette';

import { useIdentity } from './useIdentity';
import { usePanelState } from './usePanelState';
import { useColorHistory } from './useColorHistory';
import { useColorMutations } from './useColorMutations';
import { useExportActions } from './useExportActions';
import { normalizeHexDraft } from './mutationHelpers';

const STORAGE_KEYS = {
  mode: 'cran3o_mode',
  paletteSize: 'cran3o_palette_size',
  pickerShape: 'cran3o_picker_shape_v2',
  viewMode: 'cran3o_view_mode',
} as const;

type VisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
type PickerShape = 'wheel' | 'plane_lc' | 'plane_hc';
type WorkspaceView = 'instrument' | 'harmony' | 'explore';

function getInitialLang(): 'en' | 'es' {
  if (typeof window === 'undefined') return 'en';
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang === 'en' || urlLang === 'es') return urlLang;
  const saved = localStorage.getItem('cran3o_color_studio_lang') as 'en' | 'es' | null;
  if (saved === 'en' || saved === 'es') return saved;
  return 'en';
}

export function useStudioState() {
  // ── State ──────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<DesignMode>('architecture');
  const [colors, setColors] = useState<ColorData[]>([]);
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const [sliders, setSliders] = useState<SlidersState>(NEUTRAL_SLIDERS);
  const [blindnessSim, setBlindnessSim] = useState<VisionMode>('normal');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [paletteName, setPaletteName] = useState<string>('CRAN3O Spec');
  const [paletteSize, setPaletteSize] = useState(DEFAULT_PALETTE_SIZE);
  const [pickerShape, setPickerShape] = useState<PickerShape>('wheel');
  const [viewMode, setViewMode] = useState<WorkspaceView>('instrument');
  const [lang, setLang] = useState<'en' | 'es'>(getInitialLang);

  // ── Sub-hooks Composition ──────────────────────────────────────────
  const { identity } = useIdentity(mounted);

  const panels = usePanelState();

  const historyHook = useColorHistory(
    colors,
    setColors,
    setSliders,
    activeColorId,
    setActiveColorId,
  );

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

  // ── Translation helpers ────────────────────────────────────────────
  const t = useCallback(
    (key: keyof typeof TRANSLATIONS['en']) => {
      return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key];
    },
    [lang],
  );

  const getTooltipText = useCallback(
    (whatKey: keyof typeof TRANSLATIONS['en'], howKey: keyof typeof TRANSLATIONS['en']) => {
      const qWhat = lang === 'es' ? '¿Qué es?' : 'What is it?';
      const qHow = lang === 'es' ? '¿Cómo funciona?' : 'How does it work?';
      return `${qWhat}\n${t(whatKey)}\n\n${qHow}\n${t(howKey)}`;
    },
    [lang, t],
  );

  const getTranslatedModeName = useCallback(
    (m: DesignMode) => {
      if (m === 'graphic') return t('graphicDesign');
      if (m === 'spec') return t('modeSpec');
      const key = m as keyof typeof TRANSLATIONS['en'];
      return t(key) || INFLUENCES[m].name;
    },
    [t],
  );

  const mutations = useColorMutations(
    colors,
    setColors,
    activeColorId,
    setActiveColorId,
    activeColor,
    mode,
    setMode,
    sliders,
    setSliders,
    identity,
    paletteSize,
    setPaletteSize,
    paletteName,
    setPaletteName,
    viewMode,
    historyHook.pushHistory,
    historyHook.updateColorsAndPushHistory,
    setColorsKeepingActive,
  );

  const {
    activeHarmonyId,
    mutationStrength,
    draggingId,
    dragStartColors,
    localOklch,
    setLocalOklch,
    hexDrafts,
    setHexDrafts,
    addColorDraft,
    addColorInvalid,
    slidersTarget,
    harmonyBaseColorId,
  } = mutations;

  const exports = useExportActions(
    colors,
    paletteName,
    mode,
    lang,
    isDarkMode,
    getTranslatedModeName,
    paletteSize,
  );

  // ── Effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('cran3o_color_studio_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // Initial load
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swPath = window.location.pathname.endsWith('/')
        ? window.location.pathname + 'sw.js'
        : window.location.pathname + '/sw.js';
      const normalizedPath = swPath.replace(/\/+/g, '/');
      navigator.serviceWorker.register(normalizedPath).catch(() => undefined);
    }

    const savedMode = localStorage.getItem(STORAGE_KEYS.mode) as DesignMode | null;
    const savedSizeRaw = localStorage.getItem(STORAGE_KEYS.paletteSize);
    const savedSize = savedSizeRaw ? Number(savedSizeRaw) : Number.NaN;
    const initialMode = savedMode || 'architecture';
    const initialSize = Number.isFinite(savedSize)
      ? Math.max(0, Math.min(MAX_PALETTE_SIZE, savedSize))
      : DEFAULT_PALETTE_SIZE;

    const savedShape = localStorage.getItem(STORAGE_KEYS.pickerShape) as PickerShape | null;
    const savedViewMode = localStorage.getItem(STORAGE_KEYS.viewMode) as WorkspaceView | null;
    let urlLayout: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      urlLayout = params.get('layout');
    }

    const defaultPreset = PRESETS[0];
    const initialColors = createPaletteFromPreset(defaultPreset, initialSize, initialMode);

    queueMicrotask(() => {
      setMode(initialMode);
      setPaletteSize(initialSize);

      if (savedShape === 'wheel' || savedShape === 'plane_lc' || savedShape === 'plane_hc') {
        setPickerShape(savedShape);
      }

      if (savedViewMode === 'instrument' || savedViewMode === 'harmony' || savedViewMode === 'explore') {
        setViewMode(savedViewMode);
      }

      if (urlLayout === 'instrument') {
        setViewMode('instrument');
      } else if (urlLayout === 'harmony' || urlLayout === 'adobe') {
        setViewMode('harmony');
      } else if (urlLayout === 'explore') {
        setViewMode('explore');
      }

      setColors(initialColors);
      historyHook.setHistory([initialColors]);
      historyHook.setHistoryIndex(0);
      setActiveColorId(initialColors[Math.min(4, initialColors.length - 1)]?.id ?? null);
      mutations.setHarmonyBaseColorId(initialColors[0]?.id ?? null);
      setMounted(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Persist
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEYS.paletteSize, String(paletteSize));
  }, [paletteSize, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEYS.pickerShape, pickerShape);
  }, [pickerShape, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
  }, [viewMode, mounted]);

  useEffect(() => {
    setHexDrafts(() => {
      const next: Record<string, string> = {};
      colors.forEach((color) => {
        next[color.id] = color.hex.toUpperCase();
      });
      return next;
    });
  }, [colors, setHexDrafts]);

  useEffect(() => {
    if (activeColor) {
      const localHex = localOklch ? oklchToHex(localOklch) : '';
      if (localHex !== activeColor.hex) {
        setLocalOklch(activeColor.oklch);
      }
    } else {
      setLocalOklch(null);
    }
  }, [activeColor, localOklch, setLocalOklch]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleModeChange = useCallback(
    (newMode: DesignMode) => {
      setMode(newMode);
      localStorage.setItem(STORAGE_KEYS.mode, newMode);
      panels.setSettingsOpen(false);
      panels.setExportOpen(false);
      panels.setContrastOpen(false);
      panels.setPresetsOpen(false);
    },
    [panels],
  );

  return {
    // Basic state
    mounted,
    mode,
    colors,
    activeColorId,
    activeHarmonyId,
    sliders,
    identity,
    mutationStrength,
    blindnessSim,
    isDarkMode,
    paletteName,
    paletteSize,
    copied: exports.copied,
    settingsOpen: panels.settingsOpen,
    exportOpen: panels.exportOpen,
    presetsOpen: panels.presetsOpen,
    contrastOpen: panels.contrastOpen,
    identityOpen: panels.identityOpen,
    draggingId,
    dragStartColors,
    hoveredColorId: activeColorId,
    copiedColorId: exports.copiedColorId,
    historyIndex: historyHook.historyIndex,
    localOklch,
    hexDrafts,
    addColorDraft,
    addColorInvalid,
    slidersOpen: panels.slidersOpen,
    pickerShape,
    slidersTarget,
    helpOpen: panels.helpOpen,
    viewMode,
    harmonyBaseColorId,
    lang,

    // Computed
    activeColor,
    contrastColors,

    // Translation
    t,
    getTooltipText,
    getTranslatedModeName,

    // Setters (for UI toggles)
    setActiveColorId,
    setHoveredColorId: setActiveColorId,
    setDraggingId: mutations.setDraggingId,
    setDragStartColors: mutations.setDragStartColors,
    setPickerShape,
    setViewMode,
    setSlidersOpen: panels.setSlidersOpen,
    setIdentityOpen: panels.setIdentityOpen,
    setHelpOpen: panels.setHelpOpen,
    setSettingsOpen: panels.setSettingsOpen,
    setExportOpen: panels.setExportOpen,
    setPresetsOpen: panels.setPresetsOpen,
    setContrastOpen: panels.setContrastOpen,
    setLang,
    setIsDarkMode,
    setBlindnessSim,
    setPaletteSize,
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
