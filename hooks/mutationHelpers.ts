'use client';

import { ColorData, OklchColor } from '../types';
import { generateHarmony } from '../lib/harmony';
import { createColorFromOklch } from '../lib/color-spaces';
import { generateColorName } from '../lib/naming';

export function normalizeHexDraft(value: string): string | null {
  const clean = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return `#${clean.toLowerCase()}`;
}

export function updateOklchForColor(
  colors: ColorData[],
  id: string,
  newOklch: OklchColor,
  viewMode: string,
  harmonyBaseColorId: string | null,
  activeHarmonyId: string,
  chroma: number,
): ColorData[] {
  const current = colors.find((c) => c.id === id);
  if (!current) return colors;
  const nextColor = createColorFromOklch(newOklch, generateColorName(newOklch));
  nextColor.id = current.id;
  nextColor.role = current.role;
  nextColor.locked = current.locked;
  if (viewMode === 'harmony' && id === harmonyBaseColorId) {
    const generatedOklchs = generateHarmony(newOklch, activeHarmonyId, chroma / 50);
    return colors.map((color, index) => {
      if (color.id === id) return nextColor;
      if (color.locked) return color;
      const oklch = generatedOklchs[index % generatedOklchs.length];
      const updatedColor = createColorFromOklch(oklch, generateColorName(oklch));
      updatedColor.id = color.id;
      updatedColor.role = color.role;
      updatedColor.locked = false;
      return updatedColor;
    });
  }
  return colors.map((color) => (color.id === id ? nextColor : color));
}
