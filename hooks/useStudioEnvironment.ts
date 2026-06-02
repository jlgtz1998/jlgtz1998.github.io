'use client';

import { useCallback, useEffect, useState } from 'react';
import { ColorData, DesignMode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { INFLUENCES } from '../data/influences';
import { PRESETS } from '../data/presets';
import { createPaletteFromPreset, DEFAULT_PALETTE_SIZE, MAX_PALETTE_SIZE } from '../lib/palette';

const STORAGE_KEYS = {
  mode: 'cran3o_mode',
  paletteSize: 'cran3o_palette_size',
  pickerShape: 'cran3o_picker_shape_v2',
  viewMode: 'cran3o_view_mode',
} as const;

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

export function useStudioEnvironment(
  setColors: React.Dispatch<React.SetStateAction<ColorData[]>>,
  setHistory: React.Dispatch<React.SetStateAction<ColorData[][]>>,
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>,
  setActiveColorId: React.Dispatch<React.SetStateAction<string | null>>,
  setHarmonyBaseColorId: React.Dispatch<React.SetStateAction<string | null>>,
) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<DesignMode>('architecture');
  const [paletteSize, setPaletteSize] = useState(DEFAULT_PALETTE_SIZE);
  const [pickerShape, setPickerShape] = useState<PickerShape>('wheel');
  const [viewMode, setViewMode] = useState<WorkspaceView>('instrument');
  const [lang, setLang] = useState<'en' | 'es'>(getInitialLang);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [paletteName, setPaletteName] = useState<string>('CRAN3O Spec');

  // Translations
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

  // Sync lang
  useEffect(() => {
    localStorage.setItem('cran3o_color_studio_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Sync Dark mode
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
      setHistory([initialColors]);
      setHistoryIndex(0);
      setActiveColorId(initialColors[Math.min(4, initialColors.length - 1)]?.id ?? null);
      setHarmonyBaseColorId(initialColors[0]?.id ?? null);
      setMounted(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Persist Size
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEYS.paletteSize, String(paletteSize));
  }, [paletteSize, mounted]);

  // Persist Shape
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEYS.pickerShape, pickerShape);
  }, [pickerShape, mounted]);

  // Persist ViewMode
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
  }, [viewMode, mounted]);

  return {
    mounted,
    mode,
    setMode,
    paletteSize,
    setPaletteSize,
    pickerShape,
    setPickerShape,
    viewMode,
    setViewMode,
    lang,
    setLang,
    isDarkMode,
    setIsDarkMode,
    paletteName,
    setPaletteName,
    t,
    getTooltipText,
    getTranslatedModeName,
  };
}
