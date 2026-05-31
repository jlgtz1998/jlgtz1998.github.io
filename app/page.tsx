'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorData, ColorRole, DesignMode, MutationStrength, OklchColor, SlidersState, UserIdentity, Preset } from '../types';
import { PRESETS } from '../data/presets';
import { CUSTOM_PRESETS_DEFAULTS } from '../data/custom-presets-defaults';
import { INFLUENCES } from '../data/influences';
import { HARMONIES, generateHarmony } from '../lib/harmony';
import { generateColorName } from '../lib/naming';
import { createColorFromHex, createColorFromOklch, rgbToHsv, hsvToRgb, rgbToHex, hexToOklch } from '../lib/color-spaces';
import { applySliders, DEFAULT_SLIDERS, generateFromIdentity, mutateColor } from '../lib/variation';
import { checkApca, checkWcag } from '../lib/accessibility';
import { exportPaletteToSvg } from '../lib/exporters/svg-exporter';
import { printPaletteCatalog } from '../lib/exporters/pdf-exporter';
import { createPaletteFromPreset, DEFAULT_PALETTE_SIZE, MAX_PALETTE_SIZE, MIN_PALETTE_SIZE, moveColor, normalizePaletteSize } from '../lib/palette';
import ColorWheel from '../components/ColorWheel';
import IdentityPanel from '../components/IdentityPanel';
import MaterialIcon from '../components/MaterialIcon';
import MockupViewer from '../components/MockupViewer';

const DEFAULT_IDENTITY: UserIdentity = {
  neutralExpressive: 20,
  coolWarm: 40,
  mutedSaturated: 30,
  contrast: 50,
  experimentality: 30,
  discipline: 20,
  tactileGlossy: 10,
  futurism: 20,
};

const STORAGE_KEYS = {
  identity: 'cran3o_identity',
  mode: 'cran3o_mode',
  paletteSize: 'cran3o_palette_size',
  customPresets: 'cran3o_custom_presets',
  pickerShape: 'cran3o_picker_shape',
} as const;


type VisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

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
  const [sliders, setSliders] = useState<SlidersState>(DEFAULT_SLIDERS);
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
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [myPresetsOpen, setMyPresetsOpen] = useState(false);
  const [history, setHistory] = useState<ColorData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [localHsv, setLocalHsv] = useState<{ h: number; s: number; v: number } | null>(null);
  const [hexDrafts, setHexDrafts] = useState<Record<string, string>>({});
  const [slidersOpen, setSlidersOpen] = useState(false);
  const [pickerShape, setPickerShape] = useState<'circle' | 'square' | 'triangle'>('circle');

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

    const savedCustom = localStorage.getItem(STORAGE_KEYS.customPresets);
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom) as Preset[];
        const hasStarry = parsed.some((p) => p.id === 'user-starry-night');
        if (!hasStarry) {
          const starryPreset = CUSTOM_PRESETS_DEFAULTS.find((p) => p.id === 'user-starry-night');
          if (starryPreset) {
            const updated = [...parsed, starryPreset];
            setCustomPresets(updated);
            localStorage.setItem(STORAGE_KEYS.customPresets, JSON.stringify(updated));
          } else {
            setCustomPresets(parsed);
          }
        } else {
          setCustomPresets(parsed);
        }
      } catch {
        setCustomPresets(CUSTOM_PRESETS_DEFAULTS);
        localStorage.setItem(STORAGE_KEYS.customPresets, JSON.stringify(CUSTOM_PRESETS_DEFAULTS));
      }
    } else {
      setCustomPresets(CUSTOM_PRESETS_DEFAULTS);
      localStorage.setItem(STORAGE_KEYS.customPresets, JSON.stringify(CUSTOM_PRESETS_DEFAULTS));
    }

    setMode(initialMode);
    setPaletteSize(initialSize);

    const savedShape = localStorage.getItem(STORAGE_KEYS.pickerShape) as 'circle' | 'square' | 'triangle' | null;
    if (savedShape === 'circle' || savedShape === 'square' || savedShape === 'triangle') {
      setPickerShape(savedShape);
    }

    const defaultPreset = PRESETS[0];
    const initialColors = createPaletteFromPreset(defaultPreset, initialSize, initialMode);
    setColors(initialColors);
    setHistory([initialColors]);
    setHistoryIndex(0);
    setActiveColorId(initialColors[Math.min(4, initialColors.length - 1)]?.id ?? null);
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
      const currentHsv = rgbToHsv(activeColor.rgb);
      const localHex = rgbToHex(hsvToRgb(localHsv || { h: 0, s: 0, v: 0 }));
      if (localHex !== activeColor.hex) {
        setLocalHsv(currentHsv);
      }
    } else {
      setLocalHsv(null);
    }
  }, [activeColor, localHsv]);

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
      setActiveColorId(nextColors[Math.min(4, nextColors.length - 1)]?.id ?? null);
    }
  };

  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEYS.mode, newMode);
    setSettingsOpen(false);
    setExportOpen(false);
    setContrastOpen(false);
    setPresetsOpen(false);
    setMyPresetsOpen(false);
  };

  const handlePaletteSizeChange = (nextSize: number) => {
    const resized = normalizePaletteSize(colors, nextSize, mode);
    setPaletteSize(resized.length);
    setColorsKeepingActive(resized);
    pushHistory(resized);
  };

  const handleDeleteColor = (id: string) => {
    if (colors.length <= MIN_PALETTE_SIZE) return;
    const nextColors = colors.filter((color) => color.id !== id);
    setPaletteSize(nextColors.length);
    setColorsKeepingActive(nextColors);
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
    const active = getActiveColor();
    if (!active) return;

    const generatedOklchs = generateHarmony(active.oklch, activeHarmonyId, identity.neutralExpressive / 50);
    const nextColors = colors.map((color, index) => {
      if (color.locked) return color;
      const oklch = generatedOklchs[index % generatedOklchs.length];
      const nextColor = createColorFromOklch(oklch, generateColorName(oklch));
      nextColor.id = color.id;
      nextColor.role = color.role;
      nextColor.locked = false;
      return nextColor;
    });
    updateColorsAndPushHistory(nextColors);
  };

  const handleRefinePalette = () => {
    const nextColors = colors.map((color) => (color.locked ? color : mutateColor(color, 'subtle')));
    updateColorsAndPushHistory(nextColors);
  };

  const handleMutatePalette = () => {
    const nextColors = colors.map((color) => (color.locked ? color : mutateColor(color, mutationStrength)));
    updateColorsAndPushHistory(nextColors);
  };

  const handleGenerateFromIdentity = () => {
    const generated = generateFromIdentity(identity, paletteSize);
    setPaletteName('Identity Preset');
    const nextColors = colors.map((color, index) => {
      if (color.locked) return color;
      const nextColor = generated[index % generated.length];
      nextColor.id = color.id;
      nextColor.role = color.role;
      nextColor.locked = color.locked;
      return nextColor;
    });
    updateColorsAndPushHistory(nextColors);
  };

  const handleColorWheelChange = (newOklch: OklchColor, hsv?: { h: number; s: number; v: number }) => {
    const active = getActiveColor();
    if (!active) return;

    if (hsv) {
      setLocalHsv(hsv);
    }

    const nextColor = createColorFromOklch(newOklch, generateColorName(newOklch));
    nextColor.id = active.id;
    nextColor.role = active.role;
    nextColor.locked = active.locked;
    setColors(colors.map((color) => (color.id === active.id ? nextColor : color)));
  };

  const handleHsvSliderChange = (h: number, s: number, v: number) => {
    const active = getActiveColor();
    if (!active) return;

    const newHsv = { h, s, v };
    setLocalHsv(newHsv);

    const nextRgb = hsvToRgb(newHsv);
    const nextHex = rgbToHex(nextRgb);
    const oklch = hexToOklch(nextHex);

    const nextColor = createColorFromOklch(oklch, generateColorName(oklch));
    nextColor.id = active.id;
    nextColor.role = active.role;
    nextColor.locked = active.locked;
    setColors(colors.map((color) => (color.id === active.id ? nextColor : color)));
  };

  const handleSliderChange = (key: keyof SlidersState, value: number) => {
    const nextSliders = { ...sliders, [key]: value };
    setSliders(nextSliders);
    setColors(applySliders(colors, nextSliders));
  };

  const handlePresetSelect = (preset: Preset) => {
    const nextColors = createPaletteFromPreset(preset, paletteSize, mode, colors);
    setPaletteName(preset.name);
    updateColorsAndPushHistory(nextColors);
    setActiveColorId(nextColors[Math.min(4, nextColors.length - 1)]?.id ?? null);
  };

  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: Preset = {
      id: `user-${Date.now()}`,
      name: newPresetName.trim(),
      description: `Custom preset created on ${new Date().toLocaleDateString()}`,
      mode: mode,
      colors: colors.map((color) => ({ hex: color.hex, name: color.displayName })),
    };
    const nextCustom = [newPreset, ...customPresets];
    setCustomPresets(nextCustom);
    localStorage.setItem(STORAGE_KEYS.customPresets, JSON.stringify(nextCustom));
    setNewPresetName('');
  };

  const handleDeletePreset = (id: string) => {
    const nextCustom = customPresets.filter((preset) => preset.id !== id);
    setCustomPresets(nextCustom);
    localStorage.setItem(STORAGE_KEYS.customPresets, JSON.stringify(nextCustom));
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
    setLocalHsv(rgbToHsv(nextColor.rgb));
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

      <header className="studio-header" style={{ padding: '0 0 12px', gap: '12px' }}>
        <div className="studio-logo" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h1 className="logo-main">CRAN3O COLOR STUDIO</h1>
          <span className="logo-sub">{'// ARCHITECTURE / INDUSTRIAL / GRAPHIC'}</span>
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
              onClick={() => { setContrastOpen((open) => !open); setExportOpen(false); setSettingsOpen(false); setPresetsOpen(false); setMyPresetsOpen(false); }} 
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
            <button className="icon-button" onClick={() => { setExportOpen((open) => !open); setSettingsOpen(false); setContrastOpen(false); setPresetsOpen(false); setMyPresetsOpen(false); }} aria-expanded={exportOpen} aria-label="Export palette" title="Export options">
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
            <button className="icon-button" onClick={() => { setSettingsOpen((open) => !open); setExportOpen(false); setContrastOpen(false); setPresetsOpen(false); setMyPresetsOpen(false); }} aria-expanded={settingsOpen} aria-label="Open settings" title="Settings">
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

      <div className="studio-grid" style={{ filter: blindnessSim !== 'normal' ? `url(#${blindnessSim})` : 'none' }}>
        
        {/* LEFT COLUMN: Controls, Swatches, Sliders */}
        <div className="left-column stack">
          
          {/* Row 2: Wheel & Swatches Side-by-Side Row */}
          <div className="wheel-and-swatches-row">
            
            {/* Left: HSV Instrument */}
            <section className="studio-panel calculator-face color-space-instrument">
              <h3 className="section-title">COLOR INSTRUMENT</h3>
              
              <div className="instrument-vertical-stack">
                {/* Picker Shape Selector */}
                <div className="picker-shape-selector" style={{ display: 'flex', gap: '6px', justifyContent: 'center', margin: '4px 0 8px' }}>
                  {(['circle', 'square', 'triangle'] as const).map((shape) => (
                    <button
                      key={shape}
                      className={`shape-btn ${pickerShape === shape ? 'active' : ''}`}
                      onClick={() => setPickerShape(shape)}
                      title={`${shape.toUpperCase()} PICKER`}
                    >
                      {shape === 'circle' && '●'}
                      {shape === 'square' && '■'}
                      {shape === 'triangle' && '▲'}
                    </button>
                  ))}
                </div>

                <div className="instrument-wheel-wrapper">
                  <ColorWheel 
                    activeColor={activeColor} 
                    colors={colors} 
                    onColorChange={handleColorWheelChange} 
                    onSelectColor={(color) => setActiveColorId(color.id)} 
                    hideLightnessSlider 
                    size={260}
                    hoveredColorId={hoveredColorId}
                    onHoverColor={setHoveredColorId}
                    onInteractionEnd={() => pushHistory(colors)}
                    pickerShape={pickerShape}
                  />
                </div>

                {/* Monospaced coordinates readout */}
                {activeColor && (
                  <div className="sci-fi-readout" style={{ margin: '4px 0', textTransform: 'uppercase' }}>
                    {(() => {
                      const hsv = localHsv || rgbToHsv(activeColor.rgb);
                      return `H:${Math.round(hsv.h).toString().padStart(3, '0')}° S:${Math.round(hsv.s * 100).toString().padStart(3, '0')}% V:${Math.round(hsv.v * 100).toString().padStart(3, '0')}%`;
                    })()}
                  </div>
                )}

                {activeColor && (() => {
                  const currentHsv = localHsv || rgbToHsv(activeColor.rgb);
                  return (
                    <div className="instrument-sliders-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                      {/* HUE */}
                      <div className="blender-slider-wrapper">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="1"
                          value={currentHsv.h}
                          onChange={(e) => {
                            handleHsvSliderChange(parseFloat(e.target.value), currentHsv.s, currentHsv.v);
                          }}
                          onMouseUp={() => pushHistory(colors)}
                          onTouchEnd={() => pushHistory(colors)}
                          className="blender-slider"
                          style={{ '--value-percent': `${(currentHsv.h / 360) * 100}%` } as React.CSSProperties}
                        />
                        <div className="blender-slider-overlay">
                          <span className="blender-slider-label">HUE</span>
                          <span className="blender-slider-value">{Math.round(currentHsv.h)}°</span>
                        </div>
                      </div>

                      {/* SATURATION */}
                      <div className="blender-slider-wrapper">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round(currentHsv.s * 100)}
                          onChange={(e) => {
                            handleHsvSliderChange(currentHsv.h, parseFloat(e.target.value) / 100, currentHsv.v);
                          }}
                          onMouseUp={() => pushHistory(colors)}
                          onTouchEnd={() => pushHistory(colors)}
                          className="blender-slider"
                          style={{ '--value-percent': `${currentHsv.s * 100}%` } as React.CSSProperties}
                        />
                        <div className="blender-slider-overlay">
                          <span className="blender-slider-label">SATURATION</span>
                          <span className="blender-slider-value">{Math.round(currentHsv.s * 100)}%</span>
                        </div>
                      </div>

                      {/* VALUE */}
                      <div className="blender-slider-wrapper">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round(currentHsv.v * 100)}
                          onChange={(e) => {
                            handleHsvSliderChange(currentHsv.h, currentHsv.s, parseFloat(e.target.value) / 100);
                          }}
                          onMouseUp={() => pushHistory(colors)}
                          onTouchEnd={() => pushHistory(colors)}
                          className="blender-slider"
                          style={{ '--value-percent': `${currentHsv.v * 100}%` } as React.CSSProperties}
                        />
                        <div className="blender-slider-overlay">
                          <span className="blender-slider-label">VALUE</span>
                          <span className="blender-slider-value">{Math.round(currentHsv.v * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="harmony-controls-block">
                  <span className="control-label-mini">HARMONY</span>
                  <div className="harmony-action-row">
                    <select className="select-control" value={activeHarmonyId} onChange={(event) => setActiveHarmonyId(event.target.value)}>
                      {HARMONIES.map((harmony) => <option key={harmony.id} value={harmony.id}>{harmony.name}</option>)}
                    </select>
                    <button onClick={handleGenerateHarmony} className="calculator-action primary">
                      <MaterialIcon name="explore" size={12} />
                      APPLY
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Right: Swatches Panel */}
            <section className="studio-panel calculator-face swatches-panel">
              <div className="panel-toolbar swatches-toolbar" style={{ position: 'relative' }}>
                <div className="swatches-toolbar-primary">
                  {/* SYSTEM PRESETS */}
                  <div className="settings-wrap" style={{ position: 'relative' }}>
                    <button 
                      className="calculator-action secondary" 
                      style={{ minHeight: '28px', padding: '4px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }} 
                      onClick={() => { setPresetsOpen(!presetsOpen); setMyPresetsOpen(false); setExportOpen(false); setSettingsOpen(false); setContrastOpen(false); }}
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

                  {/* MY PRESETS */}
                  <div className="settings-wrap" style={{ position: 'relative' }}>
                    <button 
                      className="calculator-action secondary" 
                      style={{ minHeight: '28px', padding: '4px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }} 
                      onClick={() => { setMyPresetsOpen(!myPresetsOpen); setPresetsOpen(false); setExportOpen(false); setSettingsOpen(false); setContrastOpen(false); }}
                    >
                      <span>MY PRESETS</span>
                      <MaterialIcon name="arrow_drop_down" size={14} />
                    </button>
                    {myPresetsOpen && (
                      <div className="settings-menu presets-menu" style={{ width: '280px', maxHeight: '420px', overflowY: 'auto', zIndex: 100, left: 0, right: 'auto' }}>
                        <div className="settings-menu-title">MY CUSTOM PRESETS</div>
                        
                        {/* New Preset Creation Row */}
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '6px', background: 'var(--bg-panel-deep)' }}>
                          <input 
                            type="text" 
                            placeholder="SAVE CURRENT AS PRESET..." 
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            className="select-control"
                            style={{ flex: 1, height: '28px', padding: '0 8px', fontSize: '0.72rem' }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                handleSaveCurrentAsPreset();
                              }
                            }}
                          />
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSaveCurrentAsPreset(); }}
                            className="calculator-action primary"
                            style={{ minHeight: '28px', height: '28px', fontSize: '0.68rem', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            disabled={!newPresetName.trim()}
                          >
                            SAVE
                          </button>
                        </div>

                        {/* Custom Presets Group */}
                        {customPresets.length > 0 ? (
                          <div style={{ marginBottom: '8px' }}>
                            {customPresets.map((preset) => (
                              <div 
                                key={preset.id} 
                                onClick={() => { handlePresetSelect(preset); setMyPresetsOpen(false); }} 
                                className="settings-menu-row" 
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '6px 8px', cursor: 'pointer' }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, marginRight: '8px', overflow: 'hidden' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={preset.name}>{preset.name}</span>
                                  {preset.description && (
                                    <span style={{ fontSize: '0.58rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={preset.description}>{preset.description}</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="preset-dots" style={{ display: 'flex', gap: '3px' }}>
                                    {preset.colors.slice(0, 4).map((color, idx) => (
                                      <i key={idx} style={{ backgroundColor: color.hex, width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', border: '1px solid rgba(255,255,255,0.15)' }} />
                                    ))}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                                    className="delete-preset-btn"
                                    title="Delete Preset"
                                  >
                                    <MaterialIcon name="delete" size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.68rem', opacity: 0.5 }}>
                            NO CUSTOM PRESETS SAVED.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="section-title palette-title" style={{ marginLeft: '4px' }}>{paletteName.toUpperCase()}</h3>
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
            <div className="variation-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="section-title">VARIATION & MUTATION ENGINE</h3>
                <p className="section-description">Fine tune temperature, muting, contrast, and material feel inside OKLCH.</p>
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
              <div className="variation-sliders-drawer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span className="control-label-mini" style={{ margin: 0 }}>MUTATION STRENGTH</span>
                  <div className="button-strip">
                    {(['subtle', 'balanced', 'bold'] as MutationStrength[]).map((strength) => (
                      <button key={strength} className={mutationStrength === strength ? 'active' : ''} onClick={() => setMutationStrength(strength)}>
                        {strength.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sliders-grid">
                  {[
                    ['temperature', 'TEMPERATURE', sliders.temperature > 50 ? `WARM ${sliders.temperature}` : sliders.temperature < 50 ? `COOL ${sliders.temperature}` : 'NEUTRAL'],
                    ['muting', 'MUTING', `${sliders.muting}%`],
                    ['contrast', 'CONTRAST', `${sliders.contrast}%`],
                    ['luminosity', 'LUMINOSITY', `${sliders.luminosity}%`],
                    ['cinematicFog', 'CINEMATIC FOG', `${sliders.cinematicFog}%`],
                    ['materialFeel', 'MATERIAL FEEL', `${sliders.materialFeel}%`],
                    ['warmAccent', 'WARM ACCENT', `${sliders.warmAccent}%`],
                    ['futurism', 'VISIBLE FUTURISM', `${sliders.futurism}%`],
                  ].map(([key, label, value]) => (
                    <div key={key} className="blender-slider-wrapper">
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

          {/* Row 6: Collapsible My Color Identity Settings */}
          <section className="studio-panel calculator-face">
            <button className="identity-collapsible-trigger" onClick={() => setIdentityOpen(!identityOpen)}>
              <span className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <MaterialIcon name="settings" size={16} />
                MY COLOR IDENTITY
              </span>
              <span style={{ transform: identityOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', display: 'inline-flex' }}>
                <MaterialIcon name="keyboard_arrow_right" size={16} />
              </span>
            </button>
            {identityOpen && (
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <IdentityPanel identity={identity} onIdentityChange={setIdentity} onGenerateFromIdentity={handleGenerateFromIdentity} />
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

      </div>
    </div>
  );
}
