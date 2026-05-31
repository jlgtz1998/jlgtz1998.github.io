import { Preset } from '../types';

export const PRESETS: Preset[] = [
  {
    id: 'quiet-future',
    name: 'Quiet Future',
    description: 'Our signature studio direction. Sophisticated and calm retro-minimalism.',
    colors: [
      { hex: '#E9E4DA', name: 'Vapor Linen' },
      { hex: '#D6CEC1', name: 'Bone Dust' },
      { hex: '#A9A7A1', name: 'Alloy Mist' },
      { hex: '#70808A', name: 'Overcast Blue' },
      { hex: '#5E7871', name: 'Oxide Teal' },
      { hex: '#9B6F5F', name: 'Kiln Clay' },
      { hex: '#655A64', name: 'Smoked Plum' },
      { hex: '#34373C', name: 'Carbon Silk' },
    ]
  },
  {
    id: 'curtain-stone',
    name: 'Curtain Stone',
    mode: 'architecture',
    description: 'Inspired by Gabriel Fabra. Luminous plaster whites, warm travertines, and soot shadows.',
    colors: [
      { hex: '#F4F1EA', name: 'Plaster White' },
      { hex: '#D9D0C2', name: 'Travertine' },
      { hex: '#B8AE9F', name: 'Flax Taupe' },
      { hex: '#8C959B', name: 'Mist Blue' },
      { hex: '#7D8578', name: 'Sage Ash' },
      { hex: '#43474B', name: 'Hearth Soot' },
    ]
  },
  {
    id: 'brushed-signal',
    name: 'Brushed Signal',
    mode: 'industrial',
    description: 'Sleek satins, petrol slates, and muted copper warning signs.',
    colors: [
      { hex: '#D7DBDA', name: 'Pearl Alloy' },
      { hex: '#A8AFAD', name: 'Satin Nickel' },
      { hex: '#556C78', name: 'Petrol Slate' },
      { hex: '#4A5258', name: 'Graphite Cell' },
      { hex: '#9A735F', name: 'Muted Copper' },
      { hex: '#B3976B', name: 'Smoked Brass' },
    ]
  },
  {
    id: 'noir-deco-print',
    name: 'Noir Deco Print',
    mode: 'graphic',
    description: 'BioShock Rapture vibes: ink carbon, slate indigo, and gold gilding.',
    colors: [
      { hex: '#F5F0E6', name: 'Paper Ivory' },
      { hex: '#202226', name: 'Ink Carbon' },
      { hex: '#556179', name: 'Slate Indigo' },
      { hex: '#2F6B69', name: 'Deco Teal' },
      { hex: '#A25F52', name: 'Dust Vermilion' },
      { hex: '#B59A61', name: 'Soft Gold' },
    ]
  },
  {
    id: 'rams-neutral',
    name: 'Rams Neutral',
    mode: 'industrial',
    description: 'Pure Braun functionality. Off-whites, clean grays, and the iconic signal button red.',
    colors: [
      { hex: '#F2F2F0', name: 'Rams Plaster' },
      { hex: '#E5E5E2', name: 'Rams Alabaster' },
      { hex: '#C8C8C4', name: 'Rams Grey' },
      { hex: '#8E8E8A', name: 'Rams Nickel' },
      { hex: '#5A5A57', name: 'Rams Graphite' },
      { hex: '#2C2C2B', name: 'Rams Carbon' },
      { hex: '#C45538', name: 'Signal Orange' },
      { hex: '#4E6884', name: 'Signal Blue' },
    ]
  },
  {
    id: 'syd-transit',
    name: 'Syd Transit',
    mode: 'industrial',
    description: 'Syd Mead inspired industrial spaceport: metallic pearl, nickel wing, and yellow beacon lights.',
    colors: [
      { hex: '#E2E6E5', name: 'Transit Pearl' },
      { hex: '#B5BEBD', name: 'Satin Alloy' },
      { hex: '#849392', name: 'Nickel Wing' },
      { hex: '#506266', name: 'Slate Petrol' },
      { hex: '#313F42', name: 'Deep Deck' },
      { hex: '#A87A5B', name: 'Hull Copper' },
      { hex: '#D59F58', name: 'Beacon Yellow' },
      { hex: '#D36C52', name: 'Beacon Amber' },
    ]
  },
  {
    id: 'blade-runner-noir',
    name: 'Blade Runner Noir',
    mode: 'graphic',
    description: 'Atmospheric smog, deep carbon voids, and glowing neon oxide filaments.',
    colors: [
      { hex: '#E2DFD8', name: 'Smog Alabaster' },
      { hex: '#6C7A82', name: 'Overcast Slate' },
      { hex: '#47545E', name: 'Foggy Blue' },
      { hex: '#2B333B', name: 'Carbon Silk' },
      { hex: '#1E2328', name: 'Ink Void' },
      { hex: '#6B5B6E', name: 'Smoked Lavender' },
      { hex: '#BE6B4E', name: 'Neon Oxide' },
      { hex: '#C09A55', name: 'Gold Deck' },
    ]
  },
  {
    id: 'nostromo-low-key',
    name: 'Nostromo Low-Key',
    mode: 'industrial',
    description: 'Alien industrial bridge: sage-tinted cabins, carbon pipes, and brass valves.',
    colors: [
      { hex: '#CDD3CE', name: 'Plaster Sage' },
      { hex: '#9AADA2', name: 'Sage Nickel' },
      { hex: '#6F8277', name: 'Slate Lichen' },
      { hex: '#4E5E55', name: 'Deep Deck' },
      { hex: '#2A3630', name: 'Carbon Cabin' },
      { hex: '#C09559', name: 'Brass Valve' },
      { hex: '#895C4E', name: 'Valve Vermilion' },
      { hex: '#202522', name: 'Cabin Void' },
    ]
  },
  {
    id: 'rapture-deco',
    name: 'Rapture Deco',
    mode: 'architecture',
    description: 'BioShock underwater art deco monument: rich underwater teals and soft brass.',
    colors: [
      { hex: '#EFEADB', name: 'Paper Ivory' },
      { hex: '#BCA87F', name: 'Soft Travertine' },
      { hex: '#927954', name: 'Muted Gold' },
      { hex: '#49635E', name: 'Deco Sea' },
      { hex: '#263835', name: 'Abyssal Teal' },
      { hex: '#9A5043', name: 'Vermilion Trim' },
      { hex: '#364B44', name: 'Slate Marine' },
      { hex: '#1D2321', name: 'Rapture Void' },
    ]
  },
  {
    id: 'fabra-curtain-light',
    name: 'Fabra Curtain Light',
    mode: 'architecture',
    description: 'Serene sunlit interior: plaster, trajectory travertine, and mist sky.',
    colors: [
      { hex: '#FAF8F5', name: 'Curtain Plaster' },
      { hex: '#F2EFE8', name: 'Travertine Silk' },
      { hex: '#E6E1D8', name: 'Bone Linen' },
      { hex: '#C5C9C4', name: 'Sage Mist' },
      { hex: '#A0AFB7', name: 'Mist Sky' },
      { hex: '#B29B85', name: 'Soft Drape' },
      { hex: '#C7AF8A', name: 'Travertine Gold' },
      { hex: '#545B5D', name: 'Soot Shadow' },
    ]
  },
  {
    id: 'muted-warm-cool',
    name: 'Muted Warm/Cool Balance',
    description: 'Sophisticated interplay of warm clay against cool overcast slate.',
    colors: [
      { hex: '#EDECDF', name: 'Warm Vapor' },
      { hex: '#D6D5C7', name: 'Travertine Sand' },
      { hex: '#AEB4BD', name: 'Cool Mist' },
      { hex: '#8A939E', name: 'Slate Sky' },
      { hex: '#556070', name: 'Deep Overcast' },
      { hex: '#A57E6B', name: 'Kiln Clay' },
      { hex: '#8F6F5E', name: 'Oxide Copper' },
      { hex: '#363A40', name: 'Soot Ash' },
    ]
  }
];
