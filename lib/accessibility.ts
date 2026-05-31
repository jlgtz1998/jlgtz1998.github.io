import { RgbColor } from '../types';

// Relative luminance for WCAG 2.1
function getWcagLuminance(rgb: RgbColor): number {
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Calculate WCAG 2.1 contrast ratio between two colors
export function getWcagContrast(rgb1: RgbColor, rgb2: RgbColor): number {
  const l1 = getWcagLuminance(rgb1);
  const l2 = getWcagLuminance(rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Math.round(ratio * 100) / 100;
}

// Check WCAG compliance
export interface WcagResult {
  ratio: number;
  normalAA: boolean;
  normalAAA: boolean;
  largeAA: boolean;
  largeAAA: boolean;
}

export function checkWcag(rgb1: RgbColor, rgb2: RgbColor): WcagResult {
  const ratio = getWcagContrast(rgb1, rgb2);
  return {
    ratio,
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7.0,
    largeAA: ratio >= 3.0,
    largeAAA: ratio >= 4.5,
  };
}

// APCA Lc score calculation (sRGB simplified version)
export function getApcaContrast(textRgb: RgbColor, bgRgb: RgbColor): number {
  const getLuminance = (color: RgbColor) => {
    const mainTRC = 2.4;
    const r = Math.pow(color.r / 255.0, mainTRC);
    const g = Math.pow(color.g / 255.0, mainTRC);
    const b = Math.pow(color.b / 255.0, mainTRC);
    
    let y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    
    // Black clamp for low-luminance colors
    const blkThrs = 0.022;
    const blkClmp = 1.414;
    if (y < blkThrs) {
      y += Math.pow(blkThrs - y, blkClmp);
    }
    return y;
  };

  const Yt = getLuminance(textRgb);
  const Yb = getLuminance(bgRgb);

  // APCA exponents
  const normBG = 0.56;
  const normTXT = 0.62;
  const revBG = 0.65;
  const revTXT = 0.55;
  
  const scaleBoW = 1.14;
  const scaleWoB = 1.14;
  
  let Lc = 0.0;
  
  if (Yb > Yt) {
    // Dark on Light (BoW)
    Lc = (Math.pow(Yb, normBG) - Math.pow(Yt, normTXT)) * scaleBoW;
    Lc = Lc * 100.0;
    if (Lc < 7.5) {
      Lc = 0;
    }
  } else {
    // Light on Dark (WoB)
    Lc = (Math.pow(Yb, revBG) - Math.pow(Yt, revTXT)) * scaleWoB;
    Lc = Lc * 100.0;
    if (Lc > -7.5) {
      Lc = 0;
    }
  }
  
  return Math.round(Lc);
}

// Get APCA compliance info
export interface ApcaResult {
  score: number; // Lc value
  absScore: number;
  bodyText: boolean; // Lc >= 75 / -75
  subheadings: boolean; // Lc >= 60 / -60
  largeText: boolean; // Lc >= 45 / -45
  nonText: boolean; // Lc >= 30 / -30
}

export function checkApca(textRgb: RgbColor, bgRgb: RgbColor): ApcaResult {
  const score = getApcaContrast(textRgb, bgRgb);
  const absScore = Math.abs(score);
  return {
    score,
    absScore,
    bodyText: absScore >= 75,
    subheadings: absScore >= 60,
    largeText: absScore >= 45,
    nonText: absScore >= 30,
  };
}

// Color blindness simulation (Protanopia, Deuteranopia, Tritanopia, Achromatopsia)
export function simulateColorBlindness(rgb: RgbColor, type: 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'): RgbColor {
  if (type === 'normal') return rgb;
  
  const { r, g, b } = rgb;
  let rx = r, gx = g, bx = b;

  if (type === 'protanopia') {
    rx = 0.567 * r + 0.433 * g + 0.0 * b;
    gx = 0.558 * r + 0.442 * g + 0.0 * b;
    bx = 0.0 * r + 0.242 * g + 0.758 * b;
  } else if (type === 'deuteranopia') {
    rx = 0.625 * r + 0.375 * g + 0.0 * b;
    gx = 0.7 * r + 0.3 * g + 0.0 * b;
    bx = 0.0 * r + 0.3 * g + 0.7 * b;
  } else if (type === 'tritanopia') {
    rx = 0.95 * r + 0.05 * g + 0.0 * b;
    gx = 0.0 * r + 0.433 * g + 0.567 * b;
    bx = 0.0 * r + 0.475 * g + 0.525 * b;
  } else if (type === 'achromatopsia') {
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    rx = grey;
    gx = grey;
    bx = grey;
  }

  return {
    r: Math.round(Math.max(0, Math.min(255, rx))),
    g: Math.round(Math.max(0, Math.min(255, gx))),
    b: Math.round(Math.max(0, Math.min(255, bx))),
  };
}
