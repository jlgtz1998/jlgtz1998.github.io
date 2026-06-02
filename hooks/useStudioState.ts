'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorData,
  DesignMode,
  MutationStrength,
  OklchColor,
  Preset,
  SlidersState,
  UserIdentity,
} from '../types';
import { PRESETS } from '../data/presets';
import { TRANSLATIONS } from '../data/translations';
import { INFLUENCES } from '../data/influences';
import { HARMONIES, generateHarmony } from '../lib/harmony';
import { generateColorName } from '../lib/naming';
import {
  createColorFromHex,
  createColorFromOklch,
  hexToOklch,
  oklchToHex,
  isColorInGamut,
} from '../lib/color-spaces';
import { applySliders, NEUTRAL_SLIDERS, generateFromIdentity, mutateColor } from '../lib/variation';
import { checkApca, checkWcag } from '../lib/accessibility';
import { exportPaletteToSvg } from '../lib/exporters/svg-exporter';
import { printPaletteCatalog } from '../lib/exporters/pdf-exporter';
import {
  createPaletteFromPreset,
  DEFAULT_PALETTE_SIZE,
  MAX_PALETTE_SIZE,
  moveColor,
  roleForIndex,
} from '../lib/palette';

const DEFAULT_IDENTITY: UserIdentity = {
  temperature: 40,
  chroma: 30,
  contrast: 50,
  experimentality: 30,
};

const STORAGE_KEYS = {
  identity: 'cran3o_identity',
  mode: 'cran3o_mode',
  paletteSize: 'cran3o_palette_size',
  pickerShape: 'cran3o_picker_shape_v2',
  viewMode: 'cran3o_view_mode',
} as const;

type VisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
type PickerShape = 'wheel' | 'plane_lc' | 'plane_hc';

function sanitizeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function normalizeHexDraft(value: string): string | null {
  const clean = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return `#${clean.toLowerCase()}`;
}

export function useStudioState() {
  // ── State ──────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<DesignMode>('architecture');
  const [colors, setColors] = useState<ColorData[]>([]);
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const [activeHarmonyId, setActiveHarmonyId] = useState<string>('material');
  const [sliders, setSliders] = useState<SlidersState>(NEUTRAL_SLIDERS);
  const [identity, setIdentity] = useState<UserIdentity>(DEFAULT_IDENTITY);
  const [mutationStrength, setMutationStrength] = useState<MutationStrength>('balanced');
  const [blindnessSim, setBlindnessSim] = useState<VisionMode>('normal');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [paletteName, setPaletteName] = useState<string>('CRAN3O Spec');
  const [paletteSize, setPaletteSize] = useState(DEFAULT_PALETTE_SIZE);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [contrastOpen, setContrastOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartColors, setDragStartColors] = useState<ColorData[] | null>(null);
  const [hoveredColorId, setHoveredColorId] = useState<string | null>(null);
  const [copiedColorId, setCopiedColorId] = useState<string | null>(null);
  const [history, setHistory] = useState<ColorData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [localOklch, setLocalOklch] = useState<OklchColor | null>(null);
  const [hexDrafts, setHexDrafts] = useState<Record<string, string>>({});
  const [addColorDraft, setAddColorDraft] = useState('');
  const [addColorInvalid, setAddColorInvalid] = useState(false);
  const [slidersOpen, setSlidersOpen] = useState(false);
  const [pickerShape, setPickerShape] = useState<PickerShape>('wheel');
  const [slidersTarget, setSlidersTarget] = useState<'all' | 'selected'>('all');
  const [helpOpen, setHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'instrument' | 'harmony'>('instrument');
  const [harmonyBaseColorId, setHarmonyBaseColorId] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'es'>('en');

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

  // ── Computed ───────────────────────────────────────────────────────
  const activeColor = useMemo(
    () => colors.find((color) => color.id === activeColorId) || colors[0] || null,
    [activeColorId, colors],
  );

  const contrastColors = useMemo(
    () => colors.slice(0, Math.min(colors.length, 8)),
    [colors],
  );

  // ── Effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('cran3o_color_studio_lang', lang);
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

    const savedIdentity = localStorage.getItem(STORAGE_KEYS.identity);
    const savedMode = localStorage.getItem(STORAGE_KEYS.mode) as DesignMode | null;
    const savedSizeRaw = localStorage.getItem(STORAGE_KEYS.paletteSize);
    const savedSize = savedSizeRaw ? Number(savedSizeRaw) : Number.NaN;
    const initialMode = savedMode || 'architecture';
    const initialSize = Number.isFinite(savedSize)
      ? Math.max(0, Math.min(MAX_PALETTE_SIZE, savedSize))
      : DEFAULT_PALETTE_SIZE;

    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as 'en' | 'es' | null;
    const savedLang = urlLang || (localStorage.getItem('cran3o_color_studio_lang') as 'en' | 'es' | null);
    if (savedLang === 'en' || savedLang === 'es') {
      setLang(savedLang);
    }

    if (savedIdentity) {
      try {
        setIdentity(JSON.parse(savedIdentity));
      } catch {
        setIdentity(DEFAULT_IDENTITY);
      }
    }

    setMode(initialMode);
    setPaletteSize(initialSize);

    const savedShape = localStorage.getItem(STORAGE_KEYS.pickerShape) as PickerShape | null;
    if (savedShape === 'wheel' || savedShape === 'plane_lc' || savedShape === 'plane_hc') {
      setPickerShape(savedShape);
    }

    const savedViewMode = localStorage.getItem(STORAGE_KEYS.viewMode) as 'instrument' | 'harmony' | null;
    if (savedViewMode === 'instrument' || savedViewMode === 'harmony') {
      setViewMode(savedViewMode);
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlLayout = params.get('layout');
      if (urlLayout === 'instrument') {
        setViewMode('instrument');
      } else if (urlLayout === 'harmony' || urlLayout === 'adobe') {
        setViewMode('harmony');
      }
    }

    const defaultPreset = PRESETS[0];
    const initialColors = createPaletteFromPreset(defaultPreset, initialSize, initialMode);
    setColors(initialColors);
    setHistory([initialColors]);
    setHistoryIndex(0);
    setActiveColorId(initialColors[Math.min(4, initialColors.length - 1)]?.id ?? null);
    setHarmonyBaseColorId(initialColors[0]?.id ?? null);
    setMounted(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEYS.identity, JSON.stringify(identity));
  }, [identity, mounted]);

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

  // Hex drafts sync
  useEffect(() => {
    setHexDrafts(() => {
      const next: Record<string, string> = {};
      colors.forEach((color) => {
        next[color.id] = color.hex.toUpperCase();
      });
      return next;
    });
  }, [colors]);

  // Local OKLCH sync
  useEffect(() => {
    if (activeColor) {
      const localHex = localOklch ? oklchToHex(localOklch) : '';
      if (localHex !== activeColor.hex) {
        setLocalOklch(activeColor.oklch);
      }
    } else {
      setLocalOklch(null);
    }
  }, [activeColor, localOklch]);

  // Keyboard shortcuts (useRef to avoid stale closures without adding deps)
  const undoRedoRef = useRef<{ undo: () => void; redo: () => void }>({
    undo: () => {},
    redo: () => {},
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undoRedoRef.current.undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          undoRedoRef.current.redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoRedoRef.current.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── History ─────────────────────────────────────────────────────────
  const pushHistory = useCallback(
    (newColors: ColorData[]) => {
      const cleanHistory = history.slice(0, historyIndex + 1);
      if (cleanHistory.length > 0) {
        const last = cleanHistory[cleanHistory.length - 1];
        if (
          last.length === newColors.length &&
          last.every(
            (c, idx) =>
              c.hex === newColors[idx]?.hex &&
              c.locked === newColors[idx]?.locked &&
              c.role === newColors[idx]?.role &&
              c.displayName === newColors[idx]?.displayName,
          )
        ) {
          return;
        }
      }
      const nextHistory = [...cleanHistory, newColors];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    },
    [history, historyIndex],
  );

  const updateColorsAndPushHistory = useCallback(
    (nextColors: ColorData[]) => {
      setColors(nextColors);
      const cleanHistory = history.slice(0, historyIndex + 1);
      const nextHistory = [...cleanHistory, nextColors];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    },
    [history, historyIndex],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const prevColors = history[nextIndex];
      setColors(prevColors);
      setHistoryIndex(nextIndex);
      setSliders(NEUTRAL_SLIDERS);
      if (activeColorId && !prevColors.some((c) => c.id === activeColorId)) {
        setActiveColorId(prevColors[Math.min(4, prevColors.length - 1)]?.id ?? null);
      }
    }
  }, [historyIndex, history, activeColorId]);
  undoRedoRef.current.undo = handleUndo;

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextColors = history[nextIndex];
      setColors(nextColors);
      setHistoryIndex(nextIndex);
      setSliders(NEUTRAL_SLIDERS);
      if (activeColorId && !nextColors.some((c) => c.id === activeColorId)) {
        setActiveColorId(nextColors[Math.min(4, nextColors.length - 1)]?.id ?? null);
      }
    }
  }, [historyIndex, history.length, history, activeColorId]);
  undoRedoRef.current.redo = handleRedo;

  // ── Color helpers ───────────────────────────────────────────────────
  const setColorsKeepingActive = useCallback(
    (nextColors: ColorData[]) => {
      setColors(nextColors);
      if (!nextColors.some((color) => color.id === activeColorId)) {
        setActiveColorId(nextColors[nextColors.length - 1]?.id ?? null);
      }
    },
    [activeColorId],
  );

  const getActiveColor = useCallback(() => activeColor, [activeColor]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleModeChange = useCallback(
    (newMode: DesignMode) => {
      setMode(newMode);
      localStorage.setItem(STORAGE_KEYS.mode, newMode);
      setSettingsOpen(false);
      setExportOpen(false);
      setContrastOpen(false);
      setPresetsOpen(false);
    },
    [],
  );

  const handleDeleteColor = useCallback(
    (id: string) => {
      const nextColors = colors.filter((color) => color.id !== id);
      setPaletteSize(nextColors.length);
      setColorsKeepingActive(nextColors);
      if (harmonyBaseColorId === id) {
        setHarmonyBaseColorId(nextColors[0]?.id ?? null);
      }
      pushHistory(nextColors);
    },
    [colors, harmonyBaseColorId, pushHistory, setColorsKeepingActive],
  );

  const handleAddColor = useCallback(
    (hexOverride?: string) => {
      if (colors.length >= MAX_PALETTE_SIZE) return;
      const normalizedHex = hexOverride ? normalizeHexDraft(hexOverride) : null;
      const baseColor = activeColor || colors[colors.length - 1];
      const newColor = normalizedHex
        ? createColorFromHex(normalizedHex, generateColorName(hexToOklch(normalizedHex)))
        : baseColor
          ? mutateColor(baseColor, 'subtle')
          : createColorFromHex('#d6cec1', 'Bone Dust');
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
    },
    [colors, activeColor, mode, pushHistory, setColorsKeepingActive],
  );

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
        return;
      }
      handleAddColor(nextHex);
    } catch {
      setAddColorInvalid(true);
    }
  }, [handleAddColor]);

  const handleGenerateHarmony = useCallback(() => {
    const seedColor = colors.find((c) => c.id === harmonyBaseColorId) || getActiveColor() || colors[0];
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
  }, [colors, harmonyBaseColorId, activeHarmonyId, identity.chroma, getActiveColor, updateColorsAndPushHistory]);

  const handleHarmonyChange = useCallback(
    (harmonyId: string) => {
      setActiveHarmonyId(harmonyId);
      const seedColor = colors.find((c) => c.id === harmonyBaseColorId) || getActiveColor() || colors[0];
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
    },
    [colors, harmonyBaseColorId, identity.chroma, getActiveColor, updateColorsAndPushHistory],
  );

  const handleRefinePalette = useCallback(() => {
    const nextColors = colors.map((color) =>
      color.locked ? color : mutateColor(color, 'subtle'),
    );
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, updateColorsAndPushHistory]);

  const handleMutatePalette = useCallback(() => {
    const nextColors = colors.map((color) =>
      color.locked ? color : mutateColor(color, mutationStrength),
    );
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  }, [colors, mutationStrength, updateColorsAndPushHistory]);

  const handleIdentitySliderChange = useCallback(
    (newIdentity: UserIdentity) => {
      setIdentity(newIdentity);
      const generated = generateFromIdentity(newIdentity, paletteSize);
      setPaletteName('Identity Preset');
      const nextColors = colors.map((color, index) => {
        if (color.locked) return color;
        const nextColor = generated[index % generated.length];
        nextColor.id = color.id;
        nextColor.role = color.role;
        nextColor.locked = color.locked;
        return nextColor;
      });
      setSliders(NEUTRAL_SLIDERS);
      setColors(nextColors);
    },
    [colors, paletteSize],
  );

  const handleIdentityInteractionEnd = useCallback(() => {
    pushHistory(colors);
  }, [colors, pushHistory]);

  const handleColorWheelChange = useCallback(
    (newOklch: OklchColor) => {
      const active = getActiveColor();
      if (!active) return;
      setLocalOklch(newOklch);
      const nextColor = createColorFromOklch(newOklch, generateColorName(newOklch));
      nextColor.id = active.id;
      nextColor.role = active.role;
      nextColor.locked = active.locked;
      if (viewMode === 'harmony' && active.id === harmonyBaseColorId) {
        const generatedOklchs = generateHarmony(newOklch, activeHarmonyId, identity.chroma / 50);
        const nextColors = colors.map((color, index) => {
          if (color.id === active.id) return nextColor;
          if (color.locked) return color;
          const oklch = generatedOklchs[index % generatedOklchs.length];
          const updatedColor = createColorFromOklch(oklch, generateColorName(oklch));
          updatedColor.id = color.id;
          updatedColor.role = color.role;
          updatedColor.locked = false;
          return updatedColor;
        });
        setColors(nextColors);
      } else {
        setColors(colors.map((color) => (color.id === active.id ? nextColor : color)));
      }
    },
    [colors, viewMode, harmonyBaseColorId, activeHarmonyId, identity.chroma, getActiveColor],
  );

  const handleIndividualColorOklchChange = useCallback(
    (id: string, newOklch: OklchColor) => {
      const current = colors.find((c) => c.id === id);
      if (!current) return;
      const nextColor = createColorFromOklch(newOklch, generateColorName(newOklch));
      nextColor.id = current.id;
      nextColor.role = current.role;
      nextColor.locked = current.locked;
      if (viewMode === 'harmony' && id === harmonyBaseColorId) {
        const generatedOklchs = generateHarmony(newOklch, activeHarmonyId, identity.chroma / 50);
        const nextColors = colors.map((color, index) => {
          if (color.id === id) return nextColor;
          if (color.locked) return color;
          const oklch = generatedOklchs[index % generatedOklchs.length];
          const updatedColor = createColorFromOklch(oklch, generateColorName(oklch));
          updatedColor.id = color.id;
          updatedColor.role = color.role;
          updatedColor.locked = false;
          return updatedColor;
        });
        setColors(nextColors);
      } else {
        setColors(colors.map((color) => (color.id === id ? nextColor : color)));
      }
    },
    [colors, viewMode, harmonyBaseColorId, activeHarmonyId, identity.chroma],
  );

  const handleSliderChange = useCallback(
    (key: keyof SlidersState, value: number) => {
      const nextSliders = { ...sliders, [key]: value };
      setSliders(nextSliders);
      const baseColors = history[historyIndex] || colors;
      const targetId = slidersTarget === 'selected' ? activeColorId : null;
      setColors(applySliders(baseColors, nextSliders, targetId));
    },
    [sliders, history, historyIndex, colors, slidersTarget, activeColorId],
  );

  const handlePresetSelect = useCallback(
    (preset: Preset) => {
      const nextColors = createPaletteFromPreset(preset, paletteSize, mode, colors);
      setPaletteName(preset.name);
      setSliders(NEUTRAL_SLIDERS);
      updateColorsAndPushHistory(nextColors);
      setActiveColorId(nextColors[Math.min(4, nextColors.length - 1)]?.id ?? null);
      setHarmonyBaseColorId(nextColors[0]?.id ?? null);
    },
    [paletteSize, mode, colors, updateColorsAndPushHistory],
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      const nextColors = colors.map((color) =>
        color.id === id ? { ...color, locked: !color.locked } : color,
      );
      updateColorsAndPushHistory(nextColors);
    },
    [colors, updateColorsAndPushHistory],
  );

  const handleRenameColor = useCallback(
    (id: string, newName: string) => {
      setColors(colors.map((color) => (color.id === id ? { ...color, displayName: newName } : color)));
    },
    [colors],
  );

  const handleHexDraftChange = useCallback(
    (id: string, value: string) => {
      setHexDrafts((current) => ({ ...current, [id]: value.toUpperCase() }));
    },
    [],
  );

  const commitHexChange = useCallback(
    (id: string) => {
      const current = colors.find((color) => color.id === id);
      if (!current) return;
      const nextHex = normalizeHexDraft(hexDrafts[id] ?? current.hex);
      if (!nextHex) {
        setHexDrafts((drafts) => ({ ...drafts, [id]: current.hex.toUpperCase() }));
        return;
      }
      if (nextHex === current.hex) {
        setHexDrafts((drafts) => ({ ...drafts, [id]: current.hex.toUpperCase() }));
        return;
      }
      const nextColor = createColorFromHex(nextHex, generateColorName(hexToOklch(nextHex)));
      nextColor.id = current.id;
      nextColor.role = current.role;
      nextColor.locked = current.locked;
      const nextColors = colors.map((color) => (color.id === id ? nextColor : color));
      setLocalOklch(nextColor.oklch);
      updateColorsAndPushHistory(nextColors);
    },
    [colors, hexDrafts, updateColorsAndPushHistory],
  );

  const handleMoveColor = useCallback(
    (fromIndex: number, toIndex: number) => {
      const nextColors = moveColor(colors, fromIndex, toIndex);
      updateColorsAndPushHistory(nextColors);
    },
    [colors, updateColorsAndPushHistory],
  );

  const handlePreviewMoveColor = useCallback(
    (targetId: string) => {
      if (!draggingId || draggingId === targetId) return;
      setColors((currentColors) => {
        const fromIndex = currentColors.findIndex((color) => color.id === draggingId);
        const toIndex = currentColors.findIndex((color) => color.id === targetId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return currentColors;
        return moveColor(currentColors, fromIndex, toIndex);
      });
    },
    [draggingId],
  );

  const finishDragReorder = useCallback(() => {
    if (draggingId && dragStartColors) {
      pushHistory(colors);
    }
    setDraggingId(null);
    setDragStartColors(null);
  }, [draggingId, dragStartColors, colors, pushHistory]);

  // ── Export handlers ─────────────────────────────────────────────────
  const handleExportSvg = useCallback(() => {
    const blob = new Blob(
      [exportPaletteToSvg(colors, paletteName, getTranslatedModeName(mode), lang)],
      { type: 'image/svg+xml' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(paletteName)}-palette.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [colors, paletteName, mode, lang, getTranslatedModeName]);

  const handleExportJson = useCallback(() => {
    const exportData = {
      paletteName,
      mode: INFLUENCES[mode].name,
      paletteSize,
      createdAt: new Date().toISOString(),
      colors: colors.map((color) => ({
        name: color.displayName,
        role: color.role,
        hex: color.hex,
        rgb: color.rgb,
        hsl: color.hsl,
        oklch: color.oklch,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(paletteName)}-palette.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [colors, paletteName, mode, paletteSize]);

  const handleExportCss = useCallback(() => {
    const cssContent = [
      `/* CRAN3O Color Studio - ${paletteName} variables */`,
      ':root {',
      ...colors.map((color) => {
        const varName = color.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return `  --cran3o-${varName}: ${color.hex}; /* ${color.role}, OKLCH ${color.oklch.l.toFixed(2)} ${color.oklch.c.toFixed(3)} ${Math.round(color.oklch.h)} */`;
      }),
      '}',
      '',
    ].join('\n');
    const blob = new Blob([cssContent], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(paletteName)}-variables.css`;
    a.click();
    URL.revokeObjectURL(url);
  }, [colors, paletteName]);

  const handleCopyClipboardList = useCallback(() => {
    navigator.clipboard
      .writeText(colors.map((color) => `${color.hex.toUpperCase()} - ${color.displayName}`).join('\n'))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
  }, [colors]);

  const createSwatchCardBlob = useCallback(
    (color: ColorData, index: number): Promise<Blob | null> => {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (!ctx) return Promise.resolve(null);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#d9dde2';
      ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
      ctx.fillStyle = color.hex;
      ctx.fillRect(32, 32, 656, 218);
      ctx.strokeStyle = 'rgba(12, 18, 28, 0.18)';
      ctx.strokeRect(32.5, 32.5, 655, 217);
      ctx.fillStyle = '#0f1725';
      ctx.font = '700 30px Arial, sans-serif';
      ctx.fillText(color.displayName, 32, 306);
      ctx.font = '700 18px Arial, sans-serif';
      ctx.fillText(color.hex.toUpperCase(), 32, 340);
      ctx.fillStyle = '#697386';
      ctx.font = '700 14px Arial, sans-serif';
      ctx.fillText(
        `${index + 1} / ${color.role.toUpperCase()} / OKLCH ${color.oklch.l.toFixed(2)} ${color.oklch.c.toFixed(3)} ${Math.round(color.oklch.h)}`,
        32,
        374,
      );
      return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png', 1));
    },
    [],
  );

  const handleCopySwatchCard = useCallback(
    async (event: React.MouseEvent<HTMLElement>, color: ColorData, index: number) => {
      event.preventDefault();
      event.stopPropagation();
      const text = `${color.displayName}\n${color.hex.toUpperCase()}\nRole: ${color.role}\nOKLCH: ${color.oklch.l.toFixed(2)} ${color.oklch.c.toFixed(3)} ${Math.round(color.oklch.h)}`;
      const blob = await createSwatchCardBlob(color, index);
      try {
        if (blob && 'ClipboardItem' in window && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
              'text/plain': new Blob([text], { type: 'text/plain' }),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(text);
        }
        setCopiedColorId(color.id);
        setTimeout(() => setCopiedColorId(null), 1500);
      } catch {
        await navigator.clipboard.writeText(text);
      }
    },
    [createSwatchCardBlob],
  );

  const handleExportPng = useCallback(() => {
    const rowHeight = 82;
    const canvas = document.createElement('canvas');
    canvas.width = 920;
    canvas.height = colors.length * rowHeight + 210;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = isDarkMode ? '#0c0f12' : '#fdfbf7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const textPrimary = isDarkMode ? '#f9fafb' : '#111827';
    const textSecondary = isDarkMode ? '#9ca3af' : '#4b5563';
    const swatchBorder = isDarkMode ? 'rgba(249, 250, 251, 0.15)' : 'rgba(17, 24, 39, 0.12)';
    ctx.fillStyle = textPrimary;
    ctx.font = '600 26px Space Grotesk, system-ui, sans-serif';
    ctx.fillText(paletteName, 48, 74);
    ctx.fillStyle = textSecondary;
    ctx.font = '500 12px Space Grotesk, system-ui, sans-serif';
    const colorsText = lang === 'es' ? 'colores' : 'colors';
    const translatedMode = getTranslatedModeName(mode);
    ctx.fillText(`${translatedMode} / ${colors.length} ${colorsText} / OKLCH`, 48, 100);
    colors.forEach((color, index) => {
      const y = 140 + index * rowHeight;
      ctx.fillStyle = color.hex;
      ctx.fillRect(48, y, 104, 56);
      ctx.strokeStyle = swatchBorder;
      ctx.strokeRect(48, y, 104, 56);
      ctx.fillStyle = textPrimary;
      ctx.font = '600 16px Space Grotesk, system-ui, sans-serif';
      ctx.fillText(color.displayName, 176, y + 22);
      ctx.fillStyle = textSecondary;
      ctx.font = '500 12px Space Mono, monospace';
      ctx.fillText(`${color.hex.toUpperCase()} / ${color.role.toUpperCase()}`, 176, y + 44);
      ctx.fillText(`RGB ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`, 440, y + 22);
      ctx.fillText(
        `OKLCH ${color.oklch.l.toFixed(2)}, ${color.oklch.c.toFixed(3)}, ${Math.round(color.oklch.h)}°`,
        440,
        y + 44,
      );
    });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${sanitizeFileName(paletteName)}-palette.png`;
    a.click();
  }, [colors, paletteName, mode, lang, isDarkMode, getTranslatedModeName]);

  const handlePrintPdf = useCallback(() => {
    printPaletteCatalog(colors, paletteName, getTranslatedModeName(mode), lang);
  }, [colors, paletteName, mode, lang, getTranslatedModeName]);

  // ── Harmony sidebar helpers (harmony view) ──────────────────────────
  const handleHarmonyBaseClick = useCallback(
    (color: ColorData) => {
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
    },
    [colors, activeHarmonyId, identity.chroma, updateColorsAndPushHistory],
  );

  // ── Return ─────────────────────────────────────────────────────────
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
    copied,
    settingsOpen,
    exportOpen,
    presetsOpen,
    contrastOpen,
    identityOpen,
    draggingId,
    dragStartColors,
    hoveredColorId,
    copiedColorId,
    historyIndex,
    localOklch,
    hexDrafts,
    addColorDraft,
    addColorInvalid,
    slidersOpen,
    pickerShape,
    slidersTarget,
    helpOpen,
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
    setHoveredColorId,
    setDraggingId,
    setDragStartColors,
    setPickerShape,
    setViewMode,
    setSlidersOpen,
    setIdentityOpen,
    setHelpOpen,
    setSettingsOpen,
    setExportOpen,
    setPresetsOpen,
    setContrastOpen,
    setLang,
    setIsDarkMode,
    setBlindnessSim,
    setPaletteSize,
    setMutationStrength,
    setSlidersTarget,
    setHarmonyBaseColorId,
    setAddColorDraft,
    setAddColorInvalid,
    setHexDrafts,
    setLocalOklch,

    // Handlers
    handleModeChange,
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
    handleUndo,
    handleRedo,

    // Export
    handleExportSvg,
    handleExportJson,
    handleExportCss,
    handleCopyClipboardList,
    handleCopySwatchCard,
    handleExportPng,
    handlePrintPdf,
    handleHarmonyBaseClick,

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
