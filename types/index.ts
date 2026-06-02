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

export type PresetMood =
  | 'neutral' | 'warm' | 'cool' | 'noir' | 'teal' | 'material' | 'graphic' | 'architectural';

export type PresetContrastLevel = 'low' | 'medium' | 'high';

export interface PresetColor {
  hex: string;
  name: string;
  suggestedRole?: ColorRole;
}

export interface Preset {
  id: string;
  name: string;
  colors: PresetColor[];
  mode?: DesignMode;
  description?: string;
  tags?: string[];
  mood?: PresetMood;
  contrastLevel?: PresetContrastLevel;
}

export interface UserIdentity {
  temperature: number; // 0 (cool) to 100 (warm)
  chroma: number; // 0 (muted) to 100 (saturated)
  contrast: number; // 0 (soft) to 100 (strong)
  experimentality: number; // 0 (classic) to 100 (experimental)
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


