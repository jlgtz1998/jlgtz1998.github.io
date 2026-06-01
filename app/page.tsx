'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorData, ColorRole, DesignMode, MutationStrength, OklchColor, SlidersState, UserIdentity, Preset } from '../types';
import { PRESETS } from '../data/presets';
import { INFLUENCES } from '../data/influences';
import { HARMONIES, generateHarmony } from '../lib/harmony';
import { generateColorName } from '../lib/naming';
import { createColorFromHex, createColorFromOklch, hexToOklch, oklchToHex, isColorInGamut } from '../lib/color-spaces';
import { applySliders, NEUTRAL_SLIDERS, generateFromIdentity, mutateColor } from '../lib/variation';
import { checkApca, checkWcag } from '../lib/accessibility';
import { exportPaletteToSvg } from '../lib/exporters/svg-exporter';
import { printPaletteCatalog } from '../lib/exporters/pdf-exporter';
import { createPaletteFromPreset, DEFAULT_PALETTE_SIZE, MAX_PALETTE_SIZE, MIN_PALETTE_SIZE, moveColor, roleForIndex } from '../lib/palette';
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

const APP_VERSION_LABEL = 'v0.1.7';
const APP_BUILD_LABEL = '2026.05.31';

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

export default function Cran3oColorStudio() {
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
  const [slidersOpen, setSlidersOpen] = useState(false);
  const [pickerShape, setPickerShape] = useState<PickerShape>('wheel');
  const [colorMemoryBank, setColorMemoryBank] = useState<Record<number, ColorData>>({});
  const [slidersTarget, setSlidersTarget] = useState<'all' | 'selected'>('all');
  const [helpOpen, setHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'instrument' | 'harmony'>('instrument');
  const [harmonyBaseColorId, setHarmonyBaseColorId] = useState<string | null>(null);

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

    const savedIdentity = localStorage.getItem(STORAGE_KEYS.identity);
    const savedMode = localStorage.getItem(STORAGE_KEYS.mode) as DesignMode | null;
    const savedSizeRaw = localStorage.getItem(STORAGE_KEYS.paletteSize);
    const savedSize = savedSizeRaw ? Number(savedSizeRaw) : Number.NaN;
    const initialMode = savedMode || 'architecture';
    const initialSize = Number.isFinite(savedSize) ? Math.max(MIN_PALETTE_SIZE, Math.min(MAX_PALETTE_SIZE, savedSize)) : DEFAULT_PALETTE_SIZE;

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

  useEffect(() => {
    setHexDrafts(() => {
      const next: Record<string, string> = {};
      colors.forEach((color) => {
        next[color.id] = color.hex.toUpperCase();
      });
      return next;
    });
  }, [colors]);

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
    const nextHistory = [...cleanHistory, newColors];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const updateColorsAndPushHistory = (nextColors: ColorData[]) => {
    setColors(nextColors);
    const cleanHistory = history.slice(0, historyIndex + 1);
    const nextHistory = [...cleanHistory, nextColors];
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

  const handlePaletteSizeChange = (nextSize: number) => {
    const clampedNext = Math.max(MIN_PALETTE_SIZE, Math.min(MAX_PALETTE_SIZE, nextSize));
    let nextColors = [...colors];
    
    if (clampedNext < colors.length) {
      // Downsizing: backup colors to memory bank
      const discarded = colors.slice(clampedNext);
      setColorMemoryBank(prev => ({
        ...prev,
        ...Object.fromEntries(discarded.map((c, i) => [clampedNext + i, c]))
      }));
      nextColors = colors.slice(0, clampedNext);
    } else if (clampedNext > colors.length) {
      // Upsizing: restore from memory bank or generate
      while (nextColors.length < clampedNext) {
        const idx = nextColors.length;
        if (colorMemoryBank[idx]) {
          nextColors.push(colorMemoryBank[idx]);
        } else {
          // Fallback to generation
          const source = nextColors[nextColors.length - 1];
          const generated = source
            ? mutateColor(source, nextColors.length % 2 === 0 ? 'balanced' : 'subtle')
            : createColorFromHex('#d6cec1', 'Bone Dust');
          
          nextColors.push({
            ...generated,
            id: `color-${Date.now()}-${idx}`,
            locked: false,
            role: roleForIndex(mode, idx),
          });
        }
      }
    }
    
    setPaletteSize(clampedNext);
    setColorsKeepingActive(nextColors);
    pushHistory(nextColors);
  };

  const handleDeleteColor = (id: string) => {
    if (colors.length <= MIN_PALETTE_SIZE) return;
    const nextColors = colors.filter((color) => color.id !== id);
    setPaletteSize(nextColors.length);
    setColorsKeepingActive(nextColors);
    if (harmonyBaseColorId === id) {
      setHarmonyBaseColorId(nextColors[0]?.id ?? null);
    }
    pushHistory(nextColors);
  };

  const handleAddColor = () => {
    if (colors.length >= MAX_PALETTE_SIZE) return;
    const baseColor = activeColor || colors[colors.length - 1];
    if (!baseColor) return;
    const newColor = mutateColor(baseColor, 'subtle');
    newColor.id = `color-${Date.now()}`;
    newColor.locked = false;

    const nextColors = [...colors, newColor];
    setPaletteSize(nextColors.length);
    setColorsKeepingActive(nextColors);
    setActiveColorId(newColor.id);
    pushHistory(nextColors);
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
    const blob = new Blob([exportPaletteToSvg(colors, paletteName, INFLUENCES[mode].name)], { type: 'image/svg+xml' });
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
      await navigator.clipboard.writeText(text);
    }
  };

  const handleExportPng = () => {
    const rowHeight = 82;
    const canvas = document.createElement('canvas');
    canvas.width = 920;
    canvas.height = colors.length * rowHeight + 210;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#111313';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f1eee6';
    ctx.font = '600 26px Inter, Arial';
    ctx.fillText(paletteName, 48, 74);
    ctx.fillStyle = '#b5b0a5';
    ctx.font = '500 12px Inter, Arial';
    ctx.fillText(`${INFLUENCES[mode].name} / ${colors.length} colors / OKLCH`, 48, 100);

    colors.forEach((color, index) => {
      const y = 140 + index * rowHeight;
      ctx.fillStyle = color.hex;
      ctx.fillRect(48, y, 104, 56);
      ctx.strokeStyle = 'rgba(241,238,230,0.18)';
      ctx.strokeRect(48, y, 104, 56);
      ctx.fillStyle = '#f1eee6';
      ctx.font = '600 16px Inter, Arial';
      ctx.fillText(color.displayName, 176, y + 22);
      ctx.fillStyle = '#b5b0a5';
      ctx.font = '500 12px JetBrains Mono, monospace';
      ctx.fillText(`${color.hex.toUpperCase()} / ${color.role}`, 176, y + 44);
      ctx.fillText(`RGB ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`, 440, y + 22);
      ctx.fillText(`OKLCH ${color.oklch.l.toFixed(2)}, ${color.oklch.c.toFixed(3)}, ${Math.round(color.oklch.h)}`, 440, y + 44);
    });

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${sanitizeFileName(paletteName)}-palette.png`;
    a.click();
  };

  const handlePrintPdf = () => {
    printPaletteCatalog(colors, paletteName, INFLUENCES[mode].name);
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
          <span className="logo-sub">{'// ARCHITECTURE / INDUSTRIAL / GRAPHIC'}</span>
          <span className="build-badge" title="Current deployed build">
            {APP_VERSION_LABEL} / {APP_BUILD_LABEL}
          </span>
        </div>

        <div className="workspace-toggle-bar">
          <button 
            className={`workspace-tab-btn ${viewMode === 'instrument' ? 'active' : ''}`}
            onClick={() => setViewMode('instrument')}
          >
            STUDIO INSTRUMENT
          </button>
          <button 
            className={`workspace-tab-btn ${viewMode === 'harmony' ? 'active' : ''}`}
            onClick={() => setViewMode('harmony')}
          >
            HARMONY WORKSPACE
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Undo */}
          <button 
            className="icon-button" 
            onClick={handleUndo} 
            disabled={historyIndex <= 0} 
            title="Undo (Ctrl+Z)"
            style={{ opacity: historyIndex <= 0 ? 0.35 : 1 }}
          >
            <MaterialIcon name="undo" size={20} />
          </button>

          {/* Redo */}
          <button 
            className="icon-button" 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1} 
            title="Redo (Ctrl+Y)"
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
              title="Contrast & Accessibility Matrix"
            >
              <MaterialIcon name="check" size={20} />
            </button>
            {contrastOpen && (
              <div className="settings-menu" style={{ minWidth: '380px', right: 0 }}>
                <div className="settings-menu-title">CONTRAST MATRIX</div>
                <p className="section-description" style={{ marginBottom: '8px', padding: '0 8px' }}>WCAG 2.1 and APCA contrast scores for the current palette.</p>
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

          {/* Export Options */}
          <div className="settings-wrap" style={{ position: 'relative' }}>
            <button className="icon-button" onClick={() => { setExportOpen((open) => !open); setSettingsOpen(false); setContrastOpen(false); setPresetsOpen(false); }} aria-expanded={exportOpen} aria-label="Export palette" title="Export options">
              <MaterialIcon name="download" size={20} />
            </button>
            {exportOpen && (
              <div className="settings-menu">
                <div className="settings-menu-title">EXPORT SWATCHES</div>
                <button className="settings-menu-row" onClick={() => { handlePrintPdf(); setExportOpen(false); }}>
                  <MaterialIcon name="picture_as_pdf" />
                  PDF SHEET
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportSvg(); setExportOpen(false); }}>
                  <MaterialIcon name="download" />
                  SVG VECTOR
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportPng(); setExportOpen(false); }}>
                  <MaterialIcon name="image" />
                  RETINA PNG
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportJson(); setExportOpen(false); }}>
                  <MaterialIcon name="data_object" />
                  JSON SWATCHES
                </button>
                <button className="settings-menu-row" onClick={() => { handleExportCss(); setExportOpen(false); }}>
                  <MaterialIcon name="css" />
                  CSS VARIABLES
                </button>
                <button className="settings-menu-row" onClick={() => { handleCopyClipboardList(); setExportOpen(false); }}>
                  <MaterialIcon name={copied ? 'check' : 'content_copy'} />
                  {copied ? 'COPIED' : 'COPY COLOR LIST'}
                </button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="settings-wrap" style={{ position: 'relative' }}>
            <button className="icon-button" onClick={() => { setSettingsOpen((open) => !open); setExportOpen(false); setContrastOpen(false); setPresetsOpen(false); }} aria-expanded={settingsOpen} aria-label="Open settings" title="Settings">
              <MaterialIcon name="settings" size={20} />
            </button>
            {settingsOpen && (
              <div className="settings-menu">
                <div className="settings-menu-title">SETTINGS</div>
                <button className="settings-menu-row" onClick={() => setIsDarkMode(!isDarkMode)}>
                  <MaterialIcon name={isDarkMode ? 'light_mode' : 'dark_mode'} />
                  {isDarkMode ? 'LIGHT MODE' : 'DARK MODE'}
                </button>
                <label className="settings-field">
                  <span>VISION SIMULATOR</span>
                  <select value={blindnessSim} onChange={(event) => setBlindnessSim(event.target.value as VisionMode)}>
                    <option value="normal">NORMAL VIEW</option>
                    <option value="protanopia">PROTANOPIA</option>
                    <option value="deuteranopia">DEUTERANOPIA</option>
                    <option value="tritanopia">TRITANOPIA</option>
                    <option value="achromatopsia">ACHROMATOPSIA</option>
                  </select>
                </label>
              </div>
            )}
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
                      <h3 className="section-title" style={{ margin: 0 }}>COLOR INSTRUMENT</h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>Shape hue, lightness, and chroma with architectural restraint.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="control-label-mini" style={{ margin: 0, opacity: 0.8 }}>PICKER</span>
                      <div className="button-strip">
                        {(['wheel', 'plane_lc', 'plane_hc'] as const).map((shape) => (
                          <button
                            key={shape}
                            className={pickerShape === shape ? 'active' : ''}
                            onClick={() => setPickerShape(shape)}
                            style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '0.65rem' }}
                            title={shape === 'wheel' ? 'CHROMATIC WHEEL' : shape === 'plane_lc' ? 'L-C PLANE (LIGHTNESS/CHROMA)' : 'H-C PLANE (HUE/CHROMA)'}
                          >
                            {shape === 'wheel' ? 'WHEEL' : shape === 'plane_lc' ? 'L-C' : 'H-C'}
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
                      />
                    </div>

                    <div className="harmony-controls-block">
                      <span className="control-label-mini">HARMONY</span>
                      <div className="harmony-action-row">
                        <select className="select-control" value={activeHarmonyId} onChange={(event) => handleHarmonyChange(event.target.value)}>
                          {HARMONIES.map((harmony) => <option key={harmony.id} value={harmony.id}>{harmony.name}</option>)}
                        </select>
                        <button onClick={handleGenerateHarmony} className="calculator-action primary" title="Re-apply active harmony to non-locked colors">
                          <MaterialIcon name="sync" size={12} />
                          RE-APPLY
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Right: Swatches Panel */}
                <section className="studio-panel calculator-face swatches-panel">
                  <div className="panel-header swatches-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '8px' }}>
                    <div>
                      <h3 className="section-title">PALETTE SYSTEM MATRIX</h3>
                      <p className="section-description">Curate ordered color tokens for spatial, CMF, and graphic systems.</p>
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
                          <span>PRESETS</span>
                          <MaterialIcon name="arrow_drop_down" size={14} />
                        </button>
                        {presetsOpen && (
                          <div className="settings-menu presets-menu" style={{ width: '280px', maxHeight: '400px', overflowY: 'auto', zIndex: 100, left: 0, right: 'auto' }}>
                            <div className="settings-menu-title">STUDIO PRESETS</div>
                            {[
                              { label: 'UNIVERSAL', items: PRESETS.filter(p => !p.mode) },
                              { label: 'ARCHITECTURE', items: PRESETS.filter(p => p.mode === 'architecture') },
                              { label: 'INDUSTRIAL', items: PRESETS.filter(p => p.mode === 'industrial') },
                              { label: 'GRAPHIC DESIGN', items: PRESETS.filter(p => p.mode === 'graphic') },
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
                    <label className="palette-size-control" title="Palette size">
                      <span>SIZE</span>
                      <input
                        type="range"
                        min={MIN_PALETTE_SIZE}
                        max={MAX_PALETTE_SIZE}
                        step="1"
                        value={paletteSize}
                        onChange={(event) => handlePaletteSizeChange(Number(event.target.value))}
                      />
                      <strong>{paletteSize}</strong>
                    </label>
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
                          draggable
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
                          onDragEnd={finishDragReorder}
                          onDrop={finishDragReorder}
                          onMouseEnter={() => setHoveredColorId(color.id)}
                          onMouseLeave={() => setHoveredColorId(null)}
                          onContextMenu={(event) => handleCopySwatchCard(event, color, index)}
                          title="Right-click to copy this color card as an image"
                        >
                          <div className="swatch-fill" style={{ backgroundColor: color.hex }}>
                            <div
                              className="drag-handle"
                              title="Drag to reorder"
                            >
                              <MaterialIcon name="drag_indicator" size={14} />
                            </div>
                            <button 
                              className={`swatch-lock-indicator-fill ${color.locked ? 'locked-state' : ''}`} 
                              onClick={(event) => { event.stopPropagation(); handleToggleLock(color.id); }} 
                              title={color.locked ? 'Unlock color' : 'Lock color'}
                            >
                              <MaterialIcon name={color.locked ? 'lock' : 'lock_open'} size={13} />
                            </button>
                            {colors.length > MIN_PALETTE_SIZE && (
                              <button
                                className="swatch-delete-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteColor(color.id);
                                }}
                                title="Delete color"
                              >
                                <MaterialIcon name="close" size={12} />
                              </button>
                            )}
                          </div>

                          <div className="swatch-info">
                            <input 
                              className="swatch-name" 
                              value={color.displayName} 
                              draggable={false}
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
                                aria-label={`Edit HEX value for ${color.displayName}`}
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
                                  title="Out of sRGB Gamut (Color will be clamped by browsers)"
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--button-amber)' }}>
                                    <MaterialIcon name="warning" size={10} />
                                  </span>
                                  <span>OUT</span>
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
                                title="Copy HEX"
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
                                title="Move left"
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
                                title="Move right"
                              >
                                <MaterialIcon name="keyboard_arrow_right" size={13} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {colors.length < MAX_PALETTE_SIZE && (
                      <button 
                        className="swatch-add-card" 
                        onClick={handleAddColor}
                        title="Add new color"
                      >
                        <MaterialIcon name="add" size={24} />
                        <span>Add Color</span>
                      </button>
                    )}
                  </div>
                </section>
              </div>

              {/* Unified Variation & Mutation Engine Panel */}
              <section className="studio-panel calculator-face variation-panel">
                <div className="panel-header variation-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0 }}>VARIATION & MUTATION ENGINE</h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>Calibrate temperature, restraint, contrast, and material presence in OKLCH.</p>
                  </div>
                  
                  <div className="mutation-controls-inline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setSlidersOpen(!slidersOpen)} 
                      className={`icon-button ${slidersOpen ? 'active' : ''}`}
                      style={{ padding: '4px', minHeight: '28px', minWidth: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Toggle Settings & Sliders"
                    >
                      <MaterialIcon name="tune" size={16} />
                    </button>
                    <button onClick={handleRefinePalette} className="calculator-action secondary">REFINE</button>
                    <button onClick={handleMutatePalette} className="calculator-action amber">
                      <MaterialIcon name="auto_awesome" size={12} />
                      MUTATE
                    </button>
                  </div>
                </div>

                {slidersOpen && (
                  <div className="variation-sliders-drawer" style={{ paddingTop: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="control-label-mini" style={{ margin: 0 }}>MUTATION STRENGTH</span>
                        <div className="button-strip">
                          {(['subtle', 'balanced', 'bold'] as MutationStrength[]).map((strength) => (
                            <button key={strength} className={mutationStrength === strength ? 'active' : ''} onClick={() => setMutationStrength(strength)} style={{ cursor: 'pointer' }}>
                              {strength.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="control-label-mini" style={{ margin: 0 }}>MUTATION TARGET</span>
                        <div className="button-strip">
                          {(['all', 'selected'] as const).map((tgt) => (
                            <button key={tgt} className={slidersTarget === tgt ? 'active' : ''} onClick={() => setSlidersTarget(tgt)} style={{ cursor: 'pointer' }}>
                              {tgt === 'all' ? 'ALL COLORS' : 'ACTIVE COLOR'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="sliders-grid">
                      {[
                        ['temperature', 'TEMPERATURE', sliders.temperature > 50 ? `WARM ${sliders.temperature}` : sliders.temperature < 50 ? `COOL ${sliders.temperature}` : 'NEUTRAL', 'Ajusta hacia tonos fríos (pizarra/zinc) o cálidos (terracota/madera).'],
                        ['muting', 'MUTING', `${sliders.muting}%`, 'Muteado: Reduce la pureza cromática hacia tonos yeso/hormigón neutros y minerales.'],
                        ['contrast', 'CONTRAST', `${sliders.contrast}%`, 'Contraste: Incrementa la diferencia de luz (LRV) entre paredes, suelos y carpintería.'],
                        ['luminosity', 'LUMINOSITY', `${sliders.luminosity}%`, 'Luminosidad: Sube o baja la reflectancia general de la paleta (sol de mediodía vs crepúsculo).'],
                        ['cinematicFog', 'CINEMATIC FOG', `${sliders.cinematicFog}%`, 'Niebla Cinemática: Aplica un velo mate y atmosférico (efecto arenado o difuso).'],
                        ['materialFeel', 'MATERIAL FEEL', `${sliders.materialFeel}%`, 'Sensación de Material: Ajusta los valores para simular texturas orgánicas rugosas y mate.'],
                        ['warmAccent', 'WARM ACCENT', `${sliders.warmAccent}%`, 'Acento Cálido: Resalta detalles metálicos o maderas (como cobre, bronce o roble).'],
                        ['futurism', 'VISIBLE FUTURISM', `${sliders.futurism}%`, 'Futurismo Visible: Desvía matices hacia tonos sofisticados y silenciosos de la arquitectura premium.'],
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
                <button 
                  className="identity-collapsible-trigger" 
                  onClick={() => setIdentityOpen(!identityOpen)}
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'transparent',
                    border: 0,
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                    paddingBottom: identityOpen ? '14px' : '4px',
                    borderBottom: identityOpen ? '1px solid var(--border-light)' : 'none',
                    marginBottom: identityOpen ? '16px' : '0px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                        <MaterialIcon name="settings" size={14} />
                      </span>
                      COLOR IDENTITY
                    </h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>
                      Tune the studio&apos;s long-term color bias: quiet, material, legible, and controlled.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ transform: identityOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', display: 'inline-flex' }}>
                      <MaterialIcon name="keyboard_arrow_right" size={18} />
                    </span>
                  </div>
                </button>
                {identityOpen && (
                  <div className="collapsible-content">
                    <IdentityPanel 
                      identity={identity} 
                      onIdentityChange={handleIdentitySliderChange} 
                      onInteractionEnd={handleIdentityInteractionEnd} 
                    />
                  </div>
                )}
              </section>

              {/* Row 7: Collapsible Architectural Blueprint Guide */}
              <section className="studio-panel calculator-face">
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
                      ARCHITECTURAL CMF GUIDE
                    </h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>
                      Read OKLCH values as spatial decisions: plaster, stone, textile, metal, and shadow.
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
                      <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: "var(--font-mono)" }}>COORDINATES (OKLCH) TO PHYSICAL MATERIALS</h4>
                      <ul style={{ listStyleType: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <li>
                          <strong>Lightness (L) / LRV:</strong> Measures Light Reflectance Value.
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px', opacity: 0.8, fontSize: 'var(--font-size-xxs)' }}>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>L ~0.95: Plaster / Chalk</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>L ~0.55: Concrete / Stone</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>L ~0.20: Steel / Graphite</span>
                          </div>
                        </li>
                        <li>
                          <strong>Chroma (C) / Purity:</strong> Determines color cleanliness. Low chroma ensures spatial serenity.
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px', opacity: 0.8, fontSize: 'var(--font-size-xxs)' }}>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>C 0.00-0.03: Concrete, Slate, Nickel</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>C 0.04-0.08: Travertine, Oak, Limestone</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>C &gt; 0.10: Synthetic Accents</span>
                          </div>
                        </li>
                        <li>
                          <strong>Hue (H) / Temperature:</strong> Angle of tint (0° - 360°).
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px', opacity: 0.8, fontSize: 'var(--font-size-xxs)' }}>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>H ~35°: Terracotta / Clay</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>H ~75°: Warm Travertine / Oak</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>H ~135°: Lichen / Moss Green</span>
                            <span style={{ background: 'var(--bg-panel-deep)', padding: '2px 4px', borderRadius: '2px' }}>H ~220°: Slate Blue / Zinc Grey</span>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: "var(--font-mono)" }}>PRACTICAL WORKFLOW TIPS</h4>
                      <p style={{ margin: 0, lineHeight: 1.4 }}>
                        1. <strong>Contrast Rule:</strong> Ensure text and background have an APCA Lc score of at least 75 for clear reading.
                        <br />
                        2. <strong>Structure vs Details:</strong> Use low chroma (C &lt; 0.05) for ceilings, floors, and main walls. Keep accents (C ~ 0.08) reserved for secondary highlights or furniture elements.
                        <br />
                        3. <strong>Locking Colors:</strong> Click the lock icon on a color card to keep it fixed while generating harmony relationships.
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
                <MockupViewer key={mode} colors={colors} mode={mode} onModeChange={handleModeChange} paletteName={paletteName} />
              </section>

            </aside>
          </>
        ) : (
          <>
            {/* COLUMN 1: harmony Harmony Sidebar (Left) */}
            <div className="left-column stack harmony-sidebar">
              <section className="studio-panel calculator-face">
                <div className="panel-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>HARMONY RULES</h3>
                  <p className="section-description" style={{ margin: '4px 0 0' }}>Choose the governing relationship for the active color system.</p>
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
                        <span className="harmony-rule-name">{harmony.name}</span>
                        <span className="harmony-rule-desc">{harmony.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Collapsible Architectural Guide */}
              <section className="studio-panel calculator-face">
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
                    CMF GUIDE
                  </h3>
                  <span style={{ transform: helpOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', display: 'inline-flex' }}>
                    <MaterialIcon name="keyboard_arrow_right" size={18} />
                  </span>
                </button>
                {helpOpen && (
                  <div style={{ fontSize: 'var(--font-size-xxs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong>LRV (Lightness):</strong>
                      <div style={{ opacity: 0.8 }}>L ~0.95: Plaster | L ~0.55: Concrete | L ~0.20: Steel</div>
                    </div>
                    <div>
                      <strong>Chroma (Purity):</strong>
                      <div style={{ opacity: 0.8 }}>C 0.0-0.03: Slate | C 0.04-0.08: Travertine/Wood</div>
                    </div>
                    <div>
                      <strong>Hue (Temperature):</strong>
                      <div style={{ opacity: 0.8 }}>H ~35°: Clay | H ~75°: Oak | H ~135°: Lichen</div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* COLUMN 2: harmony Center Workspace */}
            <div className="harmony-center-workspace">
              {/* Polar Color Wheel Section */}
              <section className="studio-panel calculator-face harmony-wheel-panel" style={{ background: 'var(--bg-panel-deep)' }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 className="section-title" style={{ margin: 0 }}>GEOMETRIC HARMONY</h3>
                    <p className="section-description" style={{ margin: '4px 0 0' }}>Move the system points while preserving the selected harmony logic.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="control-label-mini" style={{ margin: 0 }}>PICKER</span>
                    <div className="button-strip">
                      {(['wheel', 'plane_lc', 'plane_hc'] as const).map((shape) => (
                        <button
                          key={shape}
                          className={pickerShape === shape ? 'active' : ''}
                          onClick={() => setPickerShape(shape)}
                          style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '0.65rem' }}
                        >
                          {shape === 'wheel' ? 'WHEEL' : shape === 'plane_lc' ? 'L-C' : 'H-C'}
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
                />
              </section>

              <div className="harmony-control-row">
                <label className="palette-size-control harmony-size-control" title="Palette size">
                  <span>Size</span>
                  <input
                    type="range"
                    min={MIN_PALETTE_SIZE}
                    max={MAX_PALETTE_SIZE}
                    value={paletteSize}
                    onChange={(event) => handlePaletteSizeChange(Number(event.target.value))}
                  />
                  <strong>{paletteSize}</strong>
                </label>
                <span className="harmony-count-note">
                  {colors.length} colors active
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
                            title={isBase ? "Harmony Anchor Base Color" : "Set as Harmony Anchor"}
                          >
                            <MaterialIcon name={isBase ? "anchor" : "pin_drop"} size={11} />
                          </button>
                          <button 
                            className="harmony-strip-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLock(color.id);
                            }}
                            title={color.locked ? "Unlock Color" : "Lock Color"}
                            style={{ color: color.locked ? "var(--button-amber)" : "rgba(255,255,255,0.85)" }}
                          >
                            <MaterialIcon name={color.locked ? "lock" : "lock_open"} size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Swatch Info & Mini sliders */}
                      <div className="harmony-strip-info">
                        <input 
                          className="harmony-strip-name" 
                          value={color.displayName}
                          onChange={(e) => handleRenameColor(color.id, e.target.value)}
                          onBlur={() => pushHistory(colors)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <input 
                          className={`harmony-strip-hex ${normalizeHexDraft(hexDrafts[color.id] ?? color.hex) ? '' : 'invalid'}`}
                          value={hexDrafts[color.id] ?? color.hex.toUpperCase()}
                          onChange={(e) => handleHexDraftChange(color.id, e.target.value)}
                          onBlur={() => commitHexChange(color.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
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
                <MockupViewer key={mode} colors={colors} mode={mode} onModeChange={handleModeChange} paletteName={paletteName} />
              </section>

              <section className="studio-panel calculator-face">
                <div className="panel-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>METROLOGY & ENGINE</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
                    <span>PALETTE SIZE</span>
                    <strong>{colors.length}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleRefinePalette} className="calculator-action secondary" style={{ flex: 1, minHeight: '28px', fontSize: '0.7rem' }}>REFINE</button>
                    <button onClick={handleMutatePalette} className="calculator-action amber" style={{ flex: 1, minHeight: '28px', fontSize: '0.7rem' }}>MUTATE</button>
                  </div>
                  <div className="button-strip" style={{ width: '100%' }}>
                    {(['subtle', 'balanced', 'bold'] as MutationStrength[]).map((strength) => (
                      <button key={strength} className={mutationStrength === strength ? 'active' : ''} onClick={() => setMutationStrength(strength)} style={{ cursor: 'pointer', flex: 1, padding: '4px', fontSize: '0.65rem' }}>
                        {strength.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
