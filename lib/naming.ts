import { OklchColor } from '../types';

// Suffixes based on Hue segments in OKLCH
const HUE_CATEGORIES = [
  { range: [0, 20], names: ['Vermilion', 'Clay', 'Kiln', 'Rose', 'Rust', 'Copper', 'Hearth'] },
  { range: [20, 60], names: ['Travertine', 'Brass', 'Bronze', 'Ochre', 'Sienna', 'Amber', 'Sand'] },
  { range: [60, 100], names: ['Linen', 'Straw', 'Gold', 'Sulfur', 'Zinc', 'Ivory', 'Brass'] },
  { range: [100, 150], names: ['Sage', 'Moss', 'Lichen', 'Lime', 'Olive', 'Sage Ash', 'Glade'] },
  { range: [150, 210], names: ['Teal', 'Oxide Teal', 'Mist', 'Glacier', 'Mineral', 'Jade', 'Pine'] },
  { range: [210, 260], names: ['Indigo', 'Slate', 'Overcast', 'Cobalt', 'Ocean', 'Dusk', 'Ink'] },
  { range: [260, 310], names: ['Plum', 'Amethyst', 'Violet', 'Lavender', 'Smoke', 'Soot', 'Orchid'] },
  { range: [310, 340], names: ['Magenta', 'Rose', 'Soot', 'Kiln Clay', 'Velvet', 'Hearth'] },
  { range: [340, 360], names: ['Vermilion', 'Clay', 'Kiln', 'Rose', 'Rust', 'Copper', 'Hearth'] },
];

// Prefixes based on Lightness (L) and Chroma (C)
const getPrefix = (l: number, c: number): string => {
  if (l >= 0.88) {
    if (c < 0.02) return 'Vapor';
    if (c < 0.05) return 'Plaster';
    return 'Bone';
  }
  if (l >= 0.75) {
    if (c < 0.03) return 'Alloy';
    if (c < 0.07) return 'Satin';
    return 'Brushed';
  }
  if (l >= 0.55) {
    if (c < 0.03) return 'Mist';
    if (c < 0.07) return 'Flax';
    return 'Oxide';
  }
  if (l >= 0.35) {
    if (c < 0.03) return 'Smoked';
    if (c < 0.07) return 'Nickel';
    return 'Petrol';
  }
  if (l >= 0.2) {
    if (c < 0.02) return 'Graphite';
    if (c < 0.05) return 'Hearth';
    return 'Carbon';
  }
  // Very dark
  if (c < 0.02) return 'Soot';
  return 'Ink';
};

export function generateColorName(oklch: OklchColor): string {
  const { l, c, h } = oklch;
  const prefix = getPrefix(l, c);

  // Find hue category
  const hue = ((h % 360) + 360) % 360;
  const category = HUE_CATEGORIES.find(cat => hue >= cat.range[0] && hue < cat.range[1]) || HUE_CATEGORIES[0];
  
  // Choose a suffix deterministically based on hue and lightness to avoid randomness during state re-renders
  const hash = Math.floor(hue + l * 100) % category.names.length;
  const suffix = category.names[hash];

  // Prevent name duplication (like "Soot Soot")
  if (prefix.toLowerCase() === suffix.toLowerCase()) {
    return prefix + ' ' + (prefix === 'Soot' ? 'Carbon' : 'Mist');
  }

  return `${prefix} ${suffix}`;
}
