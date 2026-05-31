import { oklch as culoriOklch, rgb as culoriRgb, hsl as culoriHsl, formatHex } from 'culori';
import { OklchColor, RgbColor, HslColor, ColorData } from '../types';
import { generateColorName } from './naming';

export function hexToOklch(hex: string): OklchColor {
  const parsed = culoriOklch(hex);
  if (!parsed) {
    return { l: 0, c: 0, h: 0 };
  }
  return {
    l: parsed.l ?? 0,
    c: parsed.c ?? 0,
    h: isNaN(parsed.h ?? 0) ? 0 : (parsed.h ?? 0),
  };
}


export function oklchToHex(oklch: OklchColor): string {
  const hex = formatHex({
    mode: 'oklch',
    l: oklch.l,
    c: oklch.c,
    h: oklch.h,
  });
  return hex || '#000000';
}

export function oklchToRgb(oklch: OklchColor): RgbColor {
  const parsed = culoriRgb({
    mode: 'oklch',
    l: oklch.l,
    c: oklch.c,
    h: oklch.h,
  });
  if (!parsed) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Math.round(Math.max(0, Math.min(1, parsed.r)) * 255),
    g: Math.round(Math.max(0, Math.min(1, parsed.g)) * 255),
    b: Math.round(Math.max(0, Math.min(1, parsed.b)) * 255),
  };
}

export function oklchToHsl(oklch: OklchColor): HslColor {
  const parsed = culoriHsl({
    mode: 'oklch',
    l: oklch.l,
    c: oklch.c,
    h: oklch.h,
  });
  if (!parsed) {
    return { h: 0, s: 0, l: 0 };
  }
  return {
    h: isNaN(parsed.h ?? 0) ? 0 : Math.round(parsed.h ?? 0),
    s: Math.round((parsed.s ?? 0) * 100),
    l: Math.round((parsed.l ?? 0) * 100),
  };
}

export function hexToRgb(hex: string): RgbColor {
  const parsed = culoriRgb(hex);
  if (!parsed) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Math.round(parsed.r * 255),
    g: Math.round(parsed.g * 255),
    b: Math.round(parsed.b * 255),
  };
}

export function hexToHsl(hex: string): HslColor {
  const parsed = culoriHsl(hex);
  if (!parsed) {
    return { h: 0, s: 0, l: 0 };
  }
  return {
    h: isNaN(parsed.h ?? 0) ? 0 : Math.round(parsed.h ?? 0),
    s: Math.round((parsed.s ?? 0) * 100),
    l: Math.round((parsed.l ?? 0) * 100),
  };
}

export function rgbToHex(rgb: RgbColor): string {
  const hex = formatHex({
    mode: 'rgb',
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
  });
  return hex || '#000000';
}

export function getTemperature(h: number): 'cool' | 'warm' | 'neutral' {
  // Hue angles in OKLCH:
  // 0 is magentaish red. 90 is yellow. 180 is bluish green. 270 is blue.
  // Cool: cyan/blue/blue-green (approx 140 to 290)
  // Warm: red/orange/yellow/magenta (approx 320 to 360, 0 to 90)
  // Neutral: yellow-green/light green (90 to 140), deep violet (290 to 320)
  if (h >= 140 && h <= 290) {
    return 'cool';
  } else if ((h >= 0 && h < 90) || (h > 320 && h <= 360)) {
    return 'warm';
  } else {
    return 'neutral';
  }
}

export function createColorFromHex(hex: string, displayName: string = ''): ColorData {
  const oklch = hexToOklch(hex);
  const rgb = hexToRgb(hex);
  const hsl = hexToHsl(hex);
  const temp = getTemperature(oklch.h);
  return {
    id: Math.random().toString(36).substring(2, 9),
    hex: hex.toLowerCase(),
    displayName: displayName || generateColorName(oklch),
    oklch,
    rgb,
    hsl,
    role: 'none',
    locked: false,
    temperature: temp,
  };
}

export function createColorFromOklch(oklch: OklchColor, displayName: string = ''): ColorData {
  const hex = oklchToHex(oklch);
  const rgb = oklchToRgb(oklch);
  const hsl = oklchToHsl(oklch);
  const temp = getTemperature(oklch.h);
  return {
    id: Math.random().toString(36).substring(2, 9),
    hex: hex.toLowerCase(),
    displayName: displayName || generateColorName(oklch),
    oklch,
    rgb,
    hsl,
    role: 'none',
    locked: false,
    temperature: temp,
  };
}

export interface HsvColor {
  h: number; // 0 to 360
  s: number; // 0 to 1
  v: number; // 0 to 1
}

export function rgbToHsv(rgb: RgbColor): HsvColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s,
    v,
  };
}

export function hsvToRgb(hsv: HsvColor): RgbColor {
  const h = hsv.h / 360;
  const s = hsv.s;
  const v = hsv.v;

  let r = 0, g = 0, b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function isColorInGamut(oklch: OklchColor): boolean {
  const parsed = culoriRgb({
    mode: 'oklch',
    l: oklch.l,
    c: oklch.c,
    h: oklch.h,
  });
  if (!parsed) return false;
  const tolerance = 0.001;
  return (
    parsed.r >= -tolerance && parsed.r <= 1 + tolerance &&
    parsed.g >= -tolerance && parsed.g <= 1 + tolerance &&
    parsed.b >= -tolerance && parsed.b <= 1 + tolerance
  );
}
