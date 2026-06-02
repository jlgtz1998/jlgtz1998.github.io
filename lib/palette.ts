import { ColorData, ColorRole, DesignMode, Preset } from '../types';
import { createColorFromHex } from './color-spaces';
import { mutateColor } from './variation';

export const MIN_PALETTE_SIZE = 0;
export const MAX_PALETTE_SIZE = 12;
export const DEFAULT_PALETTE_SIZE = 8;

const ROLE_SETS: Record<DesignMode, ColorRole[]> = {
  architecture: ['background', 'surface', 'border', 'muted', 'primary', 'accent', 'secondary', 'text', 'none', 'none', 'none', 'none'],
  industrial: ['surface', 'background', 'border', 'muted', 'accent', 'primary', 'secondary', 'text', 'none', 'none', 'none', 'none'],
  graphic: ['background', 'surface', 'border', 'muted', 'primary', 'accent', 'secondary', 'text', 'success', 'warning', 'error', 'none'],
  spec: ['background', 'surface', 'border', 'muted', 'primary', 'accent', 'secondary', 'text', 'success', 'warning', 'error', 'none'],
};

export function clampPaletteSize(size: number): number {
  return Math.max(MIN_PALETTE_SIZE, Math.min(MAX_PALETTE_SIZE, Math.round(size)));
}

export function roleForIndex(mode: DesignMode, index: number): ColorRole {
  return ROLE_SETS[mode][index] ?? 'none';
}

export function normalizePaletteSize(colors: ColorData[], size: number, mode: DesignMode): ColorData[] {
  const nextSize = clampPaletteSize(size);
  const resized = colors.slice(0, nextSize).map((color, index) => ({
    ...color,
    role: color.role === 'none' ? roleForIndex(mode, index) : color.role,
  }));

  while (resized.length < nextSize) {
    const source = resized[resized.length - 1] ?? colors[colors.length - 1];
    const generated = source
      ? mutateColor(source, resized.length % 2 === 0 ? 'balanced' : 'subtle')
      : createColorFromHex('#d6cec1', 'Bone Dust');
    resized.push({
      ...generated,
      id: Math.random().toString(36).substring(2, 9),
      locked: false,
      role: roleForIndex(mode, resized.length),
    });
  }

  return resized;
}

export function createPaletteFromPreset(
  preset: Preset,
  size: number,
  mode: DesignMode,
  previousColors: ColorData[] = [],
): ColorData[] {
  const seeded = preset.colors.map((color, index) => {
    const next = createColorFromHex(color.hex, color.name);
    next.role = previousColors[index]?.role ?? roleForIndex(mode, index);
    next.locked = previousColors[index]?.locked ?? false;
    return next;
  });

  return normalizePaletteSize(seeded, size, mode);
}

export function createPaletteFromPresetNative(
  preset: Preset,
  fallbackMode: DesignMode,
  previousColors: ColorData[] = [],
): ColorData[] {
  return createPaletteFromPreset(
    preset,
    preset.colors.length,
    preset.mode ?? fallbackMode,
    previousColors,
  );
}

export function moveColor(colors: ColorData[], fromIndex: number, toIndex: number): ColorData[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= colors.length ||
    toIndex >= colors.length
  ) {
    return colors;
  }

  const next = [...colors];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
