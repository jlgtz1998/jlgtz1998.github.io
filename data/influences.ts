import { DesignMode, SlidersState } from '../types';

export interface ModeInfluence {
  id: DesignMode;
  name: string;
  tagline: string;
  description: string;
  // Recommended sliders for this mode
  recommendedSliders: Partial<SlidersState>;
  // Algorithmic weights
  chromaCap: number; // Maximum default chroma in OKLCH
  contrastTarget: number; // Recommended contrast level (0-100)
  defaultHarmony: string;
  recommendedPresets: string[]; // IDs of presets
  guidelines: string[];
}

export const INFLUENCES: Record<DesignMode, ModeInfluence> = {
  architecture: {
    id: 'architecture',
    name: 'Architecture',
    tagline: 'Spatial Light & Calming Matter',
    description: 'Prioritizes light reflection, atmospheric spatiality, calm materials, and timeless structures. Favors sand stone, travertine, plaster, bone, concrete, and sage ash.',
    recommendedSliders: {
      temperature: 50,
      muting: 60, // highly muted
      contrast: 35, // soft, flowing contrast
      futurism: 5,
      neutrality: 50, // high neutrality
      warmAccent: 15,
      cinematicFog: 10,
      materialFeel: 80, // high tactile feel
    },
    chromaCap: 0.045, // Soft, non-intrusive chroma
    contrastTarget: 35,
    defaultHarmony: 'material',
    recommendedPresets: ['quiet-future', 'aylin-neutral', 'curtain-stone', 'fabra-curtain-light', 'muted-warm-cool'],
    guidelines: [
      'Prioritize diffuse reflection: high-lightness surface shades (L > 0.85).',
      'Use zero-chroma anchors (concrete/charcoal) for foundational structures.',
      'Soften contrasting edges; let colors bleed into ambient light.',
      'Incorporate warm stones (travertine) and sage ash to ground the space.'
    ]
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial Design (CMF)',
    tagline: 'Color, Material, Finish & Form',
    description: 'Focuses on functional accents, tactile surfaces, metallic textures, and durability. Favors nickel satins, graphites, petroleum slates, brushed coppers, and smoked brass.',
    recommendedSliders: {
      temperature: 45, // slightly cool
      muting: 40,
      contrast: 55, // balanced contrast for form legibility
      futurism: 40, // high-tech accents
      neutrality: 30,
      warmAccent: 50, // pop accents
      cinematicFog: 5,
      materialFeel: 60,
    },
    chromaCap: 0.08, // Allows decent satin accents
    contrastTarget: 55,
    defaultHarmony: 'muted-futurist',
    recommendedPresets: ['brushed-signal', 'syd-transit', 'nostromo-low-key', 'prometheus-mineral', 'imperial-mono'],
    guidelines: [
      'Define tactile bodies using metallic neutrals (Pearl, Satin Nickel, Graphite).',
      'Inject highly controlled high-chroma beacons for interactive dials/acents.',
      'Observe CMF rules: contrast surface bodies (matte vs glossy) using light-dark anchors.',
      'Ensure accent colors emphasize product function and usability.'
    ]
  },
  graphic: {
    id: 'graphic',
    name: 'Graphic Design',
    tagline: 'Contrast, Typography & Systems',
    description: 'Emphasizes communication hierarchy, legibility, and brand systems. Uses semantic roles (primary, surface, text, success) with strict WCAG and APCA contrast ratios.',
    recommendedSliders: {
      temperature: 50,
      muting: 20, // allows expressive colors
      contrast: 75, // high contrast for text legibility
      futurism: 20,
      neutrality: 10,
      warmAccent: 40,
      cinematicFog: 0,
      materialFeel: 10,
    },
    chromaCap: 0.14, // Higher saturation limits for branding
    contrastTarget: 75,
    defaultHarmony: 'analogous',
    recommendedPresets: ['noir-deco-print', 'blade-runner-low-key', 'quiet-future', 'muted-warm-cool'],
    guidelines: [
      'Maintain strict WCAG 2.1 AA (4.5:1) and APCA Lc 75 contrast for text.',
      'Structure colors by semantic roles: Background, Surface, Text, and Accent.',
      'Select a signature Primary color and pair with supporting tones.',
      'Verify accessibility with color-blindness simulators early in development.'
    ]
  },
  spec: {
    id: 'spec',
    name: 'Spec Sheet',
    tagline: 'Technical Layout & Palette Sheet',
    description: 'A structural tool to analyze the palette in horizontal card lists or vertical bands with technical names and semantic roles.',
    recommendedSliders: {
      temperature: 50,
      muting: 30,
      contrast: 60,
      futurism: 10,
      neutrality: 20,
      warmAccent: 30,
      cinematicFog: 0,
      materialFeel: 20,
    },
    chromaCap: 0.10,
    contrastTarget: 60,
    defaultHarmony: 'material',
    recommendedPresets: [],
    guidelines: [
      'Analyze the horizontal list layout for vertical card spacing.',
      'Check vertical bands side-by-side to study color block relationships.',
      'Verify that roles are correctly mapped (background, primary, surface, etc.).'
    ]
  }
};
