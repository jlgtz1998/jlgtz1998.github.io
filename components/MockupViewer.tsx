'use client';

import React, { useMemo, useState } from 'react';
import { ColorData, ColorRole, DesignMode } from '../types';
import { createColorFromHex } from '../lib/color-spaces';
import { checkApca, getWcagContrast } from '../lib/accessibility';
import MaterialIcon from './MaterialIcon';

function splitName(name: string): string[] {
  if (name.length <= 15) return [name];
  const words = name.split(' ');
  if (words.length <= 1) return [name];
  
  let line1 = '';
  let line2 = '';
  const mid = name.length / 2;
  let currentLength = 0;
  
  for (let i = 0; i < words.length; i++) {
    if (currentLength + words[i].length / 2 < mid || i === 0) {
      line1 += (line1 ? ' ' : '') + words[i];
      currentLength += words[i].length + 1;
    } else {
      line2 += (line2 ? ' ' : '') + words[i];
    }
  }
  return [line1, line2];
}

interface MockupViewerProps {
  colors: ColorData[];
  mode: DesignMode;
  onModeChange: (newMode: DesignMode) => void;
  paletteName?: string;
}

type ResolvedRoleColors = {
  bg: ColorData;
  wall: ColorData;
  floor: ColorData;
  details: ColorData;
  shadow: ColorData;
  accent1: ColorData;
  accent2: ColorData;
  accentTeal: ColorData;
};

type AssessmentItem = {
  label: string;
  value: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
};

function makeDefaultColor(hex: string, displayName: string, role: ColorRole): ColorData {
  const color = createColorFromHex(hex, displayName);
  color.role = role;
  return color;
}

function getDefaultSubtype(mode: DesignMode): string {
  if (mode === 'architecture') return 'day';
  if (mode === 'industrial') return 'speaker';
  if (mode === 'spec') return 'list';
  return 'poster';
}

function resolveColorRoles(colors: ColorData[]): ResolvedRoleColors {
  const defaultColors = {
    bg: makeDefaultColor('#FAF8F5', 'Default Base', 'background'),
    wall: makeDefaultColor('#EBE7DF', 'Default Surface', 'surface'),
    floor: makeDefaultColor('#D3CFC6', 'Default Floor', 'border'),
    details: makeDefaultColor('#8C9499', 'Default Details', 'muted'),
    shadow: makeDefaultColor('#27292C', 'Default Shadow', 'text'),
    accent1: makeDefaultColor('#BE6C54', 'Default Accent 1', 'accent'),
    accent2: makeDefaultColor('#A48E9E', 'Default Accent 2', 'secondary'),
    accentTeal: makeDefaultColor('#5E7871', 'Default Teal', 'primary')
  };

  if (!colors || colors.length === 0) return defaultColors;

  const findByRole = (roles: string[]) => colors.find(c => roles.includes(c.role));
  const sortedByL = [...colors].sort((a, b) => b.oklch.l - a.oklch.l); // Lightest to darkest
  const sortedByC = [...colors].sort((a, b) => b.oklch.c - a.oklch.c); // Most saturated to least

  // Identify roles
  let bg = findByRole(['background']);
  let wall = findByRole(['surface']);
  let floor = [...colors].filter(c => c.role === 'surface')[1]; 
  let accent1 = findByRole(['primary', 'accent']);
  let accent2 = findByRole(['secondary', 'success', 'warning']);
  let accentTeal = [...colors].filter(c => ['accent', 'secondary', 'primary'].includes(c.role)).reverse()[0];
  let details = findByRole(['muted', 'border']);
  let shadow = findByRole(['text']);

  // Check if pallette is inherently dark theme
  const isDarkTheme = (bg && bg.oklch.l < 0.45) || (!bg && sortedByL[0].oklch.l < 0.5);

  // Fallbacks using OKLCH math
  if (!bg) bg = isDarkTheme ? sortedByL[sortedByL.length - 1] : sortedByL[0];
  if (!wall) wall = isDarkTheme ? sortedByL[sortedByL.length - 2] || bg : sortedByL[1] || bg;
  if (!floor) floor = isDarkTheme ? sortedByL[sortedByL.length - 3] || wall : sortedByL[2] || wall;
  if (!shadow) shadow = sortedByL[sortedByL.length - 1]; // always the darkest
  if (!details) details = sortedByL[Math.floor(sortedByL.length / 2)] || shadow;
  
  if (!accent1) accent1 = sortedByC[0] || details;
  if (!accent2) accent2 = sortedByC[1] || accent1;
  if (!accentTeal) accentTeal = sortedByC[2] || accent2;

  // Make sure Teal is distinct if possible
  if (accentTeal === accent1 && sortedByC.length > 2) accentTeal = sortedByC[2];

  return { bg, wall, floor, shadow, details, accent1, accent2, accentTeal };
}

function getModeDescription(mode: DesignMode): string {
  if (mode === 'architecture') return 'Validate spatial calm, material hierarchy, daylight behavior, and accent control.';
  if (mode === 'industrial') return 'Validate CMF zones, interface contrast, product legibility, and accent discipline.';
  if (mode === 'graphic') return 'Validate hierarchy, tokens, editorial contrast, and brand signal.';
  return 'Document the palette as a studio-ready specification sheet.';
}

function getApplicationMap(mode: DesignMode, resolved: ResolvedRoleColors) {
  if (mode === 'architecture') {
    return [
      { label: 'Main wall', share: 34, color: resolved.wall },
      { label: 'Floor / base', share: 22, color: resolved.floor },
      { label: 'Ceiling / light', share: 16, color: resolved.bg },
      { label: 'Furniture', share: 14, color: resolved.details },
      { label: 'Accent', share: 6, color: resolved.accent1 },
      { label: 'Detail line', share: 4, color: resolved.shadow },
      { label: 'Secondary', share: 4, color: resolved.accentTeal },
    ];
  }

  if (mode === 'industrial') {
    return [
      { label: 'Body shell', share: 38, color: resolved.wall },
      { label: 'Base material', share: 22, color: resolved.floor },
      { label: 'Interface', share: 14, color: resolved.shadow },
      { label: 'Functional part', share: 10, color: resolved.details },
      { label: 'Brand accent', share: 8, color: resolved.accent1 },
      { label: 'Status signal', share: 8, color: resolved.accentTeal },
    ];
  }

  if (mode === 'graphic') {
    return [
      { label: 'Background', share: 34, color: resolved.bg },
      { label: 'Surface', share: 20, color: resolved.wall },
      { label: 'Primary block', share: 16, color: resolved.accent1 },
      { label: 'Text', share: 12, color: resolved.shadow },
      { label: 'Muted layer', share: 10, color: resolved.details },
      { label: 'Signal', share: 8, color: resolved.accentTeal },
    ];
  }

  return [
    { label: 'Swatches', share: 50, color: resolved.wall },
    { label: 'Metadata', share: 20, color: resolved.shadow },
    { label: 'Background', share: 20, color: resolved.bg },
    { label: 'Accent notes', share: 10, color: resolved.accent1 },
  ];
}

function getAssessment(mode: DesignMode, resolved: ResolvedRoleColors): AssessmentItem[] {
  const wallFloorDelta = Math.abs(resolved.wall.oklch.l - resolved.floor.oklch.l);
  const wallDetailContrast = getWcagContrast(resolved.shadow.rgb, resolved.wall.rgb);
  const accentDelta = Math.abs(resolved.accent1.oklch.l - resolved.wall.oklch.l);
  const surfaceChroma = Math.max(resolved.bg.oklch.c, resolved.wall.oklch.c, resolved.floor.oklch.c);
  const accentChroma = Math.max(resolved.accent1.oklch.c, resolved.accentTeal.oklch.c);
  const apca = checkApca(resolved.shadow.rgb, resolved.wall.rgb);

  if (mode === 'architecture') {
    return [
      {
        label: 'Wall / floor separation',
        value: `${Math.round(wallFloorDelta * 100)} L`,
        status: wallFloorDelta >= 0.16 ? 'pass' : wallFloorDelta >= 0.09 ? 'warn' : 'fail',
        detail: wallFloorDelta >= 0.16 ? 'Planes read clearly.' : 'Spatial planes may collapse.',
      },
      {
        label: 'Large-surface chroma',
        value: surfaceChroma.toFixed(3),
        status: surfaceChroma <= 0.08 ? 'pass' : surfaceChroma <= 0.12 ? 'warn' : 'fail',
        detail: surfaceChroma <= 0.08 ? 'Calm enough for broad architectural surfaces.' : 'Surfaces may feel too graphic.',
      },
      {
        label: 'Accent discipline',
        value: accentChroma.toFixed(3),
        status: accentChroma <= 0.12 && accentDelta >= 0.12 ? 'pass' : accentChroma <= 0.16 ? 'warn' : 'fail',
        detail: accentChroma <= 0.12 ? 'Accent can remain controlled.' : 'Accent may dominate the room.',
      },
      {
        label: 'Detail readability',
        value: `${wallDetailContrast.toFixed(1)}:1`,
        status: apca.largeText ? 'pass' : apca.nonText ? 'warn' : 'fail',
        detail: apca.largeText ? 'Frames and edge details should remain legible.' : 'Linework needs stronger contrast.',
      },
    ];
  }

  return [
    {
      label: 'Primary contrast',
      value: `${wallDetailContrast.toFixed(1)}:1`,
      status: wallDetailContrast >= 4.5 ? 'pass' : wallDetailContrast >= 3 ? 'warn' : 'fail',
      detail: wallDetailContrast >= 4.5 ? 'Core information can read cleanly.' : 'Core labels may need stronger contrast.',
    },
    {
      label: 'Accent signal',
      value: accentChroma.toFixed(3),
      status: accentChroma >= 0.06 ? 'pass' : 'warn',
      detail: accentChroma >= 0.06 ? 'Accent is distinct enough to guide attention.' : 'Accent may be too quiet.',
    },
    {
      label: 'System restraint',
      value: surfaceChroma.toFixed(3),
      status: surfaceChroma <= 0.1 ? 'pass' : surfaceChroma <= 0.14 ? 'warn' : 'fail',
      detail: surfaceChroma <= 0.1 ? 'Neutral structure stays disciplined.' : 'Base system may feel saturated.',
    },
  ];
}

export default function MockupViewer({ colors, mode, onModeChange, paletteName = 'CRAN3O Spec' }: MockupViewerProps) {
  const [activeSubtype, setActiveSubtype] = useState<string>(() => getDefaultSubtype(mode));

  const resolved = resolveColorRoles(colors);
  const applicationMap = useMemo(() => getApplicationMap(mode, resolved), [mode, resolved]);
  const assessment = useMemo(() => getAssessment(mode, resolved), [mode, resolved]);

  const bg = resolved.bg.hex;
  const wall = resolved.wall.hex;
  const floor = resolved.floor.hex;
  const details = resolved.details.hex;
  const shadow = resolved.shadow.hex;
  const accent1 = resolved.accent1.hex;
  const accent2 = resolved.accent2.hex;
  const accentTeal = resolved.accentTeal.hex;

  // -------------------------------------------------------------
  // Mode: ARCHITECTURE - Day View (Interior room)
  // -------------------------------------------------------------
  const renderArchDay = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
      <defs>
        <linearGradient id="arch-day-main-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={wall} stopOpacity="0.98" />
          <stop offset="100%" stopColor={bg} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="arch-day-floor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={floor} />
          <stop offset="100%" stopColor={details} stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id="arch-day-side-wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={wall} stopOpacity="0.72" />
          <stop offset="100%" stopColor={shadow} stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id="arch-day-ceiling" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={bg} stopOpacity="0.94" />
          <stop offset="100%" stopColor={wall} stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id="arch-day-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.76" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="arch-day-window-glow" cx="24%" cy="22%" r="64%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="arch-day-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="13" stdDeviation="10" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect width="500" height="320" fill={bg} />
      <rect width="500" height="320" fill="url(#arch-day-window-glow)" />
      <polygon points="42,36 344,36 344,220 42,220" fill="url(#arch-day-main-wall)" />
      <polygon points="344,36 466,60 466,222 344,220" fill="url(#arch-day-side-wall)" />
      <polygon points="42,36 344,36 466,60 156,60" fill="url(#arch-day-ceiling)" />
      <polygon points="42,220 466,222 500,320 0,320" fill="url(#arch-day-floor)" />

      <line x1="344" y1="36" x2="344" y2="220" stroke={shadow} strokeOpacity="0.16" />
      <line x1="42" y1="220" x2="466" y2="222" stroke={shadow} strokeOpacity="0.2" />

      <rect x="72" y="58" width="78" height="132" fill="#ffffff" opacity="0.68" />
      <rect x="86" y="72" width="50" height="104" fill={bg} opacity="0.86" />
      <line x1="111" y1="58" x2="111" y2="190" stroke={shadow} strokeOpacity="0.12" />
      <line x1="72" y1="124" x2="150" y2="124" stroke={shadow} strokeOpacity="0.1" />
      <polygon points="150,176 362,224 256,318 26,252" fill="url(#arch-day-light)" />

      <rect x="42" y="217" width="424" height="8" fill={shadow} opacity="0.14" />
      <rect x="42" y="217" width="424" height="3" fill={bg} opacity="0.44" />
      <g filter="url(#arch-day-shadow)">
        <rect x="184" y="184" width="166" height="42" fill={details} rx="4" />
        <rect x="198" y="226" width="8" height="34" fill={shadow} opacity="0.5" />
        <rect x="328" y="226" width="8" height="34" fill={shadow} opacity="0.5" />
        <rect x="202" y="194" width="38" height="10" fill={bg} opacity="0.28" />
      </g>

      <g filter="url(#arch-day-shadow)">
        <rect x="204" y="72" width="88" height="102" fill={shadow} opacity="0.78" rx="2" />
        <rect x="211" y="79" width="74" height="88" fill={bg} />
        <rect x="222" y="92" width="52" height="48" fill={accentTeal} opacity="0.7" />
        <circle cx="248" cy="116" r="14" fill={accent1} opacity="0.84" />
      </g>

      <g>
        <path d="M392 92 C408 124 404 162 382 192" fill="none" stroke={accent2} strokeWidth="8" strokeLinecap="round" opacity="0.76" />
        <circle cx="392" cy="92" r="5" fill={accent2} opacity="0.92" />
        <ellipse cx="382" cy="204" rx="34" ry="8" fill={shadow} opacity="0.16" />
      </g>
      <path d="M82 250 C104 226 144 226 166 248 C182 264 180 288 166 302 L64 302 C50 282 60 262 82 250Z" fill={accent1} opacity="0.84" />
      <path d="M66 302 H168" stroke={shadow} strokeOpacity="0.2" />

      <text x="38" y="304" fill={shadow} opacity="0.42" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="1">INTERIOR / DAYLIGHT SURFACE TEST</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: ARCHITECTURE - Night View (Interior room)
  // -------------------------------------------------------------
  const renderArchNight = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#0e1011', borderRadius: '4px' }}>
      <defs>
        <radialGradient id="lamp-glow" cx="58%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="22%" stopColor={accent1} stopOpacity="0.86" />
          <stop offset="70%" stopColor={accentTeal} stopOpacity="0.24" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wall-night-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={wall} stopOpacity="0.36" />
          <stop offset="100%" stopColor="#08090a" stopOpacity="0.96" />
        </linearGradient>
        <filter id="soft-shadow-night" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>

      <rect width="500" height="320" fill="#0b0d0e" />
      <polygon points="42,36 344,36 344,220 42,220" fill="url(#wall-night-grad)" />
      <polygon points="344,36 466,60 466,222 344,220" fill={shadow} opacity="0.34" />
      <polygon points="42,36 344,36 466,60 156,60" fill={bg} opacity="0.08" />
      <polygon points="42,220 466,222 500,320 0,320" fill={floor} opacity="0.16" />
      <rect x="72" y="58" width="78" height="132" fill="#020303" opacity="0.86" />
      <rect x="42" y="217" width="424" height="8" fill="#000" opacity="0.48" />

      <line x1="306" y1="36" x2="306" y2="104" stroke="#000" strokeWidth="2" opacity="0.7" />
      <path d="M282 104 L330 104 L316 126 L296 126 Z" fill={details} />
      <circle cx="306" cy="130" r="11" fill="#fff" />
      <circle cx="306" cy="130" r="92" fill="url(#lamp-glow)" opacity="0.62" />
      <polygon points="306,132 158,308 452,308" fill={accent1} opacity="0.1" />

      <g filter="url(#soft-shadow-night)">
        <rect x="184" y="184" width="166" height="42" fill={details} rx="4" opacity="0.46" />
        <rect x="198" y="226" width="8" height="34" fill="#000" opacity="0.52" />
        <rect x="328" y="226" width="8" height="34" fill="#000" opacity="0.52" />
      </g>
      <rect x="204" y="72" width="88" height="102" fill="#000" opacity="0.52" rx="2" />
      <rect x="211" y="79" width="74" height="88" fill={shadow} opacity="0.44" />
      <rect x="222" y="92" width="52" height="48" fill={accentTeal} opacity="0.32" />
      <path d="M392 92 C408 124 404 162 382 192" fill="none" stroke={accent2} strokeWidth="8" strokeLinecap="round" opacity="0.34" />
      <path d="M82 250 C104 226 144 226 166 248 C182 264 180 288 166 302 L64 302 C50 282 60 262 82 250Z" fill={accent1} opacity="0.28" />

      <text x="38" y="304" fill="#fff" opacity="0.28" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="1">INTERIOR / NIGHTLIGHT CONTRAST TEST</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: ARCHITECTURE - Moodboard / CMF Board
  // -------------------------------------------------------------
  const renderArchMoodboard = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#131517', borderRadius: '4px' }}>
      <rect width="500" height="320" fill="#111314" />
      
      <rect x="28" y="42" width="126" height="232" fill={bg} rx="3" />
      <path d="M44 74 H138 M44 102 H138 M44 130 H138 M44 158 H138 M44 186 H138" stroke={wall} strokeOpacity="0.32" />
      <text x="42" y="255" fill={shadow} fontSize="9" fontWeight="700" fontFamily="monospace">PLASTER / CEILING</text>

      <rect x="176" y="42" width="132" height="110" fill={wall} rx="3" />
      <path d="M190 58 H294 M190 86 H294 M190 114 H294" stroke={bg} strokeOpacity="0.24" />
      <text x="190" y="137" fill={shadow} fontSize="9" fontWeight="700" fontFamily="monospace">MAIN WALL</text>

      <rect x="176" y="170" width="132" height="104" fill={floor} rx="3" />
      <path d="M176 194 H308 M176 220 H308 M176 246 H308" stroke={shadow} strokeOpacity="0.14" />
      <text x="190" y="258" fill={shadow} fontSize="9" fontWeight="700" fontFamily="monospace">STONE / FLOOR</text>

      <rect x="330" y="42" width="140" height="68" fill={details} rx="3" />
      <path d="M342 58 H456 M342 74 H456 M342 90 H456" stroke={shadow} strokeOpacity="0.14" />
      <text x="342" y="96" fill={shadow} fontSize="9" fontWeight="700" fontFamily="monospace">TEXTILE / LARGE</text>
      <rect x="330" y="130" width="140" height="62" fill={accent1} rx="3" />
      <text x="342" y="177" fill="#fff" fontSize="9" fontWeight="700" fontFamily="monospace">CONTROLLED ACCENT</text>
      <rect x="330" y="212" width="58" height="58" fill={accentTeal} rx="29" />
      <rect x="408" y="212" width="62" height="58" fill={accent2} rx="4" />

      <text x="28" y="298" fill="#fff" opacity="0.34" fontSize="8" fontWeight="600" fontFamily="'Inter', -apple-system, sans-serif">ARCHITECTURAL MATERIAL BOARD / PLASTER · STONE · TEXTILE · ACCENT</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Abstract Speaker / Cylinder & Box
  // -------------------------------------------------------------
  const renderIndSpeaker = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#e5e5e0', borderRadius: '4px' }}>
      <defs>
        <radialGradient id="woofer-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={details} />
          <stop offset="70%" stopColor={shadow} />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id="cylinder-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={bg} />
          <stop offset="40%" stopColor={wall} />
          <stop offset="100%" stopColor={floor} />
        </linearGradient>
      </defs>

      <rect width="500" height="320" fill="#e5e5e0" />

      {/* Stand plane */}
      <polygon points="40,240 460,240 420,290 80,290" fill={floor} opacity="0.5" />

      {/* Speaker Enclosure (Main Box) */}
      <g filter="url(#soft-shadow-day)">
        <rect x="180" y="50" width="140" height="190" fill="url(#cylinder-grad)" rx="6" />
      </g>

      {/* Grille Section */}
      <rect x="192" y="62" width="116" height="100" fill={shadow} opacity="0.15" rx="3" />
      <circle cx="210" cy="80" r="1.5" fill={shadow} />
      <circle cx="230" cy="80" r="1.5" fill={shadow} />
      <circle cx="250" cy="80" r="1.5" fill={shadow} />
      <circle cx="270" cy="80" r="1.5" fill={shadow} />
      <circle cx="290" cy="80" r="1.5" fill={shadow} />
      
      <circle cx="210" cy="100" r="1.5" fill={shadow} />
      <circle cx="230" cy="100" r="1.5" fill={shadow} />
      <circle cx="250" cy="100" r="1.5" fill={shadow} />
      <circle cx="270" cy="100" r="1.5" fill={shadow} />
      <circle cx="290" cy="100" r="1.5" fill={shadow} />

      <circle cx="210" cy="120" r="1.5" fill={shadow} />
      <circle cx="230" cy="120" r="1.5" fill={shadow} />
      <circle cx="250" cy="120" r="1.5" fill={shadow} />
      <circle cx="270" cy="120" r="1.5" fill={shadow} />
      <circle cx="290" cy="120" r="1.5" fill={shadow} />

      {/* Woofer (Abstract Sphere Cutout) */}
      <circle cx="250" cy="112" r="28" fill="url(#woofer-grad)" />
      <circle cx="250" cy="112" r="8" fill={accent1} />

      {/* Dial Panel (Inset Box) */}
      <rect x="192" y="172" width="116" height="54" fill={bg} rx="3" />

      {/* Dial Knob (Small Cylinder) */}
      <circle cx="225" cy="200" r="14" fill={accent1} />
      <circle cx="225" cy="200" r="4" fill="#fff" />

      {/* Light Indicators */}
      <circle cx="272" cy="200" r="4" fill={accentTeal} />
      <circle cx="286" cy="200" r="4" fill={accent2} />

      <text x="30" y="302" fill={shadow} opacity="0.4" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="1">RAMS FUNCTIONAL AUDIO COMPONENT</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Abstract Chair Study
  // -------------------------------------------------------------
  const renderIndChair = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#e5e5e0', borderRadius: '4px' }}>
      <rect width="500" height="320" fill="#e5e5e0" />

      {/* Stand shadow */}
      <ellipse cx="250" cy="250" rx="70" ry="12" fill={shadow} opacity="0.25" />

      {/* Wire Frame Structure (Lines) */}
      <line x1="210" y1="130" x2="210" y2="250" stroke={details} strokeWidth="4" strokeLinecap="round" />
      <line x1="290" y1="130" x2="290" y2="250" stroke={details} strokeWidth="4" strokeLinecap="round" />
      <line x1="210" y1="180" x2="290" y2="180" stroke={shadow} strokeWidth="3" />
      <line x1="225" y1="130" x2="240" y2="248" stroke={shadow} strokeWidth="3" />
      <line x1="275" y1="130" x2="260" y2="248" stroke={shadow} strokeWidth="3" />

      {/* Seat Shell (Abstract Plane) */}
      <path d="M 190 90 Q 190 145 220 145 L 280 145 Q 310 145 310 90 Z" fill={bg} stroke={floor} strokeWidth="1" />

      {/* Cushion Pad (Accent 1) */}
      <path d="M 205 100 Q 205 135 230 135 L 270 135 Q 295 135 295 100 Z" fill={accent1} />

      {/* Backrest Plate (Accent 2) */}
      <path d="M 190 90 L 185 30 Q 185 15 205 15 L 295 15 Q 315 15 315 30 L 310 90 Z" fill={bg} stroke={floor} strokeWidth="1" />
      <rect x="205" y="25" width="90" height="50" fill={accent2} rx="4" />

      <text x="30" y="302" fill={shadow} opacity="0.4" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="1">SCULPTURAL FURNITURE LAYOUT CMF</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Caliper Precision Tool
  // -------------------------------------------------------------
  const renderIndTool = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#e5e5e0', borderRadius: '4px' }}>
      <rect width="500" height="320" fill="#e5e5e0" />

      <g transform="translate(80, 110)">
        {/* Steel Ruler shaft */}
        <rect x="0" y="30" width="340" height="24" fill={floor} rx="2" />
        <path d="M 40 30 L 40 40 M 50 30 L 50 36 M 60 30 L 60 40 M 70 30 L 70 36 M 80 30 L 80 40 M 90 30 L 90 36 M 100 30 L 100 40 M 110 30 L 110 36 M 120 30 L 120 40 M 130 30 L 130 36 M 140 30 L 140 40 M 150 30 L 150 36" stroke={shadow} strokeWidth="1" />

        {/* Left Fixed Clamp Jaw */}
        <path d="M 0 30 L 0 -35 L 18 -35 L 18 10 L 26 30 Z" fill={bg} />
        
        {/* Slider Box */}
        <rect x="130" y="22" width="70" height="40" fill={accentTeal} rx="2" />
        <circle cx="165" cy="12" r="8" fill={accent1} />
        <circle cx="165" cy="12" r="3" fill="#fff" />
        
        {/* Slider Upper Jaw */}
        <path d="M 130 22 L 130 -35 L 148 -35 L 148 22 Z" fill={bg} />

        {/* Digital Display Box */}
        <rect x="210" y="22" width="100" height="40" fill={shadow} rx="3" />
        <text x="260" y="47" fill={bg} fontSize="14" fontFamily="monospace" fontWeight="700" textAnchor="middle">24.08 mm</text>

        {/* Small Brand tag */}
        <rect x="6" y="-28" width="6" height="16" fill={accent1} />
      </g>

      <text x="30" y="302" fill={shadow} opacity="0.4" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="1">PRECISION INSTRUMENT SYD retRO</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Coffee Brewer
  // -------------------------------------------------------------
  const renderIndAppliance = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#e5e5e0', borderRadius: '4px' }}>
      <rect width="500" height="320" fill="#e5e5e0" />

      <g transform="translate(180, 50)">
        {/* Base Platform */}
        <rect x="-10" y="190" width="160" height="15" fill={shadow} opacity="0.15" rx="4" />
        <rect x="5" y="185" width="130" height="10" fill={floor} rx="2" />

        {/* Coffee Maker Enclosure */}
        <path d="M 10 30 L 110 30 L 110 185 L 10 185 Z" fill={bg} rx="6" />

        {/* Inside Cutout */}
        <rect x="35" y="65" width="95" height="100" fill={shadow} />

        {/* Glass Pot */}
        <rect x="42" y="70" width="70" height="90" fill="#fff" fillOpacity="0.12" rx="4" />
        <rect x="42" y="115" width="70" height="45" fill={accent2} opacity="0.6" rx="2" />
        <rect x="108" y="85" width="12" height="60" fill={shadow} rx="2" />

        {/* Water Meter Column */}
        <rect x="18" y="45" width="8" height="110" fill={accentTeal} rx="1" />
        <circle cx="22" cy="115" r="3" fill="#fff" />

        {/* Red Heating Light Switch */}
        <circle cx="70" cy="175" r="7" fill={accent1} />
        <line x1="70" y1="171" x2="70" y2="179" stroke="#fff" strokeWidth="1.5" />
      </g>

      <text x="30" y="302" fill={shadow} opacity="0.4" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="1">DOMESTIC APPLIANCE RETRO SPEC</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: GRAPHIC - Editorial Poster (Minimal Layout)
  // -------------------------------------------------------------
  const renderGraphPoster = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#1c1c1f', borderRadius: '4px' }}>
      <rect width="500" height="320" fill="#151517" />

      {/* Poster Board */}
      <rect x="140" y="15" width="220" height="290" fill={bg} rx="2" />

      {/* Grid lines and layout */}
      <text x="160" y="52" fill={shadow} fontSize="18" fontWeight="800" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="-1">OBJECT SPEC</text>
      <text x="160" y="70" fill={accent1} fontSize="18" fontWeight="300" letterSpacing="3">QUIET SPACE</text>
      
      <line x1="160" y1="80" x2="340" y2="80" stroke={shadow} strokeWidth="1.5" />

      {/* Central Abstract Geometry */}
      <circle cx="250" cy="155" r="45" fill={accent2} />
      <path d="M 205 155 Q 250 100 295 155 Z" fill={accentTeal} />
      <polygon points="215,185 285,185 250,145" fill={accent1} opacity="0.9" />

      {/* Info column */}
      <rect x="160" y="220" width="50" height="12" fill={shadow} />
      <rect x="220" y="220" width="50" height="12" fill={floor} />
      <rect x="280" y="220" width="60" height="12" fill={accentTeal} />

      <text x="160" y="258" fill={shadow} fontSize="7" fontWeight="600" fontFamily="'Inter', -apple-system, sans-serif">EDITION SWISS GRAPHICS 01</text>
      <text x="160" y="270" fill={details} fontSize="6" fontWeight="500" fontFamily="'Inter', -apple-system, sans-serif">CMF ANALYSIS & COLOR ENGINE SYSTEM</text>
      <text x="160" y="282" fill={accent1} fontSize="7" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif">HEX {accent1.toUpperCase()}</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: GRAPHIC - UI Dashboard Card
  // -------------------------------------------------------------
  const renderGraphDashboard = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: shadow, borderRadius: '4px' }}>
      {/* UI Window */}
      <rect x="50" y="25" width="400" height="270" fill={bg} rx="6" />

      {/* Window bar */}
      <rect x="50" y="25" width="400" height="40" fill={floor} rx="6" />
      <circle cx="75" cy="45" r="5" fill={accent1} />
      <circle cx="90" cy="45" r="5" fill={accent2} />
      <circle cx="105" cy="45" r="5" fill={accentTeal} />
      <text x="430" y="49" fill={shadow} fontSize="9" fontWeight="700" textAnchor="end" fontFamily="monospace">LIVE METRICS</text>

      {/* Widget Cards */}
      <rect x="70" y="85" width="160" height="180" fill="#fff" rx="4" />
      <text x="85" y="115" fill={shadow} fontSize="11" fontWeight="600" fontFamily="'Inter', -apple-system, sans-serif">SYSTEM TEMP</text>
      <text x="85" y="155" fill={shadow} fontSize="28" fontWeight="800" fontFamily="monospace" letterSpacing="-1">38.4°C</text>

      <rect x="70" y="180" width="160" height="15" fill={floor} rx="2" />
      <rect x="70" y="180" width="110" height="15" fill={accentTeal} rx="2" />

      {/* Right Plot widget */}
      <rect x="250" y="85" width="180" height="180" fill="#fff" rx="4" />
      <path d="M 260 230 L 290 190 L 320 210 L 350 150 L 380 180 L 410 120" fill="none" stroke={accent1} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 260 230 L 290 190 L 320 210 L 350 150 L 380 180 L 410 120 L 410 240 L 260 240 Z" fill={accent1} fillOpacity="0.1" />

      <circle cx="410" cy="120" r="5" fill={accent2} />

      <text x="260" y="110" fill={details} fontSize="9" fontWeight="700" fontFamily="monospace">COGNITIVE FEEDBACK</text>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: GRAPHIC - Web Hero Section (PROD Sculptural Composition)
  // -------------------------------------------------------------
  const renderGraphLanding = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
      <defs>
        <radialGradient id="sphere-prod" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="35%" stopColor={accent1} />
          <stop offset="100%" stopColor={shadow} />
        </radialGradient>
      </defs>

      {/* Minimal Header */}
      <rect x="40" y="20" width="420" height="24" fill={floor} rx="2" />
      <circle cx="55" cy="32" r="4" fill={accentTeal} />
      
      <rect x="380" y="28" width="30" height="8" fill={shadow} opacity="0.4" rx="1" />
      <rect x="420" y="26" width="25" height="12" fill={accent1} rx="2" />

      {/* Headline */}
      <text x="45" y="90" fill={shadow} fontSize="20" fontWeight="800" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="-0.5">Quiet Geometry</text>
      <text x="45" y="110" fill={shadow} fontSize="20" fontWeight="800" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="-0.5">for Modern CMF</text>
      
      <text x="45" y="130" fill={details} fontSize="8" fontWeight="500" fontFamily="'Inter', -apple-system, sans-serif">Swiss grid layouts and cinematic functional compositions.</text>
      <text x="45" y="140" fill={details} fontSize="8" fontWeight="500" fontFamily="'Inter', -apple-system, sans-serif">Combining tactile materials with color engine calculations.</text>

      {/* CTAs */}
      <rect x="45" y="165" width="65" height="22" fill={accent1} rx="2" />
      <text x="77" y="179" fill="#fff" fontSize="8" fontWeight="700" fontFamily="monospace" textAnchor="middle">INIT</text>

      <rect x="118" y="165" width="65" height="22" fill="none" stroke={details} strokeWidth="1.5" rx="2" />
      <text x="150" y="178" fill={shadow} fontSize="8" fontWeight="700" fontFamily="monospace" textAnchor="middle">SPEC</text>

      {/* 3D Isometric Art Composition (PROD style) */}
      <g transform="translate(240, 50)" filter="url(#soft-shadow-day)">
        {/* Floor Slab */}
        <polygon points="10,180 190,180 140,210 -40,210" fill={floor} />

        {/* Red block */}
        <polygon points="10,150 60,130 60,180 10,200" fill={accentTeal} />
        <polygon points="60,130 110,150 110,200 60,180" fill={accent2} />
        <polygon points="10,150 60,130 110,150 60,170" fill={bg} />

        {/* Tall slab */}
        <polygon points="100,100 130,90 130,190 100,200" fill={details} />
        <polygon points="130,90 150,100 150,200 130,190" fill={shadow} opacity="0.6" />

        {/* Shaded Sphere */}
        <circle cx="50" cy="110" r="22" fill="url(#sphere-prod)" />
      </g>
    </svg>
  );

  // -------------------------------------------------------------
  // Mode: GRAPHIC - Product Sleeve / Flat Packaging
  // -------------------------------------------------------------
  const renderGraphPackaging = () => (
    <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#17171a', borderRadius: '4px' }}>
      {/* Box layout */}
      <g transform="translate(50, 30)">
        <rect x="0" y="0" width="400" height="260" fill={bg} rx="2" />
        
        {/* Color wrap band */}
        <rect x="130" y="0" width="140" height="260" fill={accentTeal} />

        {/* Center Label */}
        <rect x="150" y="40" width="100" height="180" fill={wall} rx="2" />
        
        <text x="200" y="70" fill={shadow} fontSize="12" fontWeight="800" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="middle">SPEC.01</text>
        <line x1="165" y1="80" x2="235" y2="80" stroke={shadow} strokeWidth="1" />

        {/* Primitives graphic */}
        <circle cx="200" cy="120" r="22" fill={accent1} />
        <circle cx="200" cy="120" r="16" fill={accent2} />
        <circle cx="200" cy="120" r="4" fill="#fff" />

        {/* Barcode */}
        <rect x="170" y="175" width="2" height="20" fill={shadow} />
        <rect x="174" y="175" width="5" height="20" fill={shadow} />
        <rect x="181" y="175" width="1" height="20" fill={shadow} />
        <rect x="184" y="175" width="3" height="20" fill={shadow} />
        <rect x="190" y="175" width="6" height="20" fill={shadow} />
        <rect x="198" y="175" width="2" height="20" fill={shadow} />
        <rect x="202" y="175" width="4" height="20" fill={shadow} />
        <rect x="208" y="175" width="1" height="20" fill={shadow} />
        <rect x="211" y="175" width="7" height="20" fill={shadow} />
        <rect x="220" y="175" width="2" height="20" fill={shadow} />
        <text x="200" y="210" fill={shadow} fontSize="6" fontFamily="monospace" textAnchor="middle">5042-2026</text>

        {/* Corner Stamps */}
        <rect x="15" y="15" width="50" height="16" fill={shadow} rx="1" />
        <text x="40" y="26" fill="#fff" fontSize="6" fontWeight="700" fontFamily="monospace" textAnchor="middle">OBJECT LAB</text>

        <rect x="15" y="36" width="50" height="16" fill={floor} rx="1" />
        <text x="40" y="47" fill={shadow} fontSize="6" fontWeight="700" fontFamily="monospace" textAnchor="middle">RAMS MD</text>
        
        {/* Warning strip */}
        <line x1="270" y1="0" x2="270" y2="260" stroke={accent1} strokeWidth="3" />
      </g>
      <text x="20" y="20" fill="#fff" opacity="0.3" fontSize="8" fontWeight="600" fontFamily="monospace">FLAT PACKAGING SLEEVE TEMPLATE</text>
    </svg>
  );

// -------------------------------------------------------------
const getRoleAbbreviation = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'primary': return 'PRM';
    case 'secondary': return 'SEC';
    case 'accent': return 'ACC';
    case 'surface': return 'SRF';
    case 'background': return 'BG';
    case 'text': return 'TXT';
    case 'muted': return 'MUT';
    case 'border': return 'BDR';
    case 'success': return 'OK';
    case 'warning': return 'WRN';
    case 'error': return 'ERR';
    case 'none': return 'NON';
    default: return role.substring(0, 3).toUpperCase();
  }
};

// -------------------------------------------------------------
// Mode: SPEC - List View (Horizontal Technical Card Rows)
// -------------------------------------------------------------
const renderSpecList = () => (
  <svg viewBox="0 0 500 500" width="100%" height="100%" style={{ background: '#fcfbfa', borderRadius: '4px' }}>
    <rect width="500" height="500" fill="#fcfbfa" />
    <line x1="20" y1="45" x2="480" y2="45" stroke="#000000" strokeWidth="1" opacity="0.1" />
    <text x="20" y="26" fill="#000000" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" letterSpacing="2">CRAN3O COLOR STUDIO</text>
    <text x="480" y="26" fill="#000000" fontSize="8" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="end" letterSpacing="1">SPEC.02 / SYSTEM PALETTE SHEET</text>
    <text x="20" y="38" fill="#000000" opacity="0.6" fontSize="9" fontWeight="600" fontFamily="'Inter', -apple-system, sans-serif">PALETTE: {paletteName.toUpperCase()}</text>

    {colors.map((color, i) => {
      const rowHeight = Math.floor(430 / colors.length);
      const y = 55 + i * rowHeight;
      const swatchHeight = rowHeight - 8;
      const swatchWidth = 300; // Increased to 300 for maximum color prominence
      const isStacked = rowHeight >= 45;

      if (rowHeight >= 75) {
        // Case 1: Dynamic typography and stacked layout for spacious rows (3-5 colors)
        const nameSize = rowHeight >= 100 ? 13 : 11.5;
        const hexSize = rowHeight >= 100 ? 10.5 : 9.5;
        const badgeHeight = 16;
        const badgeY = y + rowHeight / 2 + 12;
        const lines = splitName(color.displayName);
        const lineSpacing = nameSize + 2;

        return (
          <g key={color.id}>
            {/* Color block */}
            <rect x="20" y={y + 4} width={swatchWidth} height={swatchHeight} rx="3" fill={color.hex} stroke="rgba(0,0,0,0.08)" />

            {/* Name */}
            {lines.map((line, idx) => (
              <text 
                key={idx} 
                x="340" 
                y={y + rowHeight / 2 - 16 + (idx * lineSpacing) - (lines.length > 1 ? lineSpacing / 2 : 0)} 
                fill="#000000" 
                fontSize={nameSize} 
                fontWeight="700" 
                fontFamily="'Inter', -apple-system, sans-serif"
              >
                {line}
              </text>
            ))}

            {/* Hex */}
            <text x="340" y={y + rowHeight / 2 + 2 + (lines.length > 1 ? 4 : 0)} fill="#000000" opacity="0.5" fontSize={hexSize} fontFamily="'Inter', -apple-system, sans-serif">
              {color.hex.toUpperCase()}
            </text>

            {/* Role Badge */}
            <rect x="340" y={badgeY} width="50" height={badgeHeight} rx="2" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <text x="365" y={badgeY + badgeHeight / 2 + 3} fill="#000000" opacity="0.7" fontSize="7" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="middle" letterSpacing="0.5">
              {getRoleAbbreviation(color.role)}
            </text>

            {/* Subtle separator line between rows */}
            {i < colors.length - 1 && (
              <line x1="20" y1={y + rowHeight} x2="480" y2={y + rowHeight} stroke="#000000" strokeWidth="1" opacity="0.05" />
            )}
          </g>
        );
      } else if (isStacked) {
        // Case 2: Standard stacked layout (6-9 colors)
        const lines = splitName(color.displayName);
        const nameSize = 10;
        const lineSpacing = nameSize + 1.5;

        return (
          <g key={color.id}>
            {/* Color block */}
            <rect x="20" y={y + 4} width={swatchWidth} height={swatchHeight} rx="3" fill={color.hex} stroke="rgba(0,0,0,0.08)" />

            {/* Name & Hex stacked */}
            {lines.map((line, idx) => (
              <text 
                key={idx} 
                x="340" 
                y={y + rowHeight / 2 - 4 + (idx * lineSpacing) - (lines.length > 1 ? lineSpacing / 2 : 0)} 
                fill="#000000" 
                fontSize={nameSize} 
                fontWeight="700" 
                fontFamily="'Inter', -apple-system, sans-serif"
              >
                {line}
              </text>
            ))}
            <text x="340" y={y + rowHeight / 2 + 10 + (lines.length > 1 ? 5 : 0)} fill="#000000" opacity="0.5" fontSize="8.5" fontFamily="'Inter', -apple-system, sans-serif">
              {color.hex.toUpperCase()}
            </text>

            {/* Role Badge on the right to prevent overlap */}
            <text x="480" y={y + rowHeight / 2 + 4} fill="#000000" opacity="0.7" fontSize="7.5" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="end">
              {getRoleAbbreviation(color.role)}
            </text>

            {/* Subtle separator line between rows */}
            {i < colors.length - 1 && (
              <line x1="20" y1={y + rowHeight} x2="480" y2={y + rowHeight} stroke="#000000" strokeWidth="1" opacity="0.05" />
            )}
          </g>
        );
      } else {
        // Case 3: High density layout (10-12 colors)
        const lines = splitName(color.displayName);
        const nameSize = 8.5;
        const lineSpacing = nameSize + 1.5;
        
        return (
          <g key={color.id}>
            {/* Color block */}
            <rect x="20" y={y + 4} width={swatchWidth} height={swatchHeight} rx="3" fill={color.hex} stroke="rgba(0,0,0,0.08)" />

            {/* Name & Hex stacked */}
            {lines.map((line, idx) => (
              <text 
                key={idx} 
                x="340" 
                y={y + rowHeight / 2 - 3 + (idx * lineSpacing) - (lines.length > 1 ? lineSpacing / 2 : 0)} 
                fill="#000000" 
                fontSize={nameSize} 
                fontWeight="700" 
                fontFamily="'Inter', -apple-system, sans-serif"
              >
                {line}
              </text>
            ))}
            <text x="340" y={y + rowHeight / 2 + 8 + (lines.length > 1 ? 4 : 0)} fill="#000000" opacity="0.5" fontSize="7.5" fontFamily="'Inter', -apple-system, sans-serif">
              {color.hex.toUpperCase()}
            </text>

            {/* Role Badge on the right */}
            <text x="480" y={y + rowHeight / 2 + 3} fill="#000000" opacity="0.7" fontSize="7.5" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="end">
              {getRoleAbbreviation(color.role)}
            </text>

            {/* Subtle separator line between rows */}
            {i < colors.length - 1 && (
              <line x1="20" y1={y + rowHeight} x2="480" y2={y + rowHeight} stroke="#000000" strokeWidth="1" opacity="0.05" />
            )}
          </g>
        );
      }
    })}
  </svg>
);

// -------------------------------------------------------------
// Mode: SPEC - Columns View (Vertical Color Bands & Rotated Technical Text)
// -------------------------------------------------------------
const renderSpecColumns = () => {
  const N = colors.length;
  const w = 500 / N;
  
  return (
    <svg viewBox="0 0 500 500" width="100%" height="100%" style={{ background: '#fcfbfa', borderRadius: '4px' }}>
      {colors.map((color, i) => {
        const x = i * w;
        return (
          <g key={color.id}>
            <rect x={x} y="0" width={w} height="360" fill={color.hex} />
            <rect x={x} y="360" width={w} height="140" fill="#fcfbfa" />
            {i > 0 && (
              <line x1={x} y1="0" x2={x} y2="500" stroke="#000000" strokeWidth="1" opacity="0.08" />
            )}
            <g transform={`translate(${x + w/2}, 485) rotate(-90)`}>
              <text x="0" y="-10" fill="#000000" fontSize="9.5" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="start">
                {color.displayName}
              </text>
              <text x="0" y="1.5" fill="#000000" opacity="0.5" fontSize="8.5" fontWeight="500" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="start">
                {color.hex.toUpperCase()}
              </text>
              <text x="0" y="11" fill="#000000" opacity="0.7" fontSize="7" fontWeight="700" fontFamily="'Inter', -apple-system, sans-serif" textAnchor="start" letterSpacing="0.5">
                {getRoleAbbreviation(color.role)}
              </text>
            </g>
          </g>
        );
      })}
      <line x1="0" y1="360" x2="500" y2="360" stroke="#000000" strokeWidth="1" opacity="0.1" />
    </svg>
  );
};

const handleDownloadJpg = () => {
  const svgElement = document.querySelector('.mockup-canvas-wrapper svg') as SVGSVGElement | null;
  if (!svgElement) return;

  const isNight = activeSubtype === 'night';
  const bgColor = isNight ? '#0b0d0e' : '#fcfbfa';

  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    const viewBox = svgElement.viewBox.baseVal;
    const svgWidth = viewBox.width || 500;
    const svgHeight = viewBox.height || 320;
    const aspectRatio = svgWidth / svgHeight;

    let targetWidth = size;
    let targetHeight = size / aspectRatio;

    if (targetHeight > size) {
      targetHeight = size;
      targetWidth = size * aspectRatio;
    }

    const xOffset = (size - targetWidth) / 2;
    const yOffset = (size - targetHeight) / 2;

    ctx.drawImage(image, xOffset, yOffset, targetWidth, targetHeight);

    const jpgURL = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.href = jpgURL;
    downloadLink.download = `${mode}-${activeSubtype}-mockup-square.jpg`;
    downloadLink.click();
    URL.revokeObjectURL(blobURL);
  };
  image.src = blobURL;
};

  // -------------------------------------------------------------
  // Router for Rendering Active Subtype
  // -------------------------------------------------------------
  const renderActiveMockup = () => {
    switch (mode) {
      case 'architecture':
        if (activeSubtype === 'night') return renderArchNight();
        if (activeSubtype === 'moodboard') return renderArchMoodboard();
        return renderArchDay();

      case 'industrial':
        if (activeSubtype === 'chair') return renderIndChair();
        if (activeSubtype === 'tool') return renderIndTool();
        if (activeSubtype === 'appliance') return renderIndAppliance();
        return renderIndSpeaker();

      case 'graphic':
        if (activeSubtype === 'dashboard') return renderGraphDashboard();
        if (activeSubtype === 'landing') return renderGraphLanding();
        if (activeSubtype === 'packaging') return renderGraphPackaging();
        return renderGraphPoster();

      case 'spec':
        if (activeSubtype === 'columns') return renderSpecColumns();
        return renderSpecList();

      default:
        return renderArchDay();
    }
  };

  const getSubtypes = () => {
    if (mode === 'architecture') {
      return [
        { id: 'day', label: 'Space', icon: <MaterialIcon name="wb_sunny" size={14} /> },
        { id: 'night', label: 'Night', icon: <MaterialIcon name="dark_mode" size={14} /> },
        { id: 'moodboard', label: 'Materials', icon: <MaterialIcon name="layers" size={14} /> },
      ];
    } else if (mode === 'industrial') {
      return [
        { id: 'speaker', label: 'Speaker', icon: <MaterialIcon name="speaker" size={14} /> },
        { id: 'chair', label: 'Chair', icon: <MaterialIcon name="chair" size={14} /> },
        { id: 'tool', label: 'Tool', icon: <MaterialIcon name="straighten" size={14} /> },
        { id: 'appliance', label: 'Appliance', icon: <MaterialIcon name="coffee_maker" size={14} /> },
      ];
    } else if (mode === 'spec') {
      return [
        { id: 'list', label: 'List', icon: <MaterialIcon name="article" size={14} /> },
        { id: 'columns', label: 'Columns', icon: <MaterialIcon name="dashboard" size={14} /> },
      ];
    } else {
      return [
        { id: 'poster', label: 'Poster', icon: <MaterialIcon name="article" size={14} /> },
        { id: 'dashboard', label: 'UI', icon: <MaterialIcon name="dashboard" size={14} /> },
        { id: 'landing', label: 'Hero', icon: <MaterialIcon name="web" size={14} /> },
        { id: 'packaging', label: 'Sleeve', icon: <MaterialIcon name="inventory_2" size={14} /> },
      ];
    }
  };

  return (
    <div className="mockup-viewer-panel">
      <div className="mockup-panel-header">
        <div>
          <h3 className="section-title">APPLIED COLOR LAB</h3>
          <p className="section-description">{getModeDescription(mode)}</p>
        </div>
        <div className="mockup-panel-actions">
          <div className="mode-toggle-group mockup-mode-tabs" aria-label="Design mode">
            {(['architecture', 'industrial', 'graphic', 'spec'] as DesignMode[]).map((item) => (
              <button key={item} onClick={() => onModeChange(item)} className={`mode-btn ${mode === item ? 'active' : ''}`}>
                {item === 'architecture' ? 'ARCH' : item === 'industrial' ? 'CMF' : item === 'graphic' ? 'GRAPHIC' : 'SPEC'}
              </button>
            ))}
          </div>
          <button 
            onClick={handleDownloadJpg} 
            className="calculator-action"
            title="Download JPG (Square)"
          >
            <MaterialIcon name="download" size={14} />
          </button>
        </div>
      </div>

      <div className="mockup-tabs-group">
        {getSubtypes().map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubtype(tab.id)}
            className={`mockup-tab-btn ${activeSubtype === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="mockup-canvas-wrapper" style={{ aspectRatio: mode === 'spec' ? '1 / 1' : '500 / 320' }}>
        {renderActiveMockup()}
      </div>

      <div className="application-map">
        <div className="application-map-header">
          <span>APPLICATION MAP</span>
          <b>{mode === 'architecture' ? 'SPATIAL USE' : mode === 'industrial' ? 'CMF USE' : mode === 'graphic' ? 'SYSTEM USE' : 'SHEET USE'}</b>
        </div>
        <div className="application-stack" aria-label="Applied color proportions">
          {applicationMap.map((item) => (
            <i
              key={item.label}
              title={`${item.label}: ${item.color.displayName} (${item.share}%)`}
              style={{ backgroundColor: item.color.hex, flexGrow: item.share }}
            />
          ))}
        </div>
        <div className="application-map-list">
          {applicationMap.map((item) => (
            <div key={item.label} className="application-map-row">
              <i style={{ backgroundColor: item.color.hex }} />
              <span>{item.label}</span>
              <b>{item.share}%</b>
              <em>{item.color.displayName}</em>
            </div>
          ))}
        </div>
      </div>

      <div className="assessment-grid">
        {assessment.map((item) => (
          <div key={item.label} className={`assessment-card ${item.status}`}>
            <div className="assessment-topline">
              <span>{item.label}</span>
              <b>{item.value}</b>
            </div>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
