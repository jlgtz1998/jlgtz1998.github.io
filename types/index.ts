export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'surface'
  | 'background'
  | 'text'
  | 'muted'
  | 'border'
  | 'success'
  | 'warning'
  | 'error'
  | 'none';

export interface OklchColor {
  l: number; // 0 to 1
  c: number; // 0 to 0.4
  h: number; // 0 to 360
  a?: number; // 0 to 1 (alpha)
}

export interface RgbColor {
  r: number; // 0 to 255
  g: number; // 0 to 255
  b: number; // 0 to 255
}

export interface HslColor {
  h: number; // 0 to 360
  s: number; // 0 to 100
  l: number; // 0 to 100
}

export interface ColorData {
  id: string; // Unique ID to track colors, lock them, etc.
  hex: string; // e.g. "#E9E4DA"
  displayName: string; // e.g. "Vapor Linen"
  oklch: OklchColor;
  rgb: RgbColor;
  hsl: HslColor;
  role: ColorRole;
  locked: boolean;
  temperature: 'cool' | 'warm' | 'neutral';
}

export type DesignMode = 'architecture' | 'industrial' | 'graphic' | 'spec';

export type MutationStrength = 'subtle' | 'balanced' | 'bold';

export interface Preset {
  id: string;
  name: string;
  colors: { hex: string; name: string }[];
  mode?: DesignMode;
  description?: string;
}

export interface UserIdentity {
  neutralExpressive: number; // 0 (neutral) to 100 (expressive)
  coolWarm: number; // 0 (cool) to 100 (warm)
  mutedSaturated: number; // 0 (muted) to 100 (saturated)
  contrast: number; // 0 (soft) to 100 (strong)
  experimentality: number; // 0 (timeless) to 100 (experimental)
  discipline: number; // 0 (architectural) to 100 (graphic)
  tactileGlossy: number; // 0 (tactile) to 100 (glossy)
  futurism: number; // 0 (understated) to 100 (visible)
}

export interface SlidersState {
  temperature: number;
  muting: number;
  contrast: number;
  luminosity: number;
  futurism: number;
  neutrality: number;
  warmAccent: number;
  cinematicFog: number;
  materialFeel: number;
}

export interface HarmonyOption {
  id: string;
  name: string;
  description: string;
}


