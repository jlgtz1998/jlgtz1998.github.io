'use client';

import { useState, useCallback } from 'react';
import { ColorData, DesignMode } from '../types';
import { INFLUENCES } from '../data/influences';
import { exportPaletteToSvg } from '../lib/exporters/svg-exporter';
import { printPaletteCatalog } from '../lib/exporters/pdf-exporter';

function sanitizeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function useExportActions(
  colors: ColorData[],
  paletteName: string,
  mode: DesignMode,
  lang: 'en' | 'es',
  isDarkMode: boolean,
  getTranslatedModeName: (m: DesignMode) => string,
  paletteSize: number,
) {
  const [copied, setCopied] = useState(false);
  const [copiedColorId, setCopiedColorId] = useState<string | null>(null);

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
        try {
          await navigator.clipboard.writeText(text);
          setCopiedColorId(color.id);
          setTimeout(() => setCopiedColorId(null), 1500);
        } catch {
          // Clipboard access can be blocked by browser policy
        }
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

  return {
    copied,
    setCopied,
    copiedColorId,
    setCopiedColorId,
    handleExportSvg,
    handleExportJson,
    handleExportCss,
    handleCopyClipboardList,
    handleCopySwatchCard,
    handleExportPng,
    handlePrintPdf,
  };
}
