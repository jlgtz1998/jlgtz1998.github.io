import { ColorData, OklchColor, MutationStrength, UserIdentity, SlidersState } from '../types';
import { createColorFromOklch } from './color-spaces';
import { generateColorName } from './naming';

// Helper to clamp values in OKLCH
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const DEFAULT_SLIDERS: SlidersState = {
  temperature: 50,
  muting: 30, // Default slightly muted for sophisticated vibe
  contrast: 50,
  luminosity: 50,
  futurism: 10,
  neutrality: 20,
  warmAccent: 30,
  cinematicFog: 0,
  materialFeel: 10,
};

// Apply variation sliders to an array of colors
export function applySliders(colors: ColorData[], sliders: SlidersState): ColorData[] {
  return colors.map(color => {
    if (color.locked) return color;

    let { l, c, h } = color.oklch;

    // 1. Luminosity (Brightness)
    // Offset by slider value: 50 is center
    const lOffset = (sliders.luminosity - 50) / 250; // Max offset +/- 0.2
    l = clamp(l + lOffset, 0.05, 0.98);

    // 2. Contrast
    // Scale around 0.5 midpoint
    const cScale = 1 + (sliders.contrast - 50) / 100; // range 0.5 to 1.5
    l = clamp(0.5 + (l - 0.5) * cScale, 0.05, 0.98);

    // 3. Muting & Neutrality
    // Reduce chroma
    const totalMute = clamp((sliders.muting / 100) + (sliders.neutrality / 100), 0, 1);
    c = c * (1 - totalMute * 0.85);

    // 4. Temperature shift
    // > 50 pulls hues toward warm (around 30-50 copper), < 50 pulls toward cool (220 overcast blue)
    if (sliders.temperature !== 50) {
      const shiftFactor = Math.abs(sliders.temperature - 50) / 100; // 0 to 0.5
      const targetHue = sliders.temperature > 50 ? 45 : 225;
      
      // Calculate angular distance and interpolate
      let diff = targetHue - h;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      h = (h + diff * shiftFactor + 360) % 360;
    }

    // 5. Cinematic Fog
    // Compresses lightness toward 0.45, pulls hue toward blue-grey (215), drops chroma
    if (sliders.cinematicFog > 0) {
      const fog = sliders.cinematicFog / 100;
      l = l * (1 - fog * 0.6) + 0.45 * (fog * 0.6);
      c = c * (1 - fog * 0.5);
      
      let diff = 215 - h;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      h = (h + diff * (fog * 0.4) + 360) % 360;
    }

    // 6. Material Feel (stone, sand, clay, copper, sage)
    // Pulls colors towards mineral hues and keeps chroma very low
    if (sliders.materialFeel > 0) {
      const material = sliders.materialFeel / 100;
      // Cap chroma for organic look
      c = clamp(c, 0, 0.06 * (1 - material * 0.5));
      
      // Pull hues to organic zones: wood/sand/clay (30-65) or Sage (125-145) or slate (220)
      let targetMH = h;
      if (h >= 0 && h < 95) {
        targetMH = 45; // Sand/Clay
      } else if (h >= 95 && h < 160) {
        targetMH = 135; // Sage green
      } else if (h >= 160 && h < 270) {
        targetMH = 220; // Slate blue
      } else {
        targetMH = 30; // Copper/Terracotta
      }
      
      let diff = targetMH - h;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      h = (h + diff * (material * 0.5) + 360) % 360;
    }

    // 7. Warm Accent
    // If color is warm, boost its chroma. If cool/neutral, mute it.
    if (sliders.warmAccent > 0) {
      const isWarm = h < 90 || h > 320;
      const accent = sliders.warmAccent / 100;
      if (isWarm) {
        c = clamp(c * (1 + accent * 1.5), 0, 0.18);
      } else {
        c = c * (1 - accent * 0.4);
      }
    }

    // 8. Understated/Visible Futurism
    // If color is dark, make it dark metallic (L ~ 0.22, C ~ 0.01). If it is accent, make it vivid.
    if (sliders.futurism > 0) {
      const fut = sliders.futurism / 100;
      if (l < 0.3) {
        // Shift graphite/carbon look
        l = l * (1 - fut) + 0.22 * fut;
        c = c * (1 - fut) + 0.01 * fut;
      } else if (c > 0.05) {
        // Boost precision accent hues (like oxide teal ~ 185 or signal orange ~ 40)
        let targetFutHue = h;
        if (h >= 150 && h < 210) targetFutHue = 185; // Oxide Teal
        else if (h >= 0 && h < 60) targetFutHue = 40;  // Signal Vermilion
        
        let diff = targetFutHue - h;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        h = (h + diff * fut + 360) % 360;
        c = clamp(c * (1 + fut * 0.8), 0.04, 0.16);
      }
    }

    const nextOklch: OklchColor = { l, c, h };
    const name = generateColorName(nextOklch);
    const updatedColor = createColorFromOklch(nextOklch, name);
    
    // Maintain properties
    updatedColor.id = color.id;
    updatedColor.role = color.role;
    updatedColor.locked = color.locked;
    
    return updatedColor;
  });
}

// Mutate color coordinates based on strength
export function mutateColor(color: ColorData, strength: MutationStrength): ColorData {
  if (color.locked) return color;

  let { l, c, h } = color.oklch;
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;

  switch (strength) {
    case 'subtle':
      l = clamp(l + rand(-0.03, 0.03), 0.08, 0.96);
      c = clamp(c + rand(-0.008, 0.008), 0, 0.12);
      h = (h + rand(-10, 10) + 360) % 360;
      break;
    case 'balanced':
      l = clamp(l + rand(-0.09, 0.09), 0.08, 0.96);
      c = clamp(c + rand(-0.02, 0.02), 0, 0.16);
      h = (h + rand(-30, 30) + 360) % 360;
      break;
    case 'bold':
      l = clamp(l + rand(-0.2, 0.2), 0.08, 0.96);
      c = clamp(c + rand(-0.05, 0.05), 0, 0.22);
      h = (h + rand(-75, 75) + 360) % 360;
      break;
  }

  const nextOklch = { l, c, h };
  const name = generateColorName(nextOklch);
  const mutated = createColorFromOklch(nextOklch, name);
  
  mutated.id = color.id;
  mutated.role = color.role;
  mutated.locked = false;

  return mutated;
}

// Generate new color coordinates directly influenced by the "My Color Identity" profile
export function generateFromIdentity(identity: UserIdentity, count: number = 8): ColorData[] {
  const result: ColorData[] = [];
  
  // Calculate weights based on identity sliders
  const isNeutral = identity.neutralExpressive < 40;
  const isExpressive = identity.neutralExpressive > 70;
  
  const targetWarmth = identity.coolWarm; // 0 is cool, 100 is warm
  const saturationFactor = identity.mutedSaturated / 100; // 0 to 1
  const contrastFactor = identity.contrast / 100; // 0 to 1
  const futurismFactor = identity.futurism / 100; // 0 to 1
  
  // Select a primary seed hue
  let primaryHue = 220; // Default cool blue
  if (targetWarmth > 60) {
    primaryHue = 45; // Default warm sand/copper
  } else if (targetWarmth > 40 && targetWarmth <= 60) {
    primaryHue = Math.random() > 0.5 ? 135 : 30; // Sage or Terracotta
  } else {
    primaryHue = Math.random() > 0.5 ? 200 : 250; // Cyan or Blue
  }

  // Add random offset based on experimentality
  const hueRandomness = (identity.experimentality / 100) * 80; // up to 80 degrees variance
  primaryHue = (primaryHue + (Math.random() - 0.5) * hueRandomness + 360) % 360;

  // Distribute lightnesses based on contrast profile
  // High contrast: spread wide. Low contrast: compress in mid-to-high or mid-to-low ranges
  let stepsL: number[] = [];
  if (contrastFactor > 0.7) {
    // High contrast: very light to very dark
    stepsL = [0.97, 0.88, 0.74, 0.58, 0.42, 0.28, 0.18, 0.11];
  } else if (contrastFactor < 0.3) {
    // Soft contrast: compressed mid-lights or mid-darks
    if (identity.discipline < 50) {
      // Architectural: soft lights
      stepsL = [0.96, 0.92, 0.86, 0.82, 0.76, 0.70, 0.64, 0.55];
    } else {
      // Graphic/glossy: soft darks/mids
      stepsL = [0.65, 0.58, 0.50, 0.44, 0.38, 0.32, 0.26, 0.18];
    }
  } else {
    // Balanced contrast
    stepsL = [0.94, 0.84, 0.72, 0.56, 0.42, 0.30, 0.20, 0.13];
  }

  for (let i = 0; i < count; i++) {
    const l = stepsL[i];
    
    // Calculate chroma in OKLCH
    let maxC = 0.07;
    if (isNeutral) maxC = 0.025;
    else if (isExpressive) maxC = 0.15;
    
    // Scale chroma by user's saturation preference
    let c = maxC * saturationFactor;
    
    // Make ends of the palette (extreme light and dark) have lower chroma
    if (i === 0 || i === count - 1) {
      c = c * 0.3;
    } else if (i === 1 || i === count - 2) {
      c = c * 0.6;
    }

    // Determine hue shifts
    let h = primaryHue;
    if (i > 0) {
      // Analogous / split shifts based on user profile
      const shiftType = i % 3;
      if (shiftType === 1) {
        h = (primaryHue + 30 + (Math.random() - 0.5) * 10) % 360;
      } else if (shiftType === 2) {
        h = (primaryHue - 30 - (Math.random() - 0.5) * 10) % 360;
      }
    }

    // Apply futurism factor: inject some precise cyan/teal or signal copper
    if (futurismFactor > 0.4 && (i === 4 || i === 6)) {
      h = Math.random() > 0.5 ? 185 : 40; // Teal or Orange
      c = clamp(c * 1.5, 0.05, 0.14); // boost chroma
    }

    const oklchColor: OklchColor = { l, c, h };
    const name = generateColorName(oklchColor);
    const color = createColorFromOklch(oklchColor, name);
    result.push(color);
  }

  return result;
}
