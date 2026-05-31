import { Preset } from '../types';

export const CUSTOM_PRESETS_DEFAULTS: Preset[] = [
  {
    id: 'user-blade-runner-noir',
    name: 'Blade Runner Noir',
    description: 'Neon cyberpunk, rain-slicked asphalt, dark grey smog, and filament amber.',
    mode: 'graphic',
    colors: [
      { hex: '#0B0E14', name: 'Cyber Void' },
      { hex: '#1F262F', name: 'Rainy Asphalt' },
      { hex: '#4B5966', name: 'Smog Slate' },
      { hex: '#00D5D5', name: 'Neon Cyan' },
      { hex: '#FF2E93', name: 'Neon Magenta' },
      { hex: '#F39C12', name: 'Filament Amber' }
    ]
  },
  {
    id: 'user-blade-runner-2049',
    name: 'Blade Runner 2049',
    description: 'Las Vegas orange smog haze, Wallace gold, K\'s coat green, and hologram pink.',
    mode: 'graphic',
    colors: [
      { hex: '#11161B', name: 'Basalt Black' },
      { hex: '#2E4031', name: 'K\'s Coat Green' },
      { hex: '#D35400', name: 'Haze Orange' },
      { hex: '#E67E22', name: 'Vegas Dust' },
      { hex: '#C59B27', name: 'Wallace Gold' },
      { hex: '#E84393', name: 'Hologram Pink' }
    ]
  },
  {
    id: 'user-prometheus',
    name: 'Prometheus',
    description: 'Cold Engineer obsidian, biomechanical silt grey, silver metal, and pale bioluminescent blue.',
    mode: 'industrial',
    colors: [
      { hex: '#161D21', name: 'Temple Shadow' },
      { hex: '#253237', name: 'Dark Silt' },
      { hex: '#5C6B73', name: 'Engineer Grey' },
      { hex: '#98C1D9', name: 'Metallic Silver' },
      { hex: '#3D5A80', name: 'Biolume Cyan' },
      { hex: '#E0FBFC', name: 'Cold Light' }
    ]
  },
  {
    id: 'user-alien-earth',
    name: 'Alien Earth',
    description: 'Radioactive green tones, overgrown deep forest moss, decay yellow, and dark alien skies.',
    mode: 'graphic',
    colors: [
      { hex: '#1A252C', name: 'Space Sky' },
      { hex: '#2C3A2E', name: 'Forest Moss' },
      { hex: '#5D4037', name: 'Wet Mud' },
      { hex: '#C0A060', name: 'Decay Yellow' },
      { hex: '#2ECC71', name: 'Xeno Green' },
      { hex: '#76D7C4', name: 'Radioactive Teal' }
    ]
  },
  {
    id: 'user-alien-nostromo',
    name: 'Alien Nostromo',
    description: 'Cabin sage nickel, industrial steel corridors, warning stripe yellow, and pipe copper.',
    mode: 'industrial',
    colors: [
      { hex: '#1C2833', name: 'Hatch Shadow' },
      { hex: '#7F8C8D', name: 'Industrial Steel' },
      { hex: '#8F9E8B', name: 'Cabin Sage' },
      { hex: '#D4AC0D', name: 'Valve Brass' },
      { hex: '#D35400', name: 'Pipe Copper' },
      { hex: '#F1C40F', name: 'Warning Yellow' }
    ]
  },
  {
    id: 'user-dieter-rams',
    name: 'Dieter Rams Braun',
    description: 'Minimalist Braun functionalism. Plaster off-whites, tuner dial green, and signal orange.',
    mode: 'industrial',
    colors: [
      { hex: '#F2F2F0', name: 'Rams Plaster' },
      { hex: '#BDC3C7', name: 'Rams Grey' },
      { hex: '#2C3E50', name: 'Cabinet Charcoal' },
      { hex: '#27AE60', name: 'Tuner Dial' },
      { hex: '#2980B9', name: 'Signal Blue' },
      { hex: '#D35400', name: 'Signal Orange' }
    ]
  },
  {
    id: 'user-le-corbusier',
    name: 'Le Corbusier Polychromie',
    description: 'Corbusier\'s architectural polychromy. Red ochre, cerulean blue, velvet green, and plaster gray.',
    mode: 'architecture',
    colors: [
      { hex: '#273746', name: 'Charcoal Black' },
      { hex: '#A93226', name: 'Red Ochre' },
      { hex: '#2E86C1', name: 'Cerulean Blue' },
      { hex: '#1E8449', name: 'Velvet Green' },
      { hex: '#E5E7E9', name: 'Plaster Gray' },
      { hex: '#F5EEF8', name: 'Travertine' }
    ]
  },
  {
    id: 'user-remedios-varo',
    name: 'Remedios Varo Surreal',
    description: 'Mystical alchemical gold, surrealistic amber, iron rust, and smoky forest mist.',
    mode: 'graphic',
    colors: [
      { hex: '#4D5656', name: 'Mossy Stone' },
      { hex: '#A6ACAF', name: 'Forest Mist' },
      { hex: '#1A5235', name: 'Alchemist Green' },
      { hex: '#F1C40F', name: 'Alchemical Gold' },
      { hex: '#D35400', name: 'Mystical Amber' },
      { hex: '#BA4A00', name: 'Iron Rust' }
    ]
  },
  {
    id: 'user-juan-ogorman',
    name: 'Juan O\'Gorman Mosaic',
    description: 'Mexican stone mosaic mural palette. Volcanic basalt, quarry red, jasper yellow, and mineral turquoise.',
    mode: 'architecture',
    colors: [
      { hex: '#283747', name: 'Volcanic Basalt' },
      { hex: '#922B21', name: 'Quarry Red' },
      { hex: '#D35400', name: 'Desert Clay' },
      { hex: '#F4D03F', name: 'Jasper Yellow' },
      { hex: '#17A589', name: 'Mineral Turquoise' },
      { hex: '#FBFCFC', name: 'Calcite White' }
    ]
  },
  {
    id: 'user-syd-mead',
    name: 'Syd Mead Futura',
    description: 'Syd Mead transit futurism. Spaceship white, chrome cyan, carbon deck, and racing orange.',
    mode: 'industrial',
    colors: [
      { hex: '#2C3E50', name: 'Deck Carbon' },
      { hex: '#3498DB', name: 'Chrome Cyan' },
      { hex: '#EAEDED', name: 'Metallic Pearl' },
      { hex: '#FFFFFF', name: 'Spaceship White' },
      { hex: '#F1C40F', name: 'Transit Yellow' },
      { hex: '#E67E22', name: 'Racing Orange' }
    ]
  },
  {
    id: 'user-mies-van-der-rohe',
    name: 'Mies van der Rohe Pavilion',
    description: 'Barcelona Pavilion materials. Green marble, travertine beige, golden onyx, chrome steel, and smoke glass.',
    mode: 'architecture',
    colors: [
      { hex: '#1C2833', name: 'Smoke Glass' },
      { hex: '#1E4620', name: 'Green Marble' },
      { hex: '#EEDC82', name: 'Travertine Beige' },
      { hex: '#CFB53B', name: 'Golden Onyx' },
      { hex: '#E5E8E8', name: 'Steel Chrome' },
      { hex: '#8B0000', name: 'Red Curtain' }
    ]
  },
  {
    id: 'user-frank-herbert-dune',
    name: 'Frank Herbert Dune',
    description: 'Herbert\'s sand-swept desert world. Deep sands, spice orange, Fremen eyes blue, and dark rock shadows.',
    mode: 'graphic',
    colors: [
      { hex: '#2E4053', name: 'Basalt Rock' },
      { hex: '#EDBB99', name: 'Desert Sand' },
      { hex: '#F5CBA7', name: 'Desert Dust' },
      { hex: '#CA6F1E', name: 'Spice Orange' },
      { hex: '#1F618D', name: 'Fremen Blue' },
      { hex: '#EBF5FB', name: 'Pale Sky' }
    ]
  },
  {
    id: 'user-dune-arrakis',
    name: 'Dune Arrakis',
    description: 'Arrakis desert dunes, Emperor gold, spice orange, and deep basalt canyons.',
    mode: 'architecture',
    colors: [
      { hex: '#1A252C', name: 'Basalt Canyon' },
      { hex: '#E59866', name: 'Arrakis Sand' },
      { hex: '#FADBD8', name: 'Sandstorm Dust' },
      { hex: '#BA4A00', name: 'Spice Orange' },
      { hex: '#D4AC0D', name: 'Emperor Gold' },
      { hex: '#1E8449', name: 'Oasis Green' }
    ]
  },
  {
    id: 'user-dune-giedi-prime',
    name: 'Dune Giedi Prime',
    description: 'Monochromatic, stark ink-blacks, oil sheen, soot gray, and glare white under a black sun.',
    mode: 'industrial',
    colors: [
      { hex: '#111111', name: 'Ink Black' },
      { hex: '#222222', name: 'Oil Sheen' },
      { hex: '#555555', name: 'Soot Gray' },
      { hex: '#888888', name: 'Chrome Shadow' },
      { hex: '#CCCCCC', name: 'Glare Silver' },
      { hex: '#EEEEEE', name: 'Chalk White' }
    ]
  },
  {
    id: 'user-starwars-tatooine',
    name: 'Star Wars Tatooine',
    description: 'Tatooine twin suns sunset pink/ochre, desert sand, Lars dome plaster, and vapor blue.',
    mode: 'architecture',
    colors: [
      { hex: '#5B2C6F', name: 'Sunset Violet' },
      { hex: '#A04000', name: 'Canyon Rust' },
      { hex: '#EDBB99', name: 'Desert Sand' },
      { hex: '#F9E79F', name: 'Dome Plaster' },
      { hex: '#F39C12', name: 'Twin Suns Ochre' },
      { hex: '#3498DB', name: 'Vapor Blue' }
    ]
  },
  {
    id: 'user-starwars-imperial',
    name: 'Star Wars Imperial',
    description: 'Galactic Empire minimalism. Gloss black corridors, stormtrooper white, imperial gray, and terminal laser red.',
    mode: 'industrial',
    colors: [
      { hex: '#0A0A0A', name: 'Gloss Black' },
      { hex: '#707B7C', name: 'Imperial Grey' },
      { hex: '#5D6D7E', name: 'Officer Olive' },
      { hex: '#FDFEFE', name: 'Stormtrooper White' },
      { hex: '#2E86C1', name: 'Control Blue' },
      { hex: '#C0392B', name: 'Terminal Red' }
    ]
  },
  {
    id: 'user-starry-night',
    name: 'Van Gogh Starry Night',
    description: 'Vincent van Gogh\'s Starry Night. Deep cobalt and indigo night sky, swirling turquoise mists, cypress olive black, and glowing crescent golds.',
    mode: 'graphic',
    colors: [
      { hex: '#0F1E36', name: 'Cobalt Night' },
      { hex: '#1D3557', name: 'Swirling Indigo' },
      { hex: '#457B9D', name: 'Turquoise Mist' },
      { hex: '#1E251C', name: 'Cypress Olive' },
      { hex: '#F4D35E', name: 'Starry Yellow' },
      { hex: '#EE964B', name: 'Crescent Gold' }
    ]
  }
];
