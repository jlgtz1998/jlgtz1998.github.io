import { OklchColor, HarmonyOption } from '../types';

export const HARMONIES: HarmonyOption[] = [
  { id: 'monochromatic', name: 'Monochromatic', description: 'Varying lightness and chroma of a single refined hue.' },
  { id: 'analogous', name: 'Analogous', description: 'Adjacent hues on the spectrum, creating a serene, cohesive atmosphere.' },
  { id: 'complementary', name: 'Complementary', description: 'Direct opposites on the wheel, balanced with high-end muting.' },
  { id: 'split-complementary', name: 'Split-Complementary', description: 'Seed hue paired with two flanking opposite hues for soft tension.' },
  { id: 'triadic', name: 'Triadic', description: 'Three equidistant hues, softened to avoid high-saturation gaming vibes.' },
  { id: 'tetradic', name: 'Tetradic', description: 'Four hues arranged in two complementary pairs, styled for architectural poise.' },
  { id: 'achromatic', name: 'Achromatic', description: 'Zero chroma tones. Pure plaster white, nickel grey, and carbon soot.' },
  { id: 'warm-cool', name: 'Warm-Cool Balance', description: 'Sophisticated interplay of warm clay/brass against cool overcast mist.' },
  { id: 'material', name: 'Material Palette', description: 'Tactile CMF-inspired tones: copper, travertine, concrete, and sage ash.' },
  { id: 'cinematic', name: 'Cinematic Noir', description: 'Blade Runner and Gabriel Fabra inspired low-key fog and localized accent glows.' },
  { id: 'muted-futurist', name: 'Muted Futurist', description: 'Syd Mead transit style: matte metallics, graphite cells, and a petrol beacon.' },
];

// Helper to keep chroma within professional ranges
function clampChroma(c: number, maxChroma: number = 0.08): number {
  return Math.max(0, Math.min(maxChroma, c));
}

// Generate the 8-color palette in OKLCH based on a seed color and chosen harmony
export function generateHarmony(seed: OklchColor, harmonyId: string, maxChromaFactor: number = 1.0): OklchColor[] {
  const { c, h } = seed;
  const result: OklchColor[] = [];
  
  // Base chroma limit for professional look (can be scaled by User Identity)
  const maxC = 0.08 * maxChromaFactor;
  const baseC = clampChroma(c, maxC);

  switch (harmonyId) {
    case 'monochromatic': {
      // 8 steps of lightness from 0.96 down to 0.18
      const stepsL = [0.96, 0.88, 0.78, 0.65, 0.52, 0.40, 0.28, 0.16];
      // Vary chroma: peak in the middle-light range, lower at ends
      for (let i = 0; i < 8; i++) {
        const stepL = stepsL[i];
        const stepC = baseC * (1 - Math.abs(stepL - 0.6) * 0.8);
        result.push({ l: stepL, c: clampChroma(stepC, maxC), h });
      }
      break;
    }

    case 'analogous': {
      // Adjacent hues: h-30, h-15, h, h+15, h+30
      // Let's create an 8-color palette using these hues with varying lightness
      const hueShifts = [-30, -15, 0, 15, 30, -15, 0, 15];
      const stepsL = [0.95, 0.86, 0.76, 0.62, 0.48, 0.35, 0.24, 0.15];
      for (let i = 0; i < 8; i++) {
        const targetH = (h + hueShifts[i] + 360) % 360;
        const stepL = stepsL[i];
        const stepC = baseC * (i % 2 === 0 ? 0.9 : 0.6);
        result.push({ l: stepL, c: clampChroma(stepC, maxC), h: targetH });
      }
      break;
    }

    case 'complementary': {
      // Direct opposites: h and h+180
      const compH = (h + 180) % 360;
      // 4 steps of seed hue, 4 steps of complementary hue
      // We make them look cohesive by setting high contrast
      const stepsL = [0.94, 0.74, 0.45, 0.20, 0.90, 0.70, 0.42, 0.18];
      for (let i = 0; i < 8; i++) {
        const targetH = i < 4 ? h : compH;
        const stepL = stepsL[i];
        // Accent color (the complement) has a slightly higher chroma allowance
        const stepC = (i < 4 ? baseC : baseC * 1.25) * (i % 4 === 1 || i % 4 === 2 ? 1.0 : 0.5);
        result.push({ l: stepL, c: clampChroma(stepC, maxC * 1.5), h: targetH });
      }
      break;
    }

    case 'split-complementary': {
      // h, h + 150, h - 150 (210)
      const h1 = h;
      const h2 = (h + 150) % 360;
      const h3 = (h + 210) % 360;
      
      const hues = [h1, h1, h1, h2, h2, h3, h3, h1];
      const stepsL = [0.96, 0.72, 0.32, 0.88, 0.50, 0.82, 0.44, 0.16];
      for (let i = 0; i < 8; i++) {
        const stepL = stepsL[i];
        const stepC = baseC * (i === 1 || i === 4 || i === 6 ? 1.0 : 0.4);
        result.push({ l: stepL, c: clampChroma(stepC, maxC * 1.3), h: hues[i] });
      }
      break;
    }

    case 'triadic': {
      // h, h + 120, h + 240
      const h1 = h;
      const h2 = (h + 120) % 360;
      const h3 = (h + 240) % 360;
      
      const hues = [h1, h2, h3, h1, h2, h3, h1, h2];
      const stepsL = [0.95, 0.88, 0.78, 0.60, 0.48, 0.36, 0.24, 0.15];
      for (let i = 0; i < 8; i++) {
        // Keep triadic palette extremely muted to avoid "gamer colorful" vibes
        const stepC = baseC * 0.75 * (i % 3 === 0 ? 1.0 : 0.6);
        result.push({ l: stepsL[i], c: clampChroma(stepC, maxC), h: hues[i] });
      }
      break;
    }

    case 'tetradic': {
      // h, h + 90, h + 180, h + 270
      const h1 = h;
      const h2 = (h + 90) % 360;
      const h3 = (h + 180) % 360;
      const h4 = (h + 270) % 360;
      
      const hues = [h1, h2, h3, h4, h1, h2, h3, h4];
      const stepsL = [0.94, 0.84, 0.68, 0.54, 0.42, 0.30, 0.20, 0.13];
      for (let i = 0; i < 8; i++) {
        const stepC = baseC * 0.6 * (i % 2 === 0 ? 1.0 : 0.7);
        result.push({ l: stepsL[i], c: clampChroma(stepC, maxC), h: hues[i] });
      }
      break;
    }

    case 'achromatic': {
      // Force chroma to 0. Vary lightness smoothly.
      const stepsL = [0.97, 0.89, 0.78, 0.64, 0.48, 0.34, 0.22, 0.12];
      for (let i = 0; i < 8; i++) {
        result.push({ l: stepsL[i], c: 0, h });
      }
      break;
    }

    case 'warm-cool': {
      // Balance warm tones (hues 20-80) with cool tones (hues 180-260)
      // Determine seed temperature and select opposite.
      const isSeedCool = h >= 140 && h <= 290;
      const coolHue = isSeedCool ? h : 220; // Default cool blue
      const warmHue = isSeedCool ? 40 : h; // Default warm copper

      const hues = [warmHue, warmHue, warmHue, warmHue, coolHue, coolHue, coolHue, coolHue];
      const stepsL = [0.95, 0.78, 0.52, 0.28, 0.90, 0.72, 0.45, 0.20];
      for (let i = 0; i < 8; i++) {
        const targetH = hues[i];
        // Give warm/cool balance a nice, visible presence but keep it sophisticated
        const stepC = baseC * (i % 4 === 1 || i % 4 === 2 ? 1.0 : 0.5);
        result.push({ l: stepsL[i], c: clampChroma(stepC, maxC * 1.2), h: targetH });
      }
      break;
    }

    case 'material': {
      // Architectural/industrial materials (concrete, travertine, clay, steel, wood)
      // Lightnesses and chromas representing wood (warm low L/mid C), concrete (neutral mid L, zero C), copper/brass (warm L/C), plaster (light)
      const matHues = [
        h,           // Plaster/Base
        (h + 20) % 360, // Travertine/Sand
        (h + 40) % 360, // Clay/Wood
        220,         // Mist Blue/Steel
        120,         // Sage Ash/Lichen
        (h + 30) % 360, // Smoked Brass
        h,           // Charcoal/Concrete
        (h + 180) % 360 // Hearth Soot
      ];
      const stepsL = [0.96, 0.86, 0.70, 0.58, 0.76, 0.50, 0.32, 0.15];
      // Very low chroma for realistic material texture feel
      const stepsC = [0.01, 0.02, 0.05, 0.025, 0.02, 0.06, 0.005, 0.01];
      for (let i = 0; i < 8; i++) {
        result.push({
          l: stepsL[i],
          c: clampChroma(stepsC[i] * (maxChromaFactor * 0.8), maxC * 1.5),
          h: matHues[i]
        });
      }
      break;
    }

    case 'cinematic': {
      // Cinematic Noir: dark moody values, "foggy" midtones, and 1 or 2 glowing beacon accents
      // Lights are dim (max L is 0.88, mostly 0.5 down to 0.12).
      // Accents are highly saturated but narrow in color (glowing orange or cyan).
      const stepsL = [0.88, 0.65, 0.44, 0.28, 0.16, 0.11, 0.52, 0.38];
      const stepsC = [0.015, 0.02, 0.01, 0.008, 0.005, 0.005, 0.14, 0.12]; // Glow accents at the end
      const cinematicHues = [
        (h + 10) % 360, // foggy base
        h,
        h,
        h,
        h,
        h,
        (h + 180) % 360, // Glow accent 1 (complement)
        (h + 40) % 360   // Glow accent 2 (warm fire glow)
      ];
      for (let i = 0; i < 8; i++) {
        result.push({
          l: stepsL[i],
          c: clampChroma(stepsC[i] * maxChromaFactor, 0.18),
          h: cinematicHues[i]
        });
      }
      break;
    }

    case 'muted-futurist': {
      // Quiet Future / Dieter Rams. Very high-end silver, warm bones, and a clean interface blue/teal
      const stepsL = [0.94, 0.88, 0.74, 0.52, 0.38, 0.22, 0.68, 0.45];
      const stepsC = [0.008, 0.012, 0.01, 0.005, 0.005, 0.008, 0.08, 0.06]; // Teal/Oxide accents at the end
      const futHues = [
        60,  // Plaster White / Linen (warm yellow-grey)
        h,   // Alloy Mist
        h,   // Nickel
        h,   // Graphite
        h,   // Charcoal
        h,   // Carbon Silk
        185, // Oxide Teal (acento funcional)
        220  // Overcast Blue (acento secundario)
      ];
      for (let i = 0; i < 8; i++) {
        result.push({
          l: stepsL[i],
          c: clampChroma(stepsC[i] * maxChromaFactor, 0.12),
          h: futHues[i]
        });
      }
      break;
    }

    default: {
      // Default fallback monochromatic
      for (let i = 0; i < 8; i++) {
        result.push({ l: 0.9 - i * 0.1, c: baseC, h });
      }
    }
  }

  return result;
}
export function getHarmonyName(id: string): string {
  return HARMONIES.find(h => h.id === id)?.name || id;
}
export function getHarmonyDescription(id: string): string {
  return HARMONIES.find(h => h.id === id)?.description || '';
}
