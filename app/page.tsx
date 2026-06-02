'use client';


import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorData, ColorRole, DesignMode, MutationStrength, OklchColor, SlidersState, UserIdentity, Preset } from '../types';
import { PRESETS } from '../data/presets';
import { TRANSLATIONS } from '../data/translations';
import { INFLUENCES } from '../data/influences';
import { HARMONIES, generateHarmony } from '../lib/harmony';
import { generateColorName } from '../lib/naming';
import { createColorFromHex, createColorFromOklch, hexToOklch, oklchToHex, isColorInGamut } from '../lib/color-spaces';
import { applySliders, NEUTRAL_SLIDERS, generateFromIdentity, mutateColor } from '../lib/variation';
import { checkApca, checkWcag } from '../lib/accessibility';
import { exportPaletteToSvg } from '../lib/exporters/svg-exporter';
import { printPaletteCatalog } from '../lib/exporters/pdf-exporter';
import { createPaletteFromPreset, DEFAULT_PALETTE_SIZE, MAX_PALETTE_SIZE, moveColor, roleForIndex } from '../lib/palette';
import ColorWheel from '../components/ColorWheel';
import IdentityPanel from '../components/IdentityPanel';
import MaterialIcon from '../components/MaterialIcon';
import MockupViewer from '../components/MockupViewer';

const DEFAULT_IDENTITY: UserIdentity = {
  temperature: 40,
  chroma: 30,
  contrast: 50,
  experimentality: 30,
};

const APP_VERSION_LABEL = 'v0.1.8';
const APP_BUILD_LABEL = '2026.06.02';
const MAX_HISTORY_STEPS = 50;

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

function getInitialLang(): 'en' | 'es' {
  if (typeof window === 'undefined') return 'en';
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang === 'en' || urlLang === 'es') return urlLang;
  const saved = localStorage.getItem('cran3o_color_studio_lang') as 'en' | 'es' | null;
  if (saved === 'en' || saved === 'es') return saved;
  return 'en';
}

export default function Cran3oColorStudio() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<DesignMode>('architecture');
  const [colors, setColors] = useState<ColorData[]>([]);
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const [activeHarmonyId, setActiveHarmonyId] = useState<string>('material');
  const [sliders, setSliders] = useState<SlidersState>(NEUTRAL_SLIDERS);
  const [identity, setIdentity] = useState<UserIdentity>(() => {
    if (typeof window === 'undefined') return DEFAULT_IDENTITY;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.identity);
      return saved ? (JSON.parse(saved) as UserIdentity) : DEFAULT_IDENTITY;
    } catch {
      return DEFAULT_IDENTITY;
    }
  });
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
  const [lang, setLang] = useState<'en' | 'es'>(getInitialLang);

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key];
  };

  const getTooltipText = (whatKey: keyof typeof TRANSLATIONS['en'], howKey: keyof typeof TRANSLATIONS['en']) => {
    const qWhat = lang === 'es' ? '¿Qué es?' : 'What is it?';
    const qHow = lang === 'es' ? '¿Cómo funciona?' : 'How does it work?';
    return `${qWhat}\n${t(whatKey)}\n\n${qHow}\n${t(howKey)}`;
  };

  const getTranslatedModeName = (m: DesignMode) => {
    if (m === 'graphic') return t('graphicDesign');
    if (m === 'spec') return t('modeSpec');
    const key = m as keyof typeof TRANSLATIONS['en'];
    return t(key) || INFLUENCES[m].name;
  };

  useEffect(() => {
    localStorage.setItem('cran3o_color_studio_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swPath = window.location.pathname.endsWith('/') 
        ? window.location.pathname + 'sw.js'
        : window.location.pathname + '/sw.js';
      // Normalize double slashes
      const normalizedPath = swPath.replace(/\/+/g, '/');
      navigator.serviceWorker.register(normalizedPath).catch(() => undefined);
    }

    const savedMode = localStorage.getItem(STORAGE_KEYS.mode) as DesignMode | null;
    const savedSizeRaw = localStorage.getItem(STORAGE_KEYS.paletteSize);
    const savedSize = savedSizeRaw ? Number(savedSizeRaw) : Number.NaN;
    const initialMode = savedMode || 'architecture';
    const initialSize = Number.isFinite(savedSize) ? Math.max(0, Math.min(MAX_PALETTE_SIZE, savedSize)) : DEFAULT_PALETTE_SIZE;

    const savedShape = localStorage.getItem(STORAGE_KEYS.pickerShape) as PickerShape | null;
    const savedViewMode = localStorage.getItem(STORAGE_KEYS.viewMode) as 'instrument' | 'harmony' | null;
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

      if (savedViewMode === 'instrument' || savedViewMode === 'harmony') {
        setViewMode(savedViewMode);
      }

      if (urlLayout === 'instrument') {
        setViewMode('instrument');
      } else if (urlLayout === 'harmony' || urlLayout === 'adobe') {
        setViewMode('harmony');
      }

      setColors(initialColors);
      setHistory([initialColors]);
      setHistoryIndex(0);
      setActiveColorId(initialColors[Math.min(4, initialColors.length - 1)]?.id ?? null);
      setHarmonyBaseColorId(initialColors[0]?.id ?? null);
      setMounted(true);
    });
  }, []);

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

  const activeColor = useMemo(
    () => colors.find((color) => color.id === activeColorId) || colors[0] || null,
    [activeColorId, colors],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- sync derived UI state, not a cascading render loop */
  useEffect(() => {
    setHexDrafts(() => {
      const next: Record<string, string> = {};
      colors.forEach((color) => {
        next[color.id] = color.hex.toUpperCase();
      });
      return next;
    });
  }, [colors]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- sync derived picker state, not a cascading render loop */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const getActiveColor = (): ColorData | null => activeColor;

  const pushHistory = (newColors: ColorData[]) => {
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
            c.displayName === newColors[idx]?.displayName
        )
      ) {
        return;
      }
    }
    const nextHistory = [...cleanHistory, newColors].slice(-MAX_HISTORY_STEPS);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const updateColorsAndPushHistory = (nextColors: ColorData[]) => {
    setColors(nextColors);
    const cleanHistory = history.slice(0, historyIndex + 1);
    if (cleanHistory.length > 0) {
      const last = cleanHistory[cleanHistory.length - 1];
      if (
        last.length === nextColors.length &&
        last.every(
          (c, idx) =>
            c.hex === nextColors[idx]?.hex &&
            c.locked === nextColors[idx]?.locked &&
            c.role === nextColors[idx]?.role &&
            c.displayName === nextColors[idx]?.displayName
        )
      ) {
        return;
      }
    }
    const nextHistory = [...cleanHistory, nextColors].slice(-MAX_HISTORY_STEPS);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

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
  }, [activeColorId, history, historyIndex]);

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
  }, [activeColorId, history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          handleUndo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleUndo]);

  const setColorsKeepingActive = (nextColors: ColorData[]) => {
    setColors(nextColors);
    if (!nextColors.some((color) => color.id === activeColorId)) {
      setActiveColorId(nextColors[nextColors.length - 1]?.id ?? null);
    }
  };

  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEYS.mode, newMode);
    setSettingsOpen(false);
    setExportOpen(false);
    setContrastOpen(false);
    setPresetsOpen(false);
  };

  const handleDeleteColor = (id: string) => {
    const nextColors = colors.filter((color) => color.id !== id);
    setPaletteSize(nextColors.length);
    setColorsKeepingActive(nextColors);
    if (harmonyBaseColorId === id) {
      setHarmonyBaseColorId(nextColors[0]?.id ?? null);
    }
    pushHistory(nextColors);
  };

  const handleAddColor = (hexOverride?: string) => {
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
  };

  const commitAddColorDraft = () => {
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
  };

  const handlePasteAddColor = async () => {
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
  };

  const handleGenerateHarmony = () => {
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
  };

  const handleHarmonyChange = (harmonyId: string) => {
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
  };

  const handleRefinePalette = () => {
    const nextColors = colors.map((color) => (color.locked ? color : mutateColor(color, 'subtle')));
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  };

  const handleMutatePalette = () => {
    const nextColors = colors.map((color) => (color.locked ? color : mutateColor(color, mutationStrength)));
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
  };

  const handleIdentitySliderChange = (newIdentity: UserIdentity) => {
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
  };

  const handleIdentityInteractionEnd = () => {
    pushHistory(colors);
  };

  const handleColorWheelChange = (newOklch: OklchColor) => {
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
  };

  const handleIndividualColorOklchChange = (id: string, newOklch: OklchColor) => {
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
  };

  const handleSliderChange = (key: keyof SlidersState, value: number) => {
    const nextSliders = { ...sliders, [key]: value };
    setSliders(nextSliders);
    const baseColors = history[historyIndex] || colors;
    const targetId = slidersTarget === 'selected' ? activeColorId : null;
    setColors(applySliders(baseColors, nextSliders, targetId));
  };

  const handlePresetSelect = (preset: Preset) => {
    const nextColors = createPaletteFromPreset(preset, paletteSize, mode, colors);
    setPaletteName(preset.name);
    setSliders(NEUTRAL_SLIDERS);
    updateColorsAndPushHistory(nextColors);
    setActiveColorId(nextColors[Math.min(4, nextColors.length - 1)]?.id ?? null);
    setHarmonyBaseColorId(nextColors[0]?.id ?? null);
  };

  const handleToggleLock = (id: string) => {
    const nextColors = colors.map((color) => (color.id === id ? { ...color, locked: !color.locked } : color));
    updateColorsAndPushHistory(nextColors);
  };

  const handleRenameColor = (id: string, newName: string) => {
    setColors(colors.map((color) => (color.id === id ? { ...color, displayName: newName } : color)));
  };

  const handleHexDraftChange = (id: string, value: string) => {
    setHexDrafts((current) => ({ ...current, [id]: value.toUpperCase() }));
  };

  const commitHexChange = (id: string) => {
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
  };

  const handleRoleChange = (id: string, newRole: ColorRole) => {
    const nextColors = colors.map((color) => (color.id === id ? { ...color, role: newRole } : color));
    updateColorsAndPushHistory(nextColors);
  };

  const handleMoveColor = (fromIndex: number, toIndex: number) => {
    const nextColors = moveColor(colors, fromIndex, toIndex);
    updateColorsAndPushHistory(nextColors);
  };

  const handlePreviewMoveColor = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setColors((currentColors) => {
      const fromIndex = currentColors.findIndex((color) => color.id === draggingId);
      const toIndex = currentColors.findIndex((color) => color.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return currentColors;
      return moveColor(currentColors, fromIndex, toIndex);
    });
  };

  const finishDragReorder = () => {
    if (draggingId && dragStartColors) {
      pushHistory(colors);
    }
    setDraggingId(null);
    setDragStartColors(null);
  };

  const handleExportSvg = () => {
    const blob = new Blob([exportPaletteToSvg(colors, paletteName, getTranslatedModeName(mode), lang)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(paletteName)}-palette.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
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
  };

  const handleExportCss = () => {
    const cssContent = [
      `/* CRAN3O Color Studio - ${paletteName} variables */`,
      ':root {',
      ...colors.map((color) => {
        const varName = color.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
  };

  const handleCopyClipboardList = () => {
    navigator.clipboard.writeText(colors.map((color) => `${color.hex.toUpperCase()} - ${color.displayName}`).join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const createSwatchCardBlob = (color: ColorData, index: number): Promise<Blob | null> => {
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
    ctx.fillText(`${index + 1} / ${color.role.toUpperCase()} / OKLCH ${color.oklch.l.toFixed(2)} ${color.oklch.c.toFixed(3)} ${Math.round(color.oklch.h)}`, 32, 374);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png', 1));
  };

  const handleCopySwatchCard = async (event: React.MouseEvent<HTMLElement>, color: ColorData, index: number) => {
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
      try {
        await navigator.clipboard.writeText(text);
        setCopiedColorId(color.id);
        setTimeout(() => setCopiedColorId(null), 1500);
      } catch {
        // Clipboard access can be blocked by browser policy; the context menu still remains safe.
      }
    }
  };

  const handleExportPng = () => {
    const rowHeight = 82;
    const canvas = document.createElement('canvas');
    canvas.width = 920;
    canvas.height = colors.length * rowHeight + 210;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dynamic background color
    ctx.fillStyle = isDarkMode ? '#0c0f12' : '#fdfbf7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dynamic text colors
    const textPrimary = isDarkMode ? '#f9fafb' : '#111827';
    const textSecondary = isDarkMode ? '#9ca3af' : '#4b5563';
    const swatchBorder = isDarkMode ? 'rgba(249, 250, 251, 0.15)' : 'rgba(17, 24, 39, 0.12)';

    ctx.fillStyle = textPrimary;
    ctx.font = '600 26px Space Grotesk, system-ui, sans-serif';
    ctx.fillText(paletteName, 48, 74);

    ctx.fillStyle = textSecondary;
    ctx.font = '500 12px Space Grotesk, system-ui, sans-serif';
    
    // Translated labels
    const colorsText = lang === 'es' ? 'colores' : 'colors';
    const translatedMode = getTranslatedModeName(mode);
    ctx.fillText(`${translatedMode} / ${colors.length} ${colorsText} / OKLCH`, 48, 100);

    colors.forEach((color, index) => {
      const y = 140 + index * rowHeight;
      
      // Draw Swatch
      ctx.fillStyle = color.hex;
      ctx.fillRect(48, y, 104, 56);
      
      // Swatch Border
      ctx.strokeStyle = swatchBorder;
      ctx.strokeRect(48, y, 104, 56);
      
      // Color Info Text
      ctx.fillStyle = textPrimary;
      ctx.font = '600 16px Space Grotesk, system-ui, sans-serif';
      ctx.fillText(color.displayName, 176, y + 22);
      
      ctx.fillStyle = textSecondary;
      ctx.font = '500 12px Space Mono, monospace';
      ctx.fillText(`${color.hex.toUpperCase()} / ${color.role.toUpperCase()}`, 176, y + 44);
      ctx.fillText(`RGB ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`, 440, y + 22);
      ctx.fillText(`OKLCH ${color.oklch.l.toFixed(2)}, ${color.oklch.c.toFixed(3)}, ${Math.round(color.oklch.h)}°`, 440, y + 44);
    });

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${sanitizeFileName(paletteName)}-palette.png`;
    a.click();
  };

  const handlePrintPdf = () => {
    printPaletteCatalog(colors, paletteName, getTranslatedModeName(mode), lang);
  };

  if (!mounted) {
    return (
      <div className="studio-loading">
        <MaterialIcon name="progress_activity" size={28} />
        <span>Initializing OKLCH color engine...</span>
      </div>
    );
  }

  const contrastColors = colors.slice(0, Math.min(colors.length, 8));

  return (
    <div className="studio-shell">
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="protanopia"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0" /></filter>
          <filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0" /></filter>
          <filter id="tritanopia"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0" /></filter>
          <filter id="achromatopsia"><feColorMatrix type="matrix" values="0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0, 0, 0, 1, 0" /></filter>
        </defs>
      </svg>

      <header className="studio-header" style={{ padding: '0 0 12px', gap: '12px', flexWrap: 'wrap' }}>
        <div className="studio-logo" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h1 className="logo-main">CRAN3O COLOR STUDIO</h1>
          <span className="logo-sub">{t('logoSub')}</span>
          <span className="build-badge" title="Current deployed build">
            {APP_VERSION_LABEL} / {APP_BUILD_LABEL}
          </span>
        </div>

        <div className="workspace-toggle-bar">
          <button 
            className={`workspace-tab-btn ${viewMode === 'instrument' ? 'active' : ''}`}
            onClick={() => setViewMode('instrument')}
          >
            {t('workspaceInstrument')}
          </button>
          <button 
            className={`workspace-tab-btn ${viewMode === 'harmony' ? 'active' : ''}`}
            onClick={() => setViewMode('harmony')}
          >
            {t('workspaceHarmony')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Undo */}
          <button 
            className="icon-button" 
            onClick={handleUndo} 
            disabled={historyIndex <= 0} 
            title={t('undo')}
            style={{ opacity: historyIndex <= 0 ? 0.35 : 1 }}
          >
            <MaterialIcon name="undo" size={20} />
          </button>

          {/* Redo */}
          <button 
            className="icon-button" 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1} 
            title={t('redo')}
            style={{ opacity: historyIndex >= history.length - 1 ? 0.35 : 1 }}
          >
            <MaterialIcon name="redo" size={20} />
          </button>

          {/* Contrast / Accessibility Check */}
          <div className="settings-wrap" style={{ position: 'relative' }}>
            <button 
              className="icon-button" 
              onClick={() => { setContrastOpen((open) => !open); setExportOpen(false); setSettingsOpen(false); setPresetsOpen(false); }} 
              aria-expanded={contrastOpen} 
              aria-label="Contrast matrix" 
              title={t('contrastMatrix')}
            >
              <MaterialIcon name="check" size={20} />
            </button>
            {contrastOpen && (
              <div className="settings-menu" style={{ minWidth: '380px', right: 0 }}>
                <div className="settings-menu-title">{t('contrastMatrix')}</div>
                <p className="section-description" style={{ marginBottom: '8px', padding: '0 8px' }}>{t('contrastDesc')}</p>
                <div className="contrast-wrap">
                  <table className="contrast-table">
                    <thead>
                      <tr>
                        <th className="contrast-text-left">BG / Text</th>
                        {contrastColors.map((color) => <th key={color.id}>{color.displayName.split(' ')[0]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {contrastColors.map((bgColor) => (
                        <tr key={bgColor.id}>
                          <td className="contrast-text-left"><i style={{ backgroundColor: bgColor.hex }} />{bgColor.displayName.split(' ')[0]}</td>
                          {contrastColors.map((textColor) => {
                            if (bgColor.id === textColor.id) return <td key={textColor.id}>-</td>;
                            const wcag = checkWcag(textColor.rgb, bgColor.rgb);
                            const apca = checkApca(textColor.rgb, bgColor.rgb);
                            return (
                              <td key={textColor.id}>
                                <div className="contrast-badge">
                                  <span className={wcag.ratio >= 4.5 ? 'contrast-pass' : 'contrast-fail'}>{wcag.ratio}:1</span>
                                  <span className={apca.absScore >= 45 ? 'contrast-pass' : 'contrast-fail'}>Lc {apca.score}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <button
            className="icon-button"
            onClick={() => {
              setHelpOpen(true);
              setExportOpen(false);
              setSettingsOpen(false);
              setContrastOpen(false);
              setPresetsOpen(false);
            }}
            aria-label={lang === 'es' ? 'Abrir guia de uso' : 'Open usage guide'}
            title={lang === 'es' ? 'Guia de uso' : 'Usage guide'}
          >
            <MaterialIcon name="info" size={20} />
          </button>

          {/* Export Options */}
          <div className="settings-wrap" style={{ position: 'relative' }}>
            <button className="icon-button" onClick={() => { setExportOpen((open) => !open); setSettingsOpen(false); setContrastOpen(false); setPresetsOpen(false); }} aria-expanded={exportOpen} aria-label="Export palette" title={t('exportSwatches')}>
              <MaterialIcon name="download" size={20} />
            </button>
            {exportOpen && (
              <div className="settings-menu">
                <div className="settings-menu-title">{t('exportSwatches')}</div>
                <button className="settings-menu-row" onClick={() => { handlePrintPdf(); setExportOpen(false); }}>
                  <MaterialIcon name="picture_as_pdf" />
                  {t('pdfSheet')}
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportSvg(); setExportOpen(false); }}>
                  <MaterialIcon name="download" />
                  {t('svgVector')}
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportPng(); setExportOpen(false); }}>
                  <MaterialIcon name="image" />
                  {t('retinaPng')}
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportJson(); setExportOpen(false); }}>
                  <MaterialIcon name="data_object" />
                  {t('jsonSwatches')}
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportCss(); setExportOpen(false); }}>
                  <MaterialIcon name="css" />
                  {t('cssVariables')}
                </button>
                <button className="settings-menu-row" onClick={() => { handleCopyClipboardList(); setExportOpen(false); }}>
                  <MaterialIcon name={copied ? 'check' : 'content_copy'} />
                  {copied ? t('copied') : t('copyColorList')}
                </button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="settings-wrap" style={{ position: 'relative' }}>
            <button className="icon-button" onClick={() => { setSettingsOpen((open) => !open); setExportOpen(false); setContrastOpen(false); setPresetsOpen(false); }} aria-expanded={settingsOpen} aria-label="Open settings" title={t('settings')}>
              <MaterialIcon name="settings" size={20} />
            </button>
            {settingsOpen && (
              <div className="settings-menu">
                <div className="settings-menu-title">{t('settings')}</div>
                <button className="settings-menu-row" onClick={() => setIsDarkMode(!isDarkMode)}>
                  <MaterialIcon name={isDarkMode ? 'light_mode' : 'dark_mode'} />
                  {isDarkMode ? t('lightMode') : t('darkMode')}
                </button>
                <label className="settings-field">
                  <span>{t('visionSimulator')}</span>
                  <select value={blindnessSim} onChange={(event) => setBlindnessSim(event.target.value as VisionMode)}>
                    <option value="normal">{t('normalView')}</option>
                    <option value="protanopia">PROTANOPIA</option>
                    <option value="deuteranopia">DEUTERANOPIA</option>
                    <option value="tritanopia">TRITANOPIA</option>
                    <option value="achromatopsia">ACHROMATOPSIA</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="workspace-toggle-bar" style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
            <button 
              className={`workspace-tab-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
              style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.68rem' }}
            >
              EN
            </button>
            <button 
              className={`workspace-tab-btn ${lang === 'es' ? 'active' : ''}`}
              onClick={() => setLang('es')}
              style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.68rem' }}
            >
              ES
            </button>
          </div>
        </div>
      </header>

      <div 
        className={viewMode === 'instrument' ? "studio-grid" : "harmony-layout-grid"} 
        style={{ filter: blindnessSim !== 'normal' ? `url(#${blindnessSim})` : 'none' }}
      >
        {viewMode === 'instrument' ? (
          <>
            {/* LEFT COLUMN: Controls, Swatches, Sliders */}
            <div className="left-column stack">
              
              {/* Row 2: Wheel & Swatches Side-by-Side Row */}
              <div className="wheel-and-swatches-row">
                
                {/* Left: OKLCH Color Space Instrument */}
                <section className="studio-panel calculator-face color-space-instrument">
                  <div className="panel-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t('colorInstrument')}
                        <span 
                          title={getTooltipText('colorInstrumentHelpWhat', 'colorInstrumentHelpHow')}
                          style={{ color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MaterialIcon name="info" size={14} />
                        </span>
                      </h3>
                      <p className="section-description" style={{ margin: '4px 0 0' }}>{t('colorInstrumentDesc')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="control-label-mini" style={{ margin: 0, opacity: 0.8 }}>{t('picker')}</span>
                      <div className="button-strip">
                        {(['wheel', 'plane_lc', 'plane_hc'] as const).map((shape) => (
                          <button
                            key={shape}
                            className={pickerShape === shape ? 'active' : ''}
                            onClick={() => setPickerShape(shape)}
                            style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '0.65rem' }}
                            title={shape === 'wheel' ? t('pickerWheelTooltip') : shape === 'plane_lc' ? t('pickerLcTooltip') : t('pickerHcTooltip')}
                          >
                            {shape === 'wheel' ? t('wheel') : shape === 'plane_lc' ? t('lc') : t('hc')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="instrument-vertical-stack">
                    <div className="instrument-wheel-wrapper">
                      <ColorWheel 
                        activeColor={activeColor} 
                        colors={colors} 
                        onColorChange={handleColorWheelChange} 
                        onSelectColor={(color) => setActiveColorId(color.id)} 
                        size={260}
                        hoveredColorId={hoveredColorId}
                        onHoverColor={setHoveredColorId}
                        onInteractionEnd={() => pushHistory(colors)}
                        pickerShape={pickerShape}
                        lang={lang}
                      />
                    </div>

                    <div className="harmony-controls-block">
                      <span className="control-label-mini">{lang === 'es' ? 'ARMONÍA' : 'HARMONY'}</span>
                      <div className="harmony-action-row">
                        <select className="select-control" value={activeHarmonyId} onChange={(event) => handleHarmonyChange(event.target.value)}>
                          {HARMONIES.map((harmony) => <option key={harmony.id} value={harmony.id}>{t((harmony.id + 'Name') as keyof typeof TRANSLATIONS['en']) || harmony.name}</option>)}
                        </select>
                        <button onClick={handleGenerateHarmony} className="calculator-action primary" title={t('reapplyTooltip')}>
                          <MaterialIcon name="sync" size={12} />
                          {t('reapply')}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Right: Swatches Panel */}
                <section className="studio-panel calculator-face swatches-panel">
                  <div className="panel-header swatches-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '8px' }}>
                    <div>
                      <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t('paletteSystemMatrix')}
                        <span 
                          title={getTooltipText('paletteSystemMatrixHelpWhat', 'paletteSystemMatrixHelpHow')}
                          style={{ color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MaterialIcon name="info" size={14} />
                        </span>
                      </h3>
                      <p className="section-description">{t('paletteSystemMatrixDesc')}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: "var(--font-sans)", background: 'var(--bg-input)', padding: '4px 8px', borderRadius: '3px', border: '1px solid var(--border-medium)', letterSpacing: '0.05em' }}>
                        {paletteName.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="panel-toolbar swatches-toolbar" style={{ position: 'relative' }}>
                    <div className="swatches-toolbar-primary">
                      {/* SYSTEM PRESETS */}
                      <div className="settings-wrap" style={{ position: 'relative' }}>
                        <button 
                          className="calculator-action secondary" 
                          style={{ minHeight: '28px', padding: '4px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }} 
                          onClick={() => { setPresetsOpen(!presetsOpen); setExportOpen(false); setSettingsOpen(false); setContrastOpen(false); }}
                        >
                          <span>{t('presets')}</span>
                          <MaterialIcon name="arrow_drop_down" size={14} />
                        </button>
                        {presetsOpen && (
                          <div className="settings-menu presets-menu" style={{ width: '280px', maxHeight: '400px', overflowY: 'auto', zIndex: 100, left: 0, right: 'auto' }}>
                            <div className="settings-menu-title">{t('studioPresets')}</div>
                            {[
                              { label: t('universal'), items: PRESETS.filter(p => !p.mode) },
                              { label: t('architecture'), items: PRESETS.filter(p => p.mode === 'architecture') },
                              { label: t('industrial'), items: PRESETS.filter(p => p.mode === 'industrial') },
                              { label: t('graphicDesign'), items: PRESETS.filter(p => p.mode === 'graphic') },
                            ].map((group) => (
                              <div key={group.label} style={{ marginBottom: '8px' }}>
                                <div className="preset-group-header" style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.6, letterSpacing: '0.08em', padding: '4px 8px', borderBottom: '1px solid var(--border-light)', textTransform: 'uppercase' }}>
                                  {group.label}
                                </div>
                                {group.items.map((preset) => (
                                  <button 
                                    key={preset.id} 
                                    onClick={() => { handlePresetSelect(preset); setPresetsOpen(false); }} 
                                    className="settings-menu-row" 
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '6px 8px', background: 'transparent', border: 0 }}
                                  >
                                    <span style={{ fontWeight: 500, fontSize: '0.72rem' }}>{preset.name}</span>
                                    <span className="preset-dots" style={{ display: 'flex', gap: '3px' }}>
                                      {preset.colors.slice(0, 4).map((color, idx) => (
                                        <i key={idx} style={{ backgroundColor: color.hex, width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', border: '1px solid rgba(255,255,255,0.15)' }} />
                                      ))}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="swatches-grid">
                    {colors.map((color, index) => {
                      const isActive = color.id === activeColorId;
                      const isDragging = draggingId === color.id;
                      const isHovered = hoveredColorId === color.id;
                      return (
                        <article
                          key={color.id}
                          className={`swatch-card floating-card ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isHovered ? 'hovered' : ''}`}
                          onClick={() => {
                            setActiveColorId(color.id);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handlePreviewMoveColor(color.id);
                          }}
                          onDragEnd={finishDragReorder}
                          onDrop={finishDragReorder}
                          onMouseEnter={() => setHoveredColorId(color.id)}
                          onMouseLeave={() => setHoveredColorId(null)}
                          onContextMenu={(event) => handleCopySwatchCard(event, color, index)}
                          title={t('rightClickCopy')}
                        >
                          <div
                            className="swatch-fill"
                            draggable
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveColorId(color.id);
                            }}
                            onDragStart={(event) => {
                              setDraggingId(color.id);
                              setDragStartColors(colors);
                              event.dataTransfer.effectAllowed = 'move';
                              event.dataTransfer.setData('text/plain', color.id);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              handlePreviewMoveColor(color.id);
                            }}
                            style={{ backgroundColor: color.hex }}
                          >
                            <div
                              className="drag-handle"
                              title={t('dragToReorder')}
                            >
                              <MaterialIcon name="drag_indicator" size={14} />
                            </div>
                            <button 
                              className={`swatch-lock-indicator-fill ${color.locked ? 'locked-state' : ''}`} 
                              onClick={(event) => { event.stopPropagation(); handleToggleLock(color.id); }} 
                              title={color.locked ? t('unlockColor') : t('lockColor')}
                            >
                              <MaterialIcon name={color.locked ? 'lock' : 'lock_open'} size={13} />
                            </button>
                            <button
                              className="swatch-delete-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteColor(color.id);
                              }}
                              title={t('deleteColor')}
                            >
                              <MaterialIcon name="close" size={12} />
                            </button>
                          </div>

                          <div className="swatch-info" onMouseDown={(event) => event.stopPropagation()}>
                            <input 
                              className="swatch-name" 
                              value={color.displayName} 
                              draggable={false}
                              onMouseDown={(event) => event.stopPropagation()}
                              onDragStart={(e) => e.stopPropagation()}
                              onClick={(event) => event.stopPropagation()} 
                              onChange={(event) => handleRenameColor(color.id, event.target.value)} 
                              onBlur={() => pushHistory(colors)}
                            />
                            <div className="swatch-hex-row">
                              <input
                                className={`swatch-hex-input ${normalizeHexDraft(hexDrafts[color.id] ?? color.hex) ? '' : 'invalid'}`}
                                value={hexDrafts[color.id] ?? color.hex.toUpperCase()}
                                spellCheck={false}
                                draggable={false}
                                aria-label={`${lang === 'es' ? 'Editar valor HEX para' : 'Edit HEX value for'} ${color.displayName}`}
                                onMouseDown={(event) => event.stopPropagation()}
                                onDragStart={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => handleHexDraftChange(color.id, event.target.value)}
                                onBlur={() => commitHexChange(color.id)}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                  if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                  }
                                  if (event.key === 'Escape') {
                                    setHexDrafts((drafts) => ({ ...drafts, [color.id]: color.hex.toUpperCase() }));
                                    event.currentTarget.blur();
                                  }
                                }}
                              />
                              {!isColorInGamut(color.oklch) && (
                                <span 
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '2px', 
                                    color: 'var(--button-amber)', 
                                    fontSize: '0.58rem', 
                                    fontWeight: 700, 
                                    marginRight: '2px',
                                    fontFamily: 'var(--font-mono)' 
                                  }}
                                  title={t('outOfSRGB')}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--button-amber)' }}>
                                    <MaterialIcon name="warning" size={10} />
                                  </span>
                                  <span>{t('out')}</span>
                                </span>
                              )}
                              <button
                                className="swatch-copy-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigator.clipboard.writeText(color.hex.toUpperCase()).then(() => {
                                    setCopiedColorId(color.id);
                                    setTimeout(() => setCopiedColorId(null), 1500);
                                  });
                                }}
                                title={t('copyHex')}
                              >
                                <MaterialIcon name={copiedColorId === color.id ? 'check' : 'content_copy'} size={12} />
                              </button>
                            </div>
                            <div className="swatch-oklch-info" style={{ 
                              display: 'flex', 
                              gap: '6px', 
                              fontSize: '0.58rem', 
                              opacity: 0.7, 
                              fontFamily: 'var(--font-mono)', 
                              background: 'var(--bg-input)', 
                              padding: '3px 6px', 
                              borderRadius: '2px', 
                              justifyContent: 'space-between',
                              marginTop: '4px',
                              marginBottom: '4px'
                            }}>
                              <span>L:{(color.oklch.l).toFixed(2)}</span>
                              <span>C:{(color.oklch.c).toFixed(2)}</span>
                              <span>H:{Math.round(color.oklch.h)}°</span>
                            </div>
                            <select 
                              className="role-select" 
                              value={color.role} 
                              draggable={false}
                              onMouseDown={(event) => event.stopPropagation()}
                              onDragStart={(e) => e.stopPropagation()}
                              onClick={(event) => event.stopPropagation()} 
                              onChange={(event) => handleRoleChange(color.id, event.target.value as ColorRole)}
                            >
                              {(['none', 'primary', 'secondary', 'accent', 'background', 'surface', 'text', 'muted', 'border', 'success', 'warning', 'error'] as ColorRole[]).map((role) => (
                                <option key={role} value={role}>{role.toUpperCase()}</option>
                              ))}
                            </select>
                            <div className="swatch-reorder-row">
                              <button
                                className="mini-move"
                                disabled={index === 0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleMoveColor(index, index - 1);
                                }}
                                title={t('moveLeft')}
                              >
                                <MaterialIcon name="keyboard_arrow_left" size={13} />
                              </button>
                              <button
                                className="mini-move"
                                disabled={index === colors.length - 1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleMoveColor(index, index + 1);
                                }}
                                title={t('moveRight')}
                              >
                                <MaterialIcon name="keyboard_arrow_right" size={13} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {colors.length < MAX_PALETTE_SIZE && (
                      <div
                        className="swatch-add-card" 
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!addColorDraft.trim()) handleAddColor();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && event.currentTarget === event.target) {
                            handleAddColor();
                          }
                        }}
                        title={t('addColor')}
                      >
                        <div className="swatch-add-icon">
                          <MaterialIcon name="add" size={26} />
                        </div>
                        <div className="swatch-add-controls">
                          <input
                            className={`swatch-add-hex-input ${addColorInvalid ? 'invalid' : ''}`}
                            value={addColorDraft}
                            placeholder="#A9A7A1"
                            spellCheck={false}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              setAddColorDraft(event.target.value.toUpperCase());
                              setAddColorInvalid(false);
                            }}
                            onBlur={commitAddColorDraft}
                            onKeyDown={(event) => {
                              event.stopPropagation();
                              if (event.key === 'Enter') {
                                commitAddColorDraft();
                                event.currentTarget.blur();
                              }
                              if (event.key === 'Escape') {
                                setAddColorDraft('');
                                setAddColorInvalid(false);
                                event.currentTarget.blur();
                              }
                            }}
                            aria-label={lang === 'es' ? 'Agregar color por codigo HEX' : 'Add color by HEX code'}
                          />
                          <button
                            className="swatch-add-paste-btn"
                            type="button"
                            title={lang === 'es' ? 'Pegar HEX del portapapeles' : 'Paste HEX from clipboard'}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePasteAddColor();
                            }}
                          >
                            <MaterialIcon name="content_copy" size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Unified Variation & Mutation Engine Panel */}
              <section className="studio-panel calculator-face variation-panel">
                <div className="panel-header variation-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {t('variationPanel')}
                      <span 
                        title={getTooltipText('variationPanelHelpWhat', 'variationPanelHelpHow')}
                        style={{ color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MaterialIcon name="info" size={14} />
                      </span>
                    </h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>{t('variationPanelDesc')}</p>
                  </div>
                  
                  <div className="mutation-controls-inline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setSlidersOpen(!slidersOpen)} 
                      className={`icon-button ${slidersOpen ? 'active' : ''}`}
                      style={{ padding: '4px', minHeight: '28px', minWidth: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      title={lang === 'es' ? 'Mostrar Ajustes y Sliders' : 'Toggle Settings & Sliders'}
                    >
                      <MaterialIcon name="tune" size={16} />
                    </button>
                    <button onClick={handleRefinePalette} className="calculator-action secondary">{t('refine')}</button>
                    <button onClick={handleMutatePalette} className="calculator-action amber">
                      <MaterialIcon name="auto_awesome" size={12} />
                      {t('mutate')}
                    </button>
                  </div>
                </div>

                {slidersOpen && (
                  <div className="variation-sliders-drawer" style={{ paddingTop: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="control-label-mini" style={{ margin: 0 }}>{t('mutationStrength')}</span>
                        <div className="button-strip">
                          {(['subtle', 'balanced', 'bold'] as MutationStrength[]).map((strength) => (
                            <button key={strength} className={mutationStrength === strength ? 'active' : ''} onClick={() => setMutationStrength(strength)} style={{ cursor: 'pointer' }}>
                              {lang === 'es' ? (strength === 'subtle' ? 'SUAVE' : strength === 'balanced' ? 'MODERADA' : 'ATREVIDA') : strength.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="control-label-mini" style={{ margin: 0 }}>{t('mutationTarget')}</span>
                        <div className="button-strip">
                          {(['all', 'selected'] as const).map((tgt) => (
                            <button key={tgt} className={slidersTarget === tgt ? 'active' : ''} onClick={() => setSlidersTarget(tgt)} style={{ cursor: 'pointer' }}>
                              {tgt === 'all' ? t('allColors') : t('activeColor')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="sliders-grid">
                      {[
                        ['temperature', lang === 'es' ? 'TEMPERATURA' : 'TEMPERATURE', sliders.temperature > 50 ? (lang === 'es' ? `CÁLIDO ${sliders.temperature}` : `WARM ${sliders.temperature}`) : sliders.temperature < 50 ? (lang === 'es' ? `FRÍO ${sliders.temperature}` : `COOL ${sliders.temperature}`) : (lang === 'es' ? 'NEUTRO' : 'NEUTRAL'), lang === 'es' ? 'Ajusta hacia tonos fríos (pizarra/zinc) o cálidos (terracota/madera).' : 'Adjust towards cool (slate/zinc) or warm (terracota/wood) tones.'],
                        ['muting', lang === 'es' ? 'APAGADO' : 'MUTING', `${sliders.muting}%`, lang === 'es' ? 'Muteado: Reduce la pureza cromática hacia tonos yeso/hormigón neutros y minerales.' : 'Muted: Reduces chromatic purity towards neutral plaster/concrete tones.'],
                        ['contrast', lang === 'es' ? 'CONTRASTE' : 'CONTRAST', `${sliders.contrast}%`, lang === 'es' ? 'Contraste: Incrementa la diferencia de luz (LRV) entre paredes, suelos y carpintería.' : 'Contrast: Increases light reflectance (LRV) difference between walls, floors, and openings.'],
                        ['luminosity', lang === 'es' ? 'LUMINOSIDAD' : 'LUMINOSITY', `${sliders.luminosity}%`, lang === 'es' ? 'Luminosidad: Sube o baja la reflectancia general de la paleta (sol de mediodía vs crepúsculo).' : 'Luminosity: Raises or lowers general reflectance (midday sun vs twilight).'],
                        ['cinematicFog', lang === 'es' ? 'NIEBLA CINEMÁTICA' : 'CINEMATIC FOG', `${sliders.cinematicFog}%`, lang === 'es' ? 'Niebla Cinemática: Aplica un velo mate y atmosférico (efecto arenado o difuso).' : 'Cinematic Fog: Applies a matte and atmospheric veil (sandblasted or diffuse effect).'],
                        ['materialFeel', lang === 'es' ? 'TACTO DE MATERIAL' : 'MATERIAL FEEL', `${sliders.materialFeel}%`, lang === 'es' ? 'Sensación de Material: Ajusta los valores para simular texturas orgánicas rugosas y mate.' : 'Material Feel: Adjusts values to simulate rough, matte organic textures.'],
                        ['warmAccent', lang === 'es' ? 'ACENTO CÁLIDO' : 'WARM ACCENT', `${sliders.warmAccent}%`, lang === 'es' ? 'Acento Cálido: Resalta detalles metálicos o maderas (como cobre, bronce o roble).' : 'Warm Accent: Highlights metallic details or wood tones (like copper, bronze, or oak).'],
                        ['futurism', lang === 'es' ? 'FUTURISMO VISIBLE' : 'VISIBLE FUTURISM', `${sliders.futurism}%`, lang === 'es' ? 'Futurismo Visible: Desvía matices hacia tonos sofisticados y silenciosos de la arquitectura premium.' : 'Visible Futurism: Offsets hues towards sophisticated, quiet tones of premium architecture.'],
                      ].map(([key, label, value, tooltip]) => (
                        <div key={key} className="blender-slider-wrapper" title={tooltip} style={{ cursor: 'help' }}>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={sliders[key as keyof SlidersState]} 
                            onChange={(event) => handleSliderChange(key as keyof SlidersState, Number(event.target.value))} 
                             onMouseUp={() => pushHistory(colors)}
                             onTouchEnd={() => pushHistory(colors)}
                            className="blender-slider"
                            style={{ '--value-percent': `${sliders[key as keyof SlidersState]}%` } as React.CSSProperties}
                          />
                          <div className="blender-slider-overlay">
                            <span className="blender-slider-label">{label}</span>
                            <span className="blender-slider-value">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Row 6: Collapsible Color Identity Settings */}
              <section className="studio-panel calculator-face">
                <div 
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingBottom: identityOpen ? '14px' : '4px',
                    borderBottom: identityOpen ? '1px solid var(--border-light)' : 'none',
                    marginBottom: identityOpen ? '16px' : '0px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <button 
                    className="identity-collapsible-trigger" 
                    onClick={() => setIdentityOpen(!identityOpen)}
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      flex: 1
                    }}
                  >
                    <div>
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                          <MaterialIcon name="settings" size={14} />
                        </span>
                        {t('colorIdentity')}
                        <span 
                          title={getTooltipText('colorIdentityHelpWhat', 'colorIdentityHelpHow')}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MaterialIcon name="info" size={14} />
                        </span>
                      </h3>
                      <p className="section-description" style={{ margin: '4px 0 0' }}>
                        {t('colorIdentityDesc')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                      <span style={{ transform: identityOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', display: 'inline-flex' }}>
                        <MaterialIcon name="keyboard_arrow_right" size={18} />
                      </span>
                    </div>
                  </button>
                </div>
                {identityOpen && (
                  <div className="collapsible-content">
                    <IdentityPanel 
                      identity={identity} 
                      onIdentityChange={handleIdentitySliderChange} 
                      onInteractionEnd={handleIdentityInteractionEnd} 
                      lang={lang}
                    />
                  </div>
                )}
              </section>

              {/* Row 7: Collapsible Architectural Blueprint Guide */}
              <section className="studio-panel calculator-face inline-cmf-guide-panel">
                <button 
                  className="identity-collapsible-trigger" 
                  onClick={() => setHelpOpen(!helpOpen)}
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'transparent',
                    border: 0,
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                    paddingBottom: helpOpen ? '14px' : '4px',
                    borderBottom: helpOpen ? '1px solid var(--border-light)' : 'none',
                    marginBottom: helpOpen ? '16px' : '0px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                        <MaterialIcon name="menu_book" size={14} />
                      </span>
                      {t('architecturalCmfGuide')}
                    </h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>
                      {t('cmfGuideDesc')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ transform: helpOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', display: 'inline-flex' }}>
                      <MaterialIcon name="keyboard_arrow_right" size={18} />
                    </span>
                  </div>
                </button>
                {helpOpen && (
                  <div className="collapsible-content CmfGuide" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    <div style={{ borderBottom: '1px dashed var(--border-medium)', paddingBottom: '10px' }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: "var(--font-mono)" }}>{lang === 'es' ? 'COORDENADAS (OKLCH) A MATERIALES FÍSICOS' : 'COORDINATES (OKLCH) TO PHYSICAL MATERIALS'}</h4>
                      <ul style={{ listStyleType: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <li>
                          <strong>{lang === 'es' ? 'Luminosidad (L) / LRV:' : 'Lightness (L) / LRV:'}</strong> {t('lrvLightnessDesc')}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px', opacity: 0.8, fontSize: 'var(--font-size-xxs)' }}>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'L ~0.95: Yeso / Tiza' : 'L ~0.95: Plaster / Chalk'}</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'L ~0.55: Hormigón / Piedra' : 'L ~0.55: Concrete / Stone'}</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'L ~0.20: Acero / Grafito' : 'L ~0.20: Steel / Graphite'}</span>
                          </div>
                        </li>
                        <li>
                          <strong>{lang === 'es' ? 'Croma (C) / Pureza:' : 'Chroma (C) / Purity:'}</strong> {t('chromaPurityDesc')}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px', opacity: 0.8, fontSize: 'var(--font-size-xxs)' }}>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'C 0.00-0.03: Hormigón, Pizarra, Níquel' : 'C 0.00-0.03: Concrete, Slate, Nickel'}</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'C 0.04-0.08: Travertino, Roble, Caliza' : 'C 0.04-0.08: Travertine, Oak, Limestone'}</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'C > 0.10: Acentos Sintéticos' : 'C > 0.10: Synthetic Accents'}</span>
                          </div>
                        </li>
                        <li>
                          <strong>{lang === 'es' ? 'Tono (H) / Temperatura:' : 'Hue (H) / Temperature:'}</strong> {t('hueTempDesc')}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px', opacity: 0.8, fontSize: 'var(--font-size-xxs)' }}>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'H ~35°: Terracota / Arcilla' : 'H ~35°: Terracotta / Clay'}</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'H ~75°: Travertino Cálido / Roble' : 'H ~75°: Warm Travertine / Oak'}</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'H ~135°: Liquen / Verde Musgo' : 'H ~135°: Lichen / Moss Green'}</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>{lang === 'es' ? 'H ~220°: Azul Pizarra / Gris Zinc' : 'H ~220°: Slate Blue / Zinc Grey'}</span>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: "var(--font-mono)" }}>{t('workflowTips')}</h4>
                      <p style={{ margin: 0, lineHeight: 1.4 }}>
                        {t('tip1')}
                        <br />
                        {t('tip2')}
                        <br />
                        {t('tip3')}
                      </p>
                    </div>
                  </div>
                )}
              </section>

            </div>

            {/* RIGHT COLUMN: Previews, accessibility, exports (STICKY SIDEBAR) */}
            <aside className="right-column sticky-sidebar stack">
              
              {/* Live Mockup Preview */}
              <section className="studio-panel calculator-face">
                <MockupViewer key={mode} colors={colors} mode={mode} onModeChange={handleModeChange} paletteName={paletteName} lang={lang} />
              </section>

            </aside>
          </>
        ) : (
          <>
            {/* COLUMN 1: harmony Harmony Sidebar (Left) */}
            <div className="left-column stack harmony-sidebar">
              <section className="studio-panel calculator-face">
                <div className="panel-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {t('harmonyRules')}
                      <span 
                        title={getTooltipText('harmonyRulesHelpWhat', 'harmonyRulesHelpHow')}
                        style={{ color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MaterialIcon name="info" size={14} />
                      </span>
                    </h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>{t('harmonyRulesDesc')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {HARMONIES.map((harmony) => {
                    const isActive = activeHarmonyId === harmony.id;
                    return (
                      <button
                        key={harmony.id}
                        className={`harmony-rule-btn ${isActive ? 'active' : ''}`}
                        onClick={() => handleHarmonyChange(harmony.id)}
                      >
                        <span className="harmony-rule-name">{t((harmony.id + 'Name') as keyof typeof TRANSLATIONS['en']) || harmony.name}</span>
                        <span className="harmony-rule-desc">{t((harmony.id + 'Desc') as keyof typeof TRANSLATIONS['en']) || harmony.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Collapsible Architectural Guide */}
              <section className="studio-panel calculator-face inline-cmf-guide-panel">
                <button 
                  className="identity-collapsible-trigger" 
                  onClick={() => setHelpOpen(!helpOpen)}
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'transparent',
                    border: 0,
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                    paddingBottom: helpOpen ? '10px' : '0px',
                    borderBottom: helpOpen ? '1px solid var(--border-light)' : 'none',
                    marginBottom: helpOpen ? '12px' : '0px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <MaterialIcon name="menu_book" size={14} />
                    {t('cmfGuide')}
                  </h3>
                  <span style={{ transform: helpOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', display: 'inline-flex' }}>
                    <MaterialIcon name="keyboard_arrow_right" size={18} />
                  </span>
                </button>
                {helpOpen && (
                  <div style={{ fontSize: 'var(--font-size-xxs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong>{lang === 'es' ? 'LRV (Luminosidad):' : 'LRV (Lightness):'}</strong>
                      <div style={{ opacity: 0.8 }}>{lang === 'es' ? 'L ~0.95: Yeso | L ~0.55: Hormigón | L ~0.20: Acero' : 'L ~0.95: Plaster | L ~0.55: Concrete | L ~0.20: Steel'}</div>
                    </div>
                    <div>
                      <strong>{lang === 'es' ? 'Croma (Pureza):' : 'Chroma (Purity):'}</strong>
                      <div style={{ opacity: 0.8 }}>{lang === 'es' ? 'C 0.0-0.03: Pizarra | C 0.04-0.08: Travertino/Madera' : 'C 0.0-0.03: Slate | C 0.04-0.08: Travertine/Wood'}</div>
                    </div>
                    <div>
                      <strong>{lang === 'es' ? 'Tono (Temperatura):' : 'Hue (Temperature):'}</strong>
                      <div style={{ opacity: 0.8 }}>{lang === 'es' ? 'H ~35°: Arcilla | H ~75°: Roble | H ~135°: Liquen' : 'H ~35°: Clay | H ~75°: Oak | H ~135°: Lichen'}</div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* COLUMN 2: harmony Center Workspace */}
            <div className="harmony-center-workspace">
              {/* Polar Color Wheel Section */}
              <section className="studio-panel calculator-face harmony-wheel-panel" style={{ background: 'var(--bg-panel-deep)' }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {t('geometricHarmony')}
                      <span 
                        title={getTooltipText('geometricHarmonyHelpWhat', 'geometricHarmonyHelpHow')}
                        style={{ color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MaterialIcon name="info" size={14} />
                      </span>
                    </h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>{t('geometricHarmonyDesc')}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="control-label-mini" style={{ margin: 0 }}>{t('picker')}</span>
                    <div className="button-strip">
                      {(['wheel', 'plane_lc', 'plane_hc'] as const).map((shape) => (
                        <button
                          key={shape}
                          className={pickerShape === shape ? 'active' : ''}
                          onClick={() => setPickerShape(shape)}
                          style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '0.65rem' }}
                        >
                          {shape === 'wheel' ? t('wheel') : shape === 'plane_lc' ? t('lc') : t('hc')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <ColorWheel 
                  activeColor={activeColor} 
                  colors={colors} 
                  onColorChange={handleColorWheelChange} 
                  onSelectColor={(color) => setActiveColorId(color.id)} 
                  size={260}
                  hoveredColorId={hoveredColorId}
                  onHoverColor={setHoveredColorId}
                  onInteractionEnd={() => pushHistory(colors)}
                  pickerShape={pickerShape}
                  drawHarmonyLines={true}
                  harmonyBaseColorId={harmonyBaseColorId}
                  lang={lang}
                />
              </section>

              <div className="harmony-control-row">
                <span className="harmony-count-note">
                  {colors.length} {t('colorsActive')}
                </span>
              </div>

              {/* Swatches strip container */}
              <div className="harmony-swatches-container">
                {colors.map((color, index) => {
                  const isActive = color.id === activeColorId;
                  const isBase = color.id === harmonyBaseColorId;
                  return (
                    <article 
                      key={color.id} 
                      className={`harmony-swatch-strip ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveColorId(color.id)}
                    >
                      {/* Color block header */}
                      <div 
                        className="harmony-strip-fill" 
                        style={{ backgroundColor: color.hex }}
                      >
                        <span className="harmony-strip-badge">{index + 1}</span>
                        <div className="harmony-strip-actions">
                          <button 
                            className={`harmony-strip-btn ${isBase ? 'active-base' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHarmonyBaseColorId(color.id);
                              // Recalculate harmony using this color as base
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
                            }}
                            title={isBase ? t('anchorBase') : t('setAnchor')}
                          >
                            <MaterialIcon name={isBase ? "anchor" : "pin_drop"} size={11} />
                          </button>
                          <button 
                            className="harmony-strip-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLock(color.id);
                            }}
                            title={color.locked ? t('unlockColor') : t('lockColor')}
                            style={{ color: color.locked ? "var(--button-amber)" : "rgba(255,255,255,0.85)" }}
                          >
                            <MaterialIcon name={color.locked ? "lock" : "lock_open"} size={11} />
                          </button>
                          <button
                            className="harmony-strip-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteColor(color.id);
                            }}
                            title={t('deleteColor')}
                          >
                            <MaterialIcon name="close" size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Swatch Info & Mini sliders */}
                      <div className="harmony-strip-info" onMouseDown={(e) => e.stopPropagation()}>
                        <input 
                          className="harmony-strip-name" 
                          value={color.displayName}
                          onChange={(e) => handleRenameColor(color.id, e.target.value)}
                          onBlur={() => pushHistory(colors)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <input 
                          className={`harmony-strip-hex ${normalizeHexDraft(hexDrafts[color.id] ?? color.hex) ? '' : 'invalid'}`}
                          value={hexDrafts[color.id] ?? color.hex.toUpperCase()}
                          onChange={(e) => handleHexDraftChange(color.id, e.target.value)}
                          onBlur={() => commitHexChange(color.id)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') {
                              setHexDrafts((drafts) => ({ ...drafts, [color.id]: color.hex.toUpperCase() }));
                              e.currentTarget.blur();
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          spellCheck={false}
                        />

                        {/* Individual Sliders */}
                        <div className="harmony-strip-sliders">
                          <div className="harmony-mini-slider-wrapper">
                            <div className="harmony-mini-slider-header">
                              <span>L</span>
                              <span>{color.oklch.l.toFixed(2)}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.01" 
                              value={color.oklch.l} 
                              className="harmony-mini-slider"
                              onChange={(e) => {
                                handleIndividualColorOklchChange(color.id, {
                                  ...color.oklch,
                                  l: parseFloat(e.target.value)
                                });
                              }}
                              onMouseUp={() => pushHistory(colors)}
                              onTouchEnd={() => pushHistory(colors)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="harmony-mini-slider-wrapper">
                            <div className="harmony-mini-slider-header">
                              <span>C</span>
                              <span>{color.oklch.c.toFixed(2)}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="0.4" 
                              step="0.01" 
                              value={color.oklch.c} 
                              className="harmony-mini-slider"
                              onChange={(e) => {
                                handleIndividualColorOklchChange(color.id, {
                                  ...color.oklch,
                                  c: parseFloat(e.target.value)
                                });
                              }}
                              onMouseUp={() => pushHistory(colors)}
                              onTouchEnd={() => pushHistory(colors)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="harmony-mini-slider-wrapper">
                            <div className="harmony-mini-slider-header">
                              <span>H</span>
                              <span>{Math.round(color.oklch.h)}°</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="360" 
                              step="1" 
                              value={color.oklch.h} 
                              className="harmony-mini-slider"
                              onChange={(e) => {
                                handleIndividualColorOklchChange(color.id, {
                                  ...color.oklch,
                                  h: parseFloat(e.target.value)
                                });
                              }}
                              onMouseUp={() => pushHistory(colors)}
                              onTouchEnd={() => pushHistory(colors)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        {/* Role Select */}
                        <select 
                          className="role-select" 
                          value={color.role}
                          onChange={(e) => handleRoleChange(color.id, e.target.value as ColorRole)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: '0.58rem', padding: '2px', width: '100%', height: '20px' }}
                        >
                          {['none', 'primary', 'secondary', 'accent', 'background', 'surface', 'text', 'muted', 'border', 'success', 'warning', 'error'].map((r) => (
                            <option key={r} value={r}>{r.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 3: Sticky Previews & Metrology (Right) */}
            <aside className="right-column sticky-sidebar stack">
              <section className="studio-panel calculator-face">
                <MockupViewer key={mode} colors={colors} mode={mode} onModeChange={handleModeChange} paletteName={paletteName} lang={lang} />
              </section>

              <section className="studio-panel calculator-face">
                <div className="panel-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {t('metrologyEngine')}
                    <span 
                      title={getTooltipText('metrologyEngineHelpWhat', 'metrologyEngineHelpHow')}
                      style={{ color: 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <MaterialIcon name="info" size={14} />
                    </span>
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
                    <span>{t('paletteSize').toUpperCase()}</span>
                    <strong>{colors.length}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleRefinePalette} className="calculator-action secondary" style={{ flex: 1, minHeight: '28px', fontSize: '0.7rem' }}>{t('refine')}</button>
                    <button onClick={handleMutatePalette} className="calculator-action amber" style={{ flex: 1, minHeight: '28px', fontSize: '0.7rem' }}>{t('mutate')}</button>
                  </div>
                  <div className="button-strip" style={{ width: '100%' }}>
                    {(['subtle', 'balanced', 'bold'] as MutationStrength[]).map((strength) => (
                      <button key={strength} className={mutationStrength === strength ? 'active' : ''} onClick={() => setMutationStrength(strength)} style={{ cursor: 'pointer', flex: 1, padding: '4px', fontSize: '0.65rem' }}>
                        {lang === 'es' ? (strength === 'subtle' ? 'SUAVE' : strength === 'balanced' ? 'MODERADA' : 'ATREVIDA') : strength.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </aside>
          </>
        )}
      </div>
      {helpOpen && (
        <div className="guide-overlay" role="dialog" aria-modal="true" aria-label={lang === 'es' ? 'Guia de uso' : 'Usage guide'} onMouseDown={() => setHelpOpen(false)}>
          <section className="guide-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="guide-drawer-header">
              <div>
                <span className="guide-eyebrow">{lang === 'es' ? 'GUIA DE USO' : 'USAGE GUIDE'}</span>
                <h2>{lang === 'es' ? 'Color Studio como instrumento CMF' : 'Color Studio as a CMF instrument'}</h2>
              </div>
              <button className="icon-button" onClick={() => setHelpOpen(false)} aria-label={lang === 'es' ? 'Cerrar guia' : 'Close guide'}>
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <div className="guide-drawer-grid">
              <article>
                <h3>{lang === 'es' ? 'Coordenadas OKLCH' : 'OKLCH coordinates'}</h3>
                <p><strong>L</strong> {t('lrvLightnessDesc')}</p>
                <p><strong>C</strong> {t('chromaPurityDesc')}</p>
                <p><strong>H</strong> {t('hueTempDesc')}</p>
              </article>
              <article>
                <h3>{lang === 'es' ? 'Referencias materiales' : 'Material references'}</h3>
                <div className="guide-token-row">
                  <span>{lang === 'es' ? 'L 0.95 / yeso' : 'L 0.95 / plaster'}</span>
                  <span>{lang === 'es' ? 'L 0.55 / hormigon' : 'L 0.55 / concrete'}</span>
                  <span>{lang === 'es' ? 'L 0.20 / grafito' : 'L 0.20 / graphite'}</span>
                  <span>{lang === 'es' ? 'C 0.04-0.08 / madera, travertino' : 'C 0.04-0.08 / wood, travertine'}</span>
                  <span>{lang === 'es' ? 'H 35 / arcilla' : 'H 35 / clay'}</span>
                  <span>{lang === 'es' ? 'H 135 / liquen' : 'H 135 / lichen'}</span>
                </div>
              </article>
              <article>
                <h3>{t('workflowTips')}</h3>
                <p>{t('tip1')}</p>
                <p>{t('tip2')}</p>
                <p>{t('tip3')}</p>
              </article>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
