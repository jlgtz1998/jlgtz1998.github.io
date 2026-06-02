'use client';

import React, { useMemo, useState } from 'react';
import { ColorData, ColorRole, DesignMode } from '../types';
import { createColorFromHex } from '../lib/color-spaces';
import { checkApca, getWcagContrast } from '../lib/accessibility';
import MaterialIcon from './MaterialIcon';
import { TRANSLATIONS } from '../data/translations';

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
  lang?: 'en' | 'es';
  isDarkMode?: boolean;
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

function getRoleAbbreviation(role: string): string {
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

function getModeDescription(mode: DesignMode, lang: 'en' | 'es' = 'en'): string {
  const tKey = mode === 'architecture' ? 'mockupDescArch' :
               mode === 'industrial' ? 'mockupDescInd' :
               mode === 'graphic' ? 'mockupDescGraph' : 'mockupDescSpec';
  return TRANSLATIONS[lang]?.[tKey] || TRANSLATIONS['en'][tKey];
}

function getApplicationMap(mode: DesignMode, resolved: ResolvedRoleColors, lang: 'en' | 'es' = 'en') {
  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key];
  };

  if (mode === 'architecture') {
    return [
      { label: t('mapMainWall'), share: 34, color: resolved.wall },
      { label: t('mapFloorBase'), share: 22, color: resolved.floor },
      { label: t('mapCeilingLight'), share: 16, color: resolved.bg },
      { label: t('mapFurniture'), share: 14, color: resolved.details },
      { label: t('mapAccent'), share: 6, color: resolved.accent1 },
      { label: t('mapDetailLine'), share: 4, color: resolved.shadow },
      { label: t('mapSecondary'), share: 4, color: resolved.accentTeal },
    ];
  }

  if (mode === 'industrial') {
    return [
      { label: t('mapBodyShell'), share: 38, color: resolved.wall },
      { label: t('mapBaseMaterial'), share: 22, color: resolved.floor },
      { label: t('mapInterface'), share: 14, color: resolved.shadow },
      { label: t('mapFunctionalPart'), share: 10, color: resolved.details },
      { label: t('mapBrandAccent'), share: 8, color: resolved.accent1 },
      { label: t('mapStatusSignal'), share: 8, color: resolved.accentTeal },
    ];
  }

  if (mode === 'graphic') {
    return [
      { label: t('mapBackground'), share: 34, color: resolved.bg },
      { label: t('mapSurface'), share: 20, color: resolved.wall },
      { label: t('mapPrimaryBlock'), share: 16, color: resolved.accent1 },
      { label: t('mapText'), share: 12, color: resolved.shadow },
      { label: t('mapMutedLayer'), share: 10, color: resolved.details },
      { label: t('mapSignal'), share: 8, color: resolved.accentTeal },
    ];
  }

  return [
    { label: t('mapSwatches'), share: 50, color: resolved.wall },
    { label: t('mapMetadata'), share: 20, color: resolved.shadow },
    { label: t('mapBackground'), share: 20, color: resolved.bg },
    { label: t('mapAccentNotes'), share: 10, color: resolved.accent1 },
  ];
}

function getAssessment(mode: DesignMode, resolved: ResolvedRoleColors, lang: 'en' | 'es' = 'en'): AssessmentItem[] {
  const wallFloorDelta = Math.abs(resolved.wall.oklch.l - resolved.floor.oklch.l);
  const wallDetailContrast = getWcagContrast(resolved.shadow.rgb, resolved.wall.rgb);
  const accentDelta = Math.abs(resolved.accent1.oklch.l - resolved.wall.oklch.l);
  const surfaceChroma = Math.max(resolved.bg.oklch.c, resolved.wall.oklch.c, resolved.floor.oklch.c);
  const accentChroma = Math.max(resolved.accent1.oklch.c, resolved.accentTeal.oklch.c);
  const apca = checkApca(resolved.shadow.rgb, resolved.wall.rgb);

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key];
  };

  if (mode === 'architecture') {
    return [
      {
        label: t('assessWallFloorSep'),
        value: `${Math.round(wallFloorDelta * 100)} L`,
        status: wallFloorDelta >= 0.16 ? 'pass' : wallFloorDelta >= 0.09 ? 'warn' : 'fail',
        detail: wallFloorDelta >= 0.16 ? t('assessWallFloorSepPass') : t('assessWallFloorSepFail'),
      },
      {
        label: t('assessLargeSurfChroma'),
        value: surfaceChroma.toFixed(3),
        status: surfaceChroma <= 0.08 ? 'pass' : surfaceChroma <= 0.12 ? 'warn' : 'fail',
        detail: surfaceChroma <= 0.08 ? t('assessLargeSurfChromaPass') : t('assessLargeSurfChromaFail'),
      },
      {
        label: t('assessAccentDiscipline'),
        value: accentChroma.toFixed(3),
        status: accentChroma <= 0.12 && accentDelta >= 0.12 ? 'pass' : accentChroma <= 0.16 ? 'warn' : 'fail',
        detail: accentChroma <= 0.12 ? t('assessAccentDisciplinePass') : t('assessAccentDisciplineFail'),
      },
      {
        label: t('assessDetailReadability'),
        value: `${wallDetailContrast.toFixed(1)}:1`,
        status: apca.largeText ? 'pass' : apca.nonText ? 'warn' : 'fail',
        detail: apca.largeText ? t('assessDetailReadabilityPass') : t('assessDetailReadabilityFail'),
      },
    ];
  }

  return [
    {
      label: t('assessPrimaryContrast'),
      value: `${wallDetailContrast.toFixed(1)}:1`,
      status: wallDetailContrast >= 4.5 ? 'pass' : wallDetailContrast >= 3 ? 'warn' : 'fail',
      detail: wallDetailContrast >= 4.5 ? t('assessPrimaryContrastPass') : t('assessPrimaryContrastFail'),
    },
    {
      label: t('assessAccentSignal'),
      value: accentChroma.toFixed(3),
      status: accentChroma >= 0.06 ? 'pass' : 'warn',
      detail: accentChroma >= 0.06 ? t('assessAccentSignalPass') : t('assessAccentSignalFail'),
    },
    {
      label: t('assessSystemRestraint'),
      value: surfaceChroma.toFixed(3),
      status: surfaceChroma <= 0.1 ? 'pass' : surfaceChroma <= 0.14 ? 'warn' : 'fail',
      detail: surfaceChroma <= 0.1 ? t('assessSystemRestraintPass') : t('assessSystemRestraintFail'),
    },
  ];
}

function getContrastColor(surfaceHex: string, resolved: ResolvedRoleColors): string {
  try {
    const surfaceColor = createColorFromHex(surfaceHex, 'temp');
    const surfaceL = surfaceColor.oklch.l;
    let bestColor = resolved.shadow;
    let maxDelta = 0;
    const candidates = [
      resolved.bg,
      resolved.wall,
      resolved.floor,
      resolved.details,
      resolved.shadow,
      resolved.accent1,
      resolved.accent2,
      resolved.accentTeal
    ];
    for (const c of candidates) {
      if (!c) continue;
      const delta = Math.abs(c.oklch.l - surfaceL);
      if (delta > maxDelta) {
        maxDelta = delta;
        bestColor = c;
      }
    }
    return bestColor.hex;
  } catch {
    return resolved.shadow.hex;
  }
}

export default function MockupViewer({ colors, mode, onModeChange, paletteName = 'CRAN3O Spec', lang = 'en', isDarkMode = false }: MockupViewerProps) {
  const [activeSubtype, setActiveSubtype] = useState<string>(() => getDefaultSubtype(mode));
  // mode changes are handled by parent passing key={mode}, which remounts this component

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key];
  };

  const resolved = useMemo(() => resolveColorRoles(colors), [colors]);
  const applicationMap = useMemo(() => getApplicationMap(mode, resolved, lang), [mode, resolved, lang]);
  const assessment = useMemo(() => getAssessment(mode, resolved, lang), [mode, resolved, lang]);

  const bg = resolved.bg.hex;
  const wall = resolved.wall.hex;
  const floor = resolved.floor.hex;
  const details = resolved.details.hex;
  const shadow = resolved.shadow.hex;
  const accent1 = resolved.accent1.hex;
  const accent2 = resolved.accent2.hex;
  const accentTeal = resolved.accentTeal.hex;

  // -------------------------------------------------------------
  // Mode: ARCHITECTURE - Day View (technical interior elevation)
  // -------------------------------------------------------------
  const renderArchDay = () => {
    const textContrast = getContrastColor(bg, resolved);
    const wallContrast = getContrastColor(wall, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <rect x="30" y="30" width="440" height="260" fill={wall} rx="2" />

        <line x1="170" y1="30" x2="170" y2="290" stroke={wallContrast} strokeOpacity="0.15" strokeDasharray="3,3" />
        <line x1="310" y1="30" x2="310" y2="290" stroke={wallContrast} strokeOpacity="0.15" strokeDasharray="3,3" />
        <line x1="30" y1="160" x2="310" y2="160" stroke={wallContrast} strokeOpacity="0.15" strokeDasharray="3,3" />

        <rect x="30" y="280" width="440" height="10" fill={floor} />
        <line x1="30" y1="280" x2="470" y2="280" stroke={wallContrast} strokeOpacity="0.2" />

        <rect x="350" y="80" width="90" height="200" fill={floor} stroke={wallContrast} strokeOpacity="0.3" />
        <circle cx="362" cy="180" r="3.5" fill={accent1} />

        <rect x="70" y="140" width="160" height="8" fill={details} rx="1" />
        <rect x="90" y="105" width="12" height="35" fill={accent1} />
        <rect x="104" y="100" width="14" height="40" fill={accentTeal} />
        <rect x="120" y="112" width="10" height="28" fill={accent2} />
        <rect x="132" y="115" width="15" height="25" fill={floor} transform="rotate(15, 132, 140)" />

        <polygon points="185,140 195,140 198,115 182,115" fill={shadow} />
        <path d="M 190 115 C 190 95, 175 90, 172 80 C 178 92, 190 100, 190 115" fill="none" stroke={accentTeal} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 190 115 C 195 95, 208 90, 212 80 C 205 92, 192 100, 190 115" fill="none" stroke={accent1} strokeWidth="2" strokeLinecap="round" />

        <line x1="240" y1="30" x2="240" y2="70" stroke={shadow} strokeWidth="1.5" />
        <path d="M 220 70 L 260 70 L 270 90 L 210 90 Z" fill={details} />
        <polygon points="240,90 130,280 350,280" fill={accent1} opacity="0.12" />

        <line x1="30" y1="18" x2="470" y2="18" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <line x1="30" y1="14" x2="30" y2="22" stroke={textContrast} strokeOpacity="0.5" strokeWidth="0.8" />
        <line x1="470" y1="14" x2="470" y2="22" stroke={textContrast} strokeOpacity="0.5" strokeWidth="0.8" />
        <text x="250" y="13" fill={textContrast} opacity="0.6" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle">5000 mm</text>

        <line x1="18" y1="30" x2="18" y2="290" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <line x1="14" y1="30" x2="22" y2="30" stroke={textContrast} strokeOpacity="0.5" strokeWidth="0.8" />
        <line x1="14" y1="290" x2="22" y2="290" stroke={textContrast} strokeOpacity="0.5" strokeWidth="0.8" />
        <text x="12" y="165" fill={textContrast} opacity="0.6" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle" transform="rotate(-90, 12, 165)">3200 mm</text>

        <text x="35" y="45" fill={textContrast} opacity="0.5" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpElevationAATest')}</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: ARCHITECTURE - Night View (technical light value test)
  // -------------------------------------------------------------
  const renderArchNight = () => {
    const textContrast = '#ffffff';
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: '#090a0f', borderRadius: '4px' }}>
        <defs>
          <radialGradient id="night-lamp-glow" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={accent1} stopOpacity="1" />
            <stop offset="25%" stopColor={accentTeal} stopOpacity="0.4" />
            <stop offset="60%" stopColor="#090a0f" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="30" y="30" width="440" height="260" fill={shadow} rx="2" opacity="0.75" />
        <circle cx="240" cy="90" r="140" fill="url(#night-lamp-glow)" opacity="0.65" />
        <rect x="170" y="90" width="140" height="190" fill={wall} opacity="0.25" />

        <rect x="30" y="280" width="440" height="10" fill="#030405" />
        <rect x="200" y="280" width="80" height="10" fill={floor} opacity="0.4" />
        <line x1="30" y1="280" x2="470" y2="280" stroke="#ffffff" strokeOpacity="0.1" />

        <rect x="350" y="80" width="90" height="200" fill="#050607" stroke="#ffffff" strokeOpacity="0.1" />
        <circle cx="362" cy="180" r="3.5" fill={accentTeal} opacity="0.6" />

        <rect x="70" y="140" width="160" height="8" fill="#121418" rx="1" />
        <rect x="90" y="105" width="12" height="35" fill={accent1} opacity="0.5" />
        <rect x="104" y="100" width="14" height="40" fill={accentTeal} opacity="0.5" />

        <line x1="240" y1="30" x2="240" y2="70" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />
        <path d="M 220 70 L 260 70 L 270 90 L 210 90 Z" fill={details} opacity="0.8" />
        <circle cx="240" cy="90" r="8" fill="#ffffff" />

        <line x1="30" y1="18" x2="470" y2="18" stroke={textContrast} strokeOpacity="0.2" strokeWidth="0.8" />
        <line x1="30" y1="14" x2="30" y2="22" stroke={textContrast} strokeOpacity="0.3" strokeWidth="0.8" />
        <line x1="470" y1="14" x2="470" y2="22" stroke={textContrast} strokeOpacity="0.3" strokeWidth="0.8" />
        <text x="250" y="13" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle">5000 mm</text>

        <line x1="18" y1="30" x2="18" y2="290" stroke={textContrast} strokeOpacity="0.2" strokeWidth="0.8" />
        <text x="12" y="165" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle" transform="rotate(-90, 12, 165)">3200 mm</text>

        <text x="35" y="45" fill={textContrast} opacity="0.3" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpElevationAANight')}</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: ARCHITECTURE - Moodboard / CMF Board
  // -------------------------------------------------------------
  const renderArchMoodboard = () => {
    const boardBg = '#ffffff';
    const textContrast = getContrastColor(boardBg, resolved);
    const wallText = getContrastColor(wall, resolved);
    const floorText = getContrastColor(floor, resolved);
    const accent1Text = getContrastColor(accent1, resolved);
    const accentTealText = getContrastColor(accentTeal, resolved);
    const accent2Text = getContrastColor(accent2, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: boardBg, borderRadius: '4px' }}>
        <defs>
          <pattern id="moodboard-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={boardBg} />
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={textContrast} strokeWidth="0.5" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width="500" height="320" fill="url(#moodboard-grid)" />

        <text x="25" y="28" fill={textContrast} opacity="0.7" fontSize="9" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpCmfBoard')}</text>

        {/* Plaster sample */}
        <g transform="translate(25, 45)">
          <rect x="0" y="0" width="135" height="235" fill={boardBg} rx="3" stroke={textContrast} strokeOpacity="0.15" />
          <rect x="5" y="5" width="125" height="150" fill={wall} rx="2" />
          <path d="M15 170 H120 M15 185 H120 M15 200 H120" stroke={textContrast} strokeOpacity="0.08" />
          <text x="15" y="222" fill={textContrast} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpPlasterTexture')}</text>
          <text x="15" y="231" fill={textContrast} opacity="0.5" fontSize="7" fontFamily="'Space Mono', monospace">VAL: {wall.toUpperCase()}</text>
        </g>

        {/* Main Wall sample */}
        <g transform="translate(175, 45)">
          <rect x="0" y="0" width="140" height="110" fill={wall} rx="3" stroke={textContrast} strokeOpacity="0.15" />
          <rect x="5" y="5" width="130" height="70" fill={floor} rx="2" />
          <text x="12" y="93" fill={wallText} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpSurfaceWall')}</text>
          <text x="12" y="102" fill={wallText} opacity="0.65" fontSize="7" fontFamily="'Space Mono', monospace">VAL: {floor.toUpperCase()}</text>
        </g>

        {/* Floor stone sample */}
        <g transform="translate(175, 170)">
          <rect x="0" y="0" width="140" height="110" fill={floor} rx="3" stroke={textContrast} strokeOpacity="0.15" />
          <rect x="5" y="5" width="130" height="70" fill={details} rx="2" />
          <text x="12" y="93" fill={floorText} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpStoneConcrete')}</text>
          <text x="12" y="102" fill={floorText} opacity="0.65" fontSize="7" fontFamily="'Space Mono', monospace">VAL: {details.toUpperCase()}</text>
        </g>

        {/* Textile & Accent samples */}
        <g transform="translate(330, 45)">
          {/* Accent 1 */}
          <rect x="0" y="0" width="145" height="65" fill={accent1} rx="3" stroke={textContrast} strokeOpacity="0.15" />
          <text x="12" y="45" fill={accent1Text} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpAccentPrimary')}</text>
          <text x="12" y="54" fill={accent1Text} opacity="0.72" fontSize="7" fontFamily="'Space Mono', monospace">{accent1.toUpperCase()}</text>

          {/* Accent Teal */}
          <rect x="0" y="75" width="145" height="65" fill={accentTeal} rx="3" stroke={textContrast} strokeOpacity="0.15" />
          <text x="12" y="120" fill={accentTealText} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpAccentSignal')}</text>
          <text x="12" y="129" fill={accentTealText} opacity="0.72" fontSize="7" fontFamily="'Space Mono', monospace">{accentTeal.toUpperCase()}</text>

          {/* Accent 2 */}
          <rect x="0" y="150" width="145" height="85" fill={accent2} rx="3" stroke={textContrast} strokeOpacity="0.15" />
          <text x="12" y="215" fill={accent2Text} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpSecondaryAccent')}</text>
          <text x="12" y="224" fill={accent2Text} opacity="0.72" fontSize="7" fontFamily="'Space Mono', monospace">{accent2.toUpperCase()}</text>
        </g>

        {/* Technical notes */}
        <line x1="25" y1="295" x2="475" y2="295" stroke={textContrast} strokeOpacity="0.15" />
        <text x="25" y="307" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace">{t('bpCran3oSpec')}</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Abstract Speaker / Elevation & Profile 2D
  // -------------------------------------------------------------
  const renderIndSpeaker = () => {
    const textContrast = getContrastColor(bg, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <defs>
          <pattern id="speaker-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.2" fill={shadow} opacity="0.6" />
          </pattern>
        </defs>
        
        <text x="25" y="28" fill={textContrast} opacity="0.6" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpElevationProfileSpeaker')}</text>

        {/* FRONT VIEW */}
        <g transform="translate(60, 50)">
          <rect x="0" y="0" width="120" height="200" fill={wall} rx="4" stroke={textContrast} strokeOpacity="0.25" strokeWidth="1.5" />
          
          <circle cx="60" cy="50" r="22" fill={floor} stroke={textContrast} strokeOpacity="0.2" />
          <circle cx="60" cy="50" r="10" fill={accent2} />

          <circle cx="60" cy="125" r="35" fill={shadow} />
          <circle cx="60" cy="125" r="28" fill="url(#speaker-dots)" />
          <circle cx="60" cy="125" r="12" fill={accent1} />

          <rect x="40" y="180" width="40" height="8" fill={floor} rx="2" />
          <circle cx="85" cy="184" r="2.5" fill={accentTeal} />
          
          <text x="60" y="-10" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle">{t('bpFrontElevation')}</text>
        </g>

        {/* SIDE PROFILE VIEW */}
        <g transform="translate(260, 50)">
          <rect x="0" y="0" width="130" height="200" fill={wall} rx="2" stroke={textContrast} strokeOpacity="0.25" strokeWidth="1.5" />
          
          <rect x="0" y="0" width="8" height="200" fill={floor} />
          <line x1="8" y1="0" x2="8" y2="200" stroke={textContrast} strokeOpacity="0.2" />

          <rect x="120" y="60" width="10" height="80" fill={details} />
          <circle cx="125" cy="80" r="3.5" fill={accent1} />
          <circle cx="125" cy="100" r="3.5" fill={accentTeal} />

          <rect x="15" y="200" width="25" height="6" fill={shadow} rx="1" />
          <rect x="90" y="200" width="25" height="6" fill={shadow} rx="1" />

          <text x="65" y="-10" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle">{t('bpSideProfile')}</text>
        </g>

        {/* TECHNICAL DIMENSION LINES */}
        <line x1="35" y1="50" x2="35" y2="250" stroke={textContrast} strokeOpacity="0.3" strokeWidth="0.8" />
        <line x1="31" y1="50" x2="39" y2="50" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <line x1="31" y1="250" x2="39" y2="250" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <text x="27" y="155" fill={textContrast} opacity="0.5" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle" transform="rotate(-90, 27, 155)">200.0 mm</text>

        <line x1="60" y1="265" x2="180" y2="265" stroke={textContrast} strokeOpacity="0.3" strokeWidth="0.8" />
        <line x1="60" y1="261" x2="60" y2="269" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <line x1="180" y1="261" x2="180" y2="269" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <text x="120" y="276" fill={textContrast} opacity="0.5" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle">120.0 mm</text>

        <line x1="60" y1="50" x2="420" y2="50" stroke={textContrast} strokeOpacity="0.1" strokeDasharray="2,4" />
        <line x1="60" y1="250" x2="420" y2="250" stroke={textContrast} strokeOpacity="0.1" strokeDasharray="2,4" />
        
        <text x="25" y="302" fill={textContrast} opacity="0.35" fontSize="7.5" fontFamily="'Space Mono', monospace">{t('bpHousingSrf')}: {wall.toUpperCase()}{" // "}{t('bpDialsMut')}: {details.toUpperCase()}</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Abstract Chair Study (CAD 2D Elevations)
  // -------------------------------------------------------------
  const renderIndChair = () => {
    const textContrast = getContrastColor(bg, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <text x="25" y="28" fill={textContrast} opacity="0.6" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpChairCadSheet')}</text>

        {/* FRONT VIEW */}
        <g transform="translate(60, 60)">
          <path d="M 20 180 L 20 80 L 100 80 L 100 180" fill="none" stroke={details} strokeWidth="4" strokeLinecap="round" />
          <path d="M 15 180 L 105 180" fill="none" stroke={shadow} strokeWidth="3" />
          
          <rect x="25" y="40" width="70" height="50" fill={accent2} rx="4" stroke={textContrast} strokeOpacity="0.2" />
          <rect x="22" y="90" width="76" height="15" fill={accent1} rx="3" stroke={textContrast} strokeOpacity="0.2" />
          
          <line x1="30" y1="105" x2="30" y2="180" stroke={details} strokeWidth="3.5" />
          <line x1="90" y1="105" x2="90" y2="180" stroke={details} strokeWidth="3.5" />

          <text x="60" y="210" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle">{t('bpAlzadoFrontalFront')}</text>
        </g>

        {/* SIDE VIEW */}
        <g transform="translate(260, 60)">
          <path d="M 20 180 L 30 80 Q 30 40 40 40 L 50 40 Q 60 40 60 80 L 70 180" fill="none" stroke={details} strokeWidth="4" strokeLinecap="round" />
          <rect x="23" y="45" width="12" height="55" fill={accent2} rx="2" transform="rotate(8, 23, 45)" stroke={textContrast} strokeOpacity="0.2" />
          <rect x="25" y="92" width="75" height="12" fill={accent1} rx="2" transform="rotate(-5, 25, 92)" stroke={textContrast} strokeOpacity="0.2" />

          <path d="M 15 105 L 15 90 Q 15 80 40 80 L 80 80 Q 95 80 95 105 L 95 180" fill="none" stroke={shadow} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="10" y1="180" x2="105" y2="180" stroke={details} strokeWidth="3" />

          <text x="55" y="210" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle">{t('bpAlzadoLateralProfile')}</text>
        </g>

        {/* Alignment Lines */}
        <line x1="60" y1="100" x2="360" y2="100" stroke={textContrast} strokeOpacity="0.08" strokeDasharray="2,3" />
        <line x1="60" y1="140" x2="360" y2="140" stroke={textContrast} strokeOpacity="0.08" strokeDasharray="2,3" />
        <line x1="60" y1="240" x2="360" y2="240" stroke={textContrast} strokeOpacity="0.08" strokeDasharray="2,3" />

        {/* Height dimension */}
        <line x1="35" y1="100" x2="35" y2="240" stroke={textContrast} strokeOpacity="0.3" strokeWidth="0.8" />
        <line x1="31" y1="100" x2="39" y2="100" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <line x1="31" y1="240" x2="39" y2="240" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />
        <text x="27" y="170" fill={textContrast} opacity="0.5" fontSize="7" fontFamily="'Space Mono', monospace" textAnchor="middle" transform="rotate(-90, 27, 170)">820.0 mm</text>

        <text x="25" y="302" fill={textContrast} opacity="0.35" fontSize="7.5" fontFamily="'Space Mono', monospace">{t('bpCushionAcc1')}: {accent1.toUpperCase()}{" // "}{t('bpShellAcc2')}: {accent2.toUpperCase()}{" // "}{t('bpTubeMut')}: {details.toUpperCase()}</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Caliper Precision Tool (2D Blueprint)
  // -------------------------------------------------------------
  const renderIndTool = () => {
    const textContrast = getContrastColor(bg, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <text x="25" y="28" fill={textContrast} opacity="0.6" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpDigitalCaliper')}</text>

        <g transform="translate(50, 110)">
          <rect x="0" y="30" width="370" height="26" fill={floor} rx="2" stroke={textContrast} strokeOpacity="0.2" />
          
          <path d="M 40 30 L 40 38 M 50 30 L 50 35 M 60 30 L 60 38 M 70 30 L 70 35 M 80 30 L 80 38 M 90 30 L 90 35 M 100 30 L 100 38 M 110 30 L 110 35 M 120 30 L 120 38 M 130 30 L 130 35 M 140 30 L 140 38 M 150 30 L 150 35 M 160 30 L 160 38 M 170 30 L 170 35 M 180 30 L 180 38 M 190 30 L 190 35 M 200 30 L 200 38 M 210 30 L 210 38 M 220 30 L 220 35 M 230 30 L 230 38 M 240 30 L 240 35 M 250 30 L 250 38 M 260 30 L 260 35 M 270 30 L 270 38 M 280 30 L 280 35 M 290 30 L 290 38 M 300 30 L 300 35 M 310 30 L 310 38 M 320 30 L 320 35 M 330 30 L 330 38 M 340 30 L 340 35 M 350 30 L 350 38" stroke={textContrast} strokeOpacity="0.4" strokeWidth="0.8" />

          <path d="M 0 30 L 0 -40 L 15 -40 L 15 10 L 22 30 Z" fill={wall} stroke={textContrast} strokeOpacity="0.25" />
          <path d="M 0 56 L 0 120 L 15 120 L 20 62 L 22 56 Z" fill={wall} stroke={textContrast} strokeOpacity="0.25" />

          <rect x="370" y="38" width="40" height="8" fill={accentTeal} />

          <rect x="120" y="20" width="100" height="46" fill={shadow} rx="3" stroke={textContrast} strokeOpacity="0.1" />
          <rect x="130" y="26" width="60" height="24" fill={bg} rx="1" />
          <text x="160" y="43" fill={textContrast} fontSize="12" fontFamily="'Space Mono', monospace" fontWeight="700" textAnchor="middle">24.08</text>
          <text x="185" y="34" fill={textContrast} fontSize="6" fontFamily="'Space Mono', monospace">mm</text>

          <path d="M 120 20 L 120 -40 L 105 -40 L 115 20 Z" fill={wall} stroke={textContrast} strokeOpacity="0.25" />
          <path d="M 120 66 L 120 120 L 105 120 L 112 66 Z" fill={wall} stroke={textContrast} strokeOpacity="0.25" />

          <circle cx="205" cy="30" r="4.5" fill={accent1} />
          <circle cx="205" cy="42" r="4.5" fill={accentTeal} />
          <circle cx="205" cy="54" r="4.5" fill={accent2} />
        </g>

        <text x="25" y="280" fill={textContrast} opacity="0.4" fontSize="7.5" fontFamily="'Space Mono', monospace">{t('bpBeamBdr')}: {floor.toUpperCase()}{" // "}{t('bpDisplayCaseTxt')}: {shadow.toUpperCase()}{" // "}{t('bpMovableJawSrf')}: {wall.toUpperCase()}</text>
        <line x1="25" y1="262" x2="475" y2="262" stroke={textContrast} strokeOpacity="0.1" />
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: INDUSTRIAL - Coffee Brewer (2D Technical Elevation)
  // -------------------------------------------------------------
  const renderIndAppliance = () => {
    const textContrast = getContrastColor(bg, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <text x="25" y="28" fill={textContrast} opacity="0.6" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpEspressoElevation')}</text>

        <g transform="translate(180, 45)">
          <rect x="0" y="20" width="130" height="200" fill={wall} rx="4" stroke={textContrast} strokeOpacity="0.25" strokeWidth="1.5" />
          
          <rect x="-10" y="210" width="150" height="15" fill={floor} rx="2" stroke={textContrast} strokeOpacity="0.2" />
          <line x1="-10" y1="215" x2="140" y2="215" stroke={textContrast} strokeOpacity="0.15" />

          <rect x="35" y="80" width="60" height="20" fill={details} rx="1" />
          
          <rect x="60" y="90" width="65" height="10" fill={shadow} rx="2" />
          <circle cx="120" cy="95" r="7" fill={accent1} />

          <rect x="12" y="40" width="10" height="120" fill={floor} rx="2" />
          <rect x="14" y="60" width="6" height="90" fill={accentTeal} opacity="0.8" rx="1" />
          <circle cx="17" cy="85" r="3.5" fill="#ffffff" opacity="0.9" />

          <rect x="10" y="10" width="110" height="10" fill="none" stroke={details} strokeWidth="2.5" strokeLinecap="round" />

          <circle cx="65" cy="50" r="16" fill={bg} stroke={textContrast} strokeOpacity="0.3" />
          <line x1="65" y1="50" x2="72" y2="40" stroke={accent2} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="65" cy="50" r="2" fill={shadow} />

          <circle cx="98" cy="180" r="9" fill={shadow} />
          <rect x="96" y="174" width="4" height="12" fill={accent1} rx="1" />
        </g>

        <line x1="130" y1="65" x2="180" y2="65" stroke={textContrast} strokeOpacity="0.2" strokeWidth="0.8" />
        <text x="120" y="68" fill={textContrast} opacity="0.5" fontSize="7.5" fontFamily="'Space Mono', monospace" textAnchor="end">{t('bpBoilerPressure')}</text>

        <line x1="310" y1="140" x2="350" y2="140" stroke={textContrast} strokeOpacity="0.2" strokeWidth="0.8" />
        <text x="355" y="143" fill={textContrast} opacity="0.5" fontSize="7.5" fontFamily="'Space Mono', monospace" textAnchor="start">{t('bpPortafilterAccent')}</text>

        <text x="25" y="302" fill={textContrast} opacity="0.35" fontSize="7.5" fontFamily="'Space Mono', monospace">{t('bpChassisSrf')}: {wall.toUpperCase()}{" // "}{t('bpPortafilterTxt')}: {shadow.toUpperCase()}{" // "}{t('bpFluidsAccTl')}: {accentTeal.toUpperCase()}</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: GRAPHIC - Editorial Poster (Swiss Layout)
  // -------------------------------------------------------------
  const renderGraphPoster = () => {
    const textContrast = getContrastColor(bg, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <defs>
          <pattern id="poster-grid-pat" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="none" />
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={textContrast} strokeWidth="0.5" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width="500" height="320" fill="url(#poster-grid-pat)" />

        <rect x="15" y="15" width="470" height="290" fill="none" stroke={textContrast} strokeOpacity="0.15" strokeWidth="1" />

        <text x="35" y="55" fill={textContrast} fontSize="28" fontWeight="900" fontFamily="'Space Mono', monospace" letterSpacing="-1.5">CRAN3O COLOR</text>
        <text x="35" y="75" fill={accent1} fontSize="14" fontWeight="600" fontFamily="'Space Mono', monospace" letterSpacing="4">{t('bpOklchChromaticSystem')}</text>

        <g transform="translate(190, 40)">
          <path d="M 60 170 A 60 60 0 0 1 180 170 Z" fill={accent2} opacity="0.85" />
          <circle cx="160" cy="140" r="50" fill={accentTeal} opacity="0.8" style={{ mixBlendMode: 'multiply' }} />
          <rect x="40" y="80" width="80" height="80" fill={accent1} opacity="0.85" style={{ mixBlendMode: 'multiply' }} />

          <line x1="0" y1="170" x2="220" y2="170" stroke={textContrast} strokeOpacity="0.25" strokeWidth="1" />
          <line x1="120" y1="30" x2="120" y2="190" stroke={textContrast} strokeOpacity="0.25" strokeWidth="1" />
        </g>

        <text x="35" y="220" fill={textContrast} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpSwissGraphicsEdition')}</text>
        <text x="35" y="232" fill={textContrast} opacity="0.6" fontSize="7.5" fontFamily="'Space Mono', monospace">{t('bpMaxChromaCap')}</text>
        <text x="35" y="244" fill={accentTeal} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">SYS.ACC_TL: {accentTeal.toUpperCase()}</text>

        <g transform="translate(360, 220)">
          <text x="0" y="0" fill={textContrast} opacity="0.8" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpColorweightProportions')}</text>
          <rect x="0" y="8" width="100" height="6" fill={wall} />
          <rect x="0" y="8" width="60" height="6" fill={accent1} />
          <rect x="0" y="8" width="30" height="6" fill={accentTeal} />
          <text x="0" y="24" fill={textContrast} opacity="0.4" fontSize="7" fontFamily="'Space Mono', monospace">{t('bpTotalSystemHarmony')}</text>
        </g>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: GRAPHIC - UI Dashboard Card (Adaptive contrast)
  // -------------------------------------------------------------
  const renderGraphDashboard = () => {
    const textContrast = getContrastColor(bg, resolved);
    const windowHeader = floor;
    const widgetBg = wall;

    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: shadow, borderRadius: '4px' }}>
        <rect x="20" y="20" width="460" height="280" fill={bg} rx="6" stroke={details} strokeOpacity="0.3" />
        
        <path d="M 20 26 L 480 26 L 480 50 L 20 50 Z" fill={windowHeader} />
        <line x1="20" y1="50" x2="480" y2="50" stroke={details} strokeOpacity="0.2" />

        <circle cx="36" cy="38" r="4.5" fill={accent1} />
        <circle cx="48" cy="38" r="4.5" fill={accentTeal} />
        <circle cx="60" cy="38" r="4.5" fill={accent2} />

        <text x="460" y="42" fill={textContrast} opacity="0.6" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="end">{t('bpCran3oOsDashboard')}</text>

        {/* Navigation Sidebar */}
        <rect x="35" y="65" width="100" height="220" fill={widgetBg} rx="3" stroke={details} strokeOpacity="0.2" />
        
        <rect x="45" y="80" width="80" height="12" fill={accent1} rx="1" opacity="0.8" />
        <rect x="45" y="102" width="80" height="12" fill={bg} rx="1" />
        <rect x="45" y="124" width="80" height="12" fill={bg} rx="1" />
        <rect x="45" y="146" width="80" height="12" fill={bg} rx="1" />

        {/* Widgets */}
        <rect x="150" y="65" width="150" height="105" fill={widgetBg} rx="4" stroke={details} strokeOpacity="0.2" />
        <text x="165" y="85" fill={details} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpCoreTemperature')}</text>
        <text x="165" y="120" fill={textContrast} fontSize="24" fontWeight="800" fontFamily="'Space Mono', monospace">38.4</text>
        <text x="235" y="110" fill={textContrast} opacity="0.7" fontSize="10" fontFamily="'Space Mono', monospace">°C</text>
        
        <rect x="165" y="135" width="120" height="8" fill={bg} rx="2" />
        <rect x="165" y="135" width="80" height="8" fill={accentTeal} rx="2" />

        {/* Chart Widget */}
        <rect x="315" y="65" width="150" height="220" fill={widgetBg} rx="4" stroke={details} strokeOpacity="0.2" />
        <text x="330" y="85" fill={details} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpHarmonyMetric')}</text>
        
        <path d="M 330 220 Q 355 130 380 180 T 430 110" fill="none" stroke={accent1} strokeWidth="3" strokeLinecap="round" />
        <path d="M 330 220 Q 355 130 380 180 T 430 110 L 430 230 L 330 230 Z" fill={accent1} opacity="0.08" />
        <circle cx="430" cy="110" r="4.5" fill={accentTeal} />

        <rect x="150" y="180" width="150" height="105" fill={widgetBg} rx="4" stroke={details} strokeOpacity="0.2" />
        <text x="165" y="200" fill={details} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpSystemMetric')}</text>
        <text x="165" y="235" fill={textContrast} fontSize="18" fontWeight="800" fontFamily="'Space Mono', monospace">OKLCH OK</text>
        <text x="165" y="255" fill={textContrast} opacity="0.5" fontSize="7" fontFamily="'Space Mono', monospace">{t('bpContrastLc')}</text>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: GRAPHIC - Web Hero Section (Pristine 2D Layout)
  // -------------------------------------------------------------
  const renderGraphLanding = () => {
    const textContrast = getContrastColor(bg, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <defs>
          <pattern id="landing-grid-pat" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" />
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke={textContrast} strokeWidth="0.5" strokeOpacity="0.04" />
          </pattern>
        </defs>
        <rect width="500" height="320" fill="url(#landing-grid-pat)" />

        <rect x="25" y="20" width="450" height="24" fill={floor} rx="2" stroke={textContrast} strokeOpacity="0.15" />
        <circle cx="40" cy="32" r="3.5" fill={accentTeal} />
        
        <rect x="360" y="28" width="40" height="8" fill={shadow} opacity="0.4" rx="1" />
        <rect x="415" y="26" width="40" height="12" fill={accent1} rx="2" />
        <text x="435" y="34" fill="#ffffff" fontSize="6.5" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="middle" style={{ mixBlendMode: 'difference' }}>{t('bpStartLab')}</text>

        <g transform="translate(35, 75)">
          <text x="0" y="30" fill={textContrast} fontSize="22" fontWeight="900" fontFamily="'Space Mono', monospace" letterSpacing="-1">{t('bpQuietSystems')}</text>
          <text x="0" y="55" fill={textContrast} fontSize="22" fontWeight="900" fontFamily="'Space Mono', monospace" letterSpacing="-1">{t('bpFunctionalAesthetic')}</text>
          <text x="0" y="80" fill={details} fontSize="9.5" fontWeight="500" fontFamily="'Space Mono', monospace">{t('bpOklchChromaEngine')}</text>
          
          <rect x="0" y="115" width="85" height="26" fill={accent1} rx="3" />
          <text x="42.5" y="131" fill="#ffffff" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="middle" style={{ mixBlendMode: 'difference' }}>{t('bpStartLab')}</text>

          <rect x="100" y="115" width="85" height="26" fill="none" stroke={details} strokeWidth="1.5" rx="3" />
          <text x="142.5" y="131" fill={textContrast} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="middle">{t('bpExplore')}</text>
        </g>

        {/* 2D Geometric Composition */}
        <g transform="translate(290, 75)">
          <rect x="0" y="0" width="165" height="175" fill={floor} rx="4" stroke={textContrast} strokeOpacity="0.15" />
          
          <line x1="30" y1="0" x2="30" y2="175" stroke={textContrast} strokeOpacity="0.1" />
          <line x1="110" y1="0" x2="110" y2="175" stroke={textContrast} strokeOpacity="0.1" />
          <line x1="0" y1="80" x2="165" y2="80" stroke={textContrast} strokeOpacity="0.1" />

          <circle cx="70" cy="80" r="45" fill={accentTeal} opacity="0.8" />
          <circle cx="100" cy="90" r="30" fill={accent2} opacity="0.85" style={{ mixBlendMode: 'multiply' }} />
          
          <rect x="25" y="135" width="115" height="15" fill={accent1} rx="2" opacity="0.9" />

          <text x="12" y="163" fill={textContrast} opacity="0.5" fontSize="6.5" fontFamily="'Space Mono', monospace">{t('bpFig01EngineCore')}</text>
        </g>
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: GRAPHIC - Product Sleeve / Flat Packaging Die-Cut
  // -------------------------------------------------------------
  const renderGraphPackaging = () => {
    const textContrast = getContrastColor(bg, resolved);
    return (
      <svg viewBox="0 0 500 320" width="100%" height="100%" style={{ background: bg, borderRadius: '4px' }}>
        <defs>
          <pattern id="packaging-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" />
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={textContrast} strokeWidth="0.5" strokeOpacity="0.04" />
          </pattern>
        </defs>
        <rect width="500" height="320" fill="url(#packaging-grid)" />

        <text x="25" y="28" fill={textContrast} opacity="0.6" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace">{t('bpDieCutSleeve')}</text>

        <g transform="translate(30, 45)">
          <rect x="20" y="20" width="90" height="180" fill={floor} stroke={textContrast} strokeOpacity="0.4" strokeDasharray="3,3" />
          <text x="65" y="110" fill={textContrast} opacity="0.4" fontSize="8" fontFamily="'Space Mono', monospace" textAnchor="middle">{t('bpRearCover')}</text>

          <rect x="110" y="20" width="30" height="180" fill={floor} stroke={textContrast} strokeOpacity="0.4" strokeDasharray="3,3" />
          <text x="125" y="110" fill={textContrast} opacity="0.4" fontSize="8" fontFamily="'Space Mono', monospace" textAnchor="middle" transform="rotate(-90, 125, 110)">{t('bpSpineA')}</text>

          <rect x="140" y="20" width="90" height="180" fill={wall} stroke={textContrast} strokeOpacity="0.4" />
          
          <rect x="150" y="35" width="70" height="15" fill={accent1} rx="1" />
          <text x="185" y="45" fill="#ffffff" fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="middle" style={{ mixBlendMode: 'difference' }}>CRAN3O</text>
          
          <circle cx="185" cy="100" r="28" fill={accentTeal} opacity="0.8" />
          <circle cx="185" cy="100" r="16" fill={accent2} opacity="0.85" />
          <circle cx="185" cy="100" r="4" fill={bg} />

          <g transform="translate(155, 160)">
            <rect x="0" y="0" width="1" height="15" fill={shadow} />
            <rect x="3" y="0" width="3" height="15" fill={shadow} />
            <rect x="8" y="0" width="1" height="15" fill={shadow} />
            <rect x="11" y="0" width="2" height="15" fill={shadow} />
            <rect x="15" y="0" width="4" height="15" fill={shadow} />
            <rect x="21" y="0" width="1" height="15" fill={shadow} />
            <rect x="24" y="0" width="3" height="15" fill={shadow} />
            <rect x="29" y="0" width="1" height="15" fill={shadow} />
            <rect x="32" y="0" width="5" height="15" fill={shadow} />
            <rect x="39" y="0" width="1" height="15" fill={shadow} />
          </g>

          <rect x="230" y="20" width="30" height="180" fill={floor} stroke={textContrast} strokeOpacity="0.4" strokeDasharray="3,3" />
          <text x="245" y="110" fill={textContrast} opacity="0.4" fontSize="8" fontFamily="'Space Mono', monospace" textAnchor="middle" transform="rotate(-90, 245, 110)">{t('bpSpineB')}</text>

          <polygon points="260,30 280,45 280,175 260,190" fill={details} opacity="0.25" stroke={textContrast} strokeOpacity="0.4" />
          <text x="270" y="110" fill={textContrast} opacity="0.3" fontSize="6.5" fontFamily="'Space Mono', monospace" textAnchor="middle" transform="rotate(-90, 270, 110)">{t('bpGlueFlap')}</text>

          <path d="M 20 20 L 260 20 M 20 200 L 260 200" stroke={accent1} strokeWidth="1.2" strokeOpacity="0.5" />
        </g>

        <text x="25" y="280" fill={textContrast} opacity="0.4" fontSize="7.5" fontFamily="'Space Mono', monospace">{t('bpSolidLineCut')}</text>
        <line x1="25" y1="262" x2="475" y2="262" stroke={textContrast} strokeOpacity="0.15" />
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: SPEC - List View (Horizontal Technical Card Rows)
  // -------------------------------------------------------------
  const renderSpecList = () => {
    const textContrast = getContrastColor('#ffffff', resolved);
    return (
      <svg viewBox="0 0 500 500" width="100%" height="100%" style={{ background: '#ffffff', borderRadius: '4px' }}>
        <rect width="500" height="500" fill="#ffffff" />
        <line x1="20" y1="45" x2="480" y2="45" stroke={textContrast} strokeWidth="1" opacity="0.15" />
        <text x="20" y="26" fill={textContrast} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace" letterSpacing="2">CRAN3O COLOR STUDIO</text>
        <text x="480" y="26" fill={textContrast} fontSize="8" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="end" letterSpacing="1">{t('bpSpecSheet')}</text>
        <text x="20" y="38" fill={textContrast} opacity="0.6" fontSize="9" fontWeight="600" fontFamily="'Space Mono', monospace">{t('bpPaletteLabel')}{paletteName.toUpperCase()}</text>

        {colors.map((color, i) => {
          const rowHeight = Math.floor(430 / colors.length);
          const y = 55 + i * rowHeight;
          const swatchHeight = rowHeight - 8;
          const swatchWidth = 300;
          const isStacked = rowHeight >= 45;

          if (rowHeight >= 75) {
            const nameSize = rowHeight >= 100 ? 13 : 11.5;
            const hexSize = rowHeight >= 100 ? 10.5 : 9.5;
            const badgeHeight = 16;
            const badgeY = y + rowHeight / 2 + 12;
            const lines = splitName(color.displayName);
            const lineSpacing = nameSize + 2;

            return (
              <g key={color.id}>
                <rect x="20" y={y + 4} width={swatchWidth} height={swatchHeight} rx="3" fill={color.hex} stroke={textContrast} strokeOpacity="0.1" />

                {lines.map((line, idx) => (
                  <text 
                    key={idx} 
                    x="340" 
                    y={y + rowHeight / 2 - 16 + (idx * lineSpacing) - (lines.length > 1 ? lineSpacing / 2 : 0)} 
                    fill={textContrast} 
                    fontSize={nameSize} 
                    fontWeight="700" 
                    fontFamily="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
                  >
                    {line}
                  </text>
                ))}

                <text x="340" y={y + rowHeight / 2 + 2 + (lines.length > 1 ? 4 : 0)} fill={textContrast} opacity="0.5" fontSize={hexSize} fontFamily="'Space Mono', monospace">
                  {color.hex.toUpperCase()}
                </text>

                <rect x="340" y={badgeY} width="50" height={badgeHeight} rx="2" fill="none" stroke={textContrast} strokeOpacity="0.25" strokeWidth="1" />
                <text x="365" y={badgeY + badgeHeight / 2 + 3} fill={textContrast} opacity="0.7" fontSize="7" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="middle" letterSpacing="0.5">
                  {getRoleAbbreviation(color.role)}
                </text>

                {i < colors.length - 1 && (
                  <line x1="20" y1={y + rowHeight} x2="480" y2={y + rowHeight} stroke={textContrast} strokeWidth="1" opacity="0.08" />
                )}
              </g>
            );
          } else if (isStacked) {
            const lines = splitName(color.displayName);
            const nameSize = 10;
            const lineSpacing = nameSize + 1.5;

            return (
              <g key={color.id}>
                <rect x="20" y={y + 4} width={swatchWidth} height={swatchHeight} rx="3" fill={color.hex} stroke={textContrast} strokeOpacity="0.1" />

                {lines.map((line, idx) => (
                  <text 
                    key={idx} 
                    x="340" 
                    y={y + rowHeight / 2 - 4 + (idx * lineSpacing) - (lines.length > 1 ? lineSpacing / 2 : 0)} 
                    fill={textContrast} 
                    fontSize={nameSize} 
                    fontWeight="700" 
                    fontFamily="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
                  >
                    {line}
                  </text>
                ))}
                <text x="340" y={y + rowHeight / 2 + 10 + (lines.length > 1 ? 5 : 0)} fill={textContrast} opacity="0.5" fontSize="8.5" fontFamily="'Space Mono', monospace">
                  {color.hex.toUpperCase()}
                </text>

                <text x="480" y={y + rowHeight / 2 + 4} fill={textContrast} opacity="0.7" fontSize="7.5" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="end">
                  {getRoleAbbreviation(color.role)}
                </text>

                {i < colors.length - 1 && (
                  <line x1="20" y1={y + rowHeight} x2="480" y2={y + rowHeight} stroke={textContrast} strokeWidth="1" opacity="0.08" />
                )}
              </g>
            );
          } else {
            const lines = splitName(color.displayName);
            const nameSize = 8.5;
            const lineSpacing = nameSize + 1.5;
            
            return (
              <g key={color.id}>
                <rect x="20" y={y + 4} width={swatchWidth} height={swatchHeight} rx="3" fill={color.hex} stroke={textContrast} strokeOpacity="0.1" />

                {lines.map((line, idx) => (
                  <text 
                    key={idx} 
                    x="340" 
                    y={y + rowHeight / 2 - 3 + (idx * lineSpacing) - (lines.length > 1 ? lineSpacing / 2 : 0)} 
                    fill={textContrast} 
                    fontSize={nameSize} 
                    fontWeight="700" 
                    fontFamily="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
                  >
                    {line}
                  </text>
                ))}
                <text x="340" y={y + rowHeight / 2 + 8 + (lines.length > 1 ? 4 : 0)} fill={textContrast} opacity="0.5" fontSize="7.5" fontFamily="'Space Mono', monospace">
                  {color.hex.toUpperCase()}
                </text>

                <text x="480" y={y + rowHeight / 2 + 3} fill={textContrast} opacity="0.7" fontSize="7.5" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="end">
                  {getRoleAbbreviation(color.role)}
                </text>

                {i < colors.length - 1 && (
                  <line x1="20" y1={y + rowHeight} x2="480" y2={y + rowHeight} stroke={textContrast} strokeWidth="1" opacity="0.08" />
                )}
              </g>
            );
          }
        })}
      </svg>
    );
  };

  // -------------------------------------------------------------
  // Mode: SPEC - Columns View (Vertical Color Bands & Rotated technical text)
  // -------------------------------------------------------------
  const renderSpecColumns = () => {
    const N = colors.length;
    const w = 500 / N;
    const textContrast = getContrastColor('#ffffff', resolved);
    
    return (
      <svg viewBox="0 0 500 500" width="100%" height="100%" style={{ background: '#ffffff', borderRadius: '4px' }}>
        <rect width="500" height="500" fill="#ffffff" />
        {colors.map((color, i) => {
          const x = i * w;
          return (
            <g key={color.id}>
              <rect x={x} y="0" width={w} height="360" fill={color.hex} />
              <rect x={x} y="360" width={w} height="140" fill="#ffffff" />
              {i > 0 && (
                <line x1={x} y1="0" x2={x} y2="500" stroke={textContrast} strokeWidth="1" opacity="0.1" />
              )}
              <g transform={`translate(${x + w/2}, 485) rotate(-90)`}>
                <text x="0" y="-10" fill={textContrast} fontSize="9.5" fontWeight="700" fontFamily="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" textAnchor="start">
                  {color.displayName}
                </text>
                <text x="0" y="1.5" fill={textContrast} opacity="0.5" fontSize="8.5" fontWeight="500" fontFamily="'Space Mono', monospace" textAnchor="start">
                  {color.hex.toUpperCase()}
                </text>
                <text x="0" y="11" fill={textContrast} opacity="0.7" fontSize="7" fontWeight="700" fontFamily="'Space Mono', monospace" textAnchor="start" letterSpacing="0.5">
                  {getRoleAbbreviation(color.role)}
                </text>
              </g>
            </g>
          );
        })}
        <line x1="0" y1="360" x2="500" y2="360" stroke={textContrast} strokeWidth="1" opacity="0.15" />
      </svg>
    );
  };

const renderSvgToImageBlob = (svgElement: SVGSVGElement): Promise<Blob | null> => {
  const isNight = activeSubtype === 'night';
  const isSpec = mode === 'spec';
  const bgColor = isSpec || activeSubtype === 'moodboard'
    ? '#ffffff'
    : (isNight ? '#0b0d0e' : (isDarkMode ? '#0c0f12' : '#fdfbf7'));

  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 1000;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobURL);
        resolve(null);
        return;
      }

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
      URL.revokeObjectURL(blobURL);
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
    };
    image.onerror = () => {
      URL.revokeObjectURL(blobURL);
      resolve(null);
    };
    image.src = blobURL;
  });
};

const handleDownloadJpg = () => {
  const svgElement = document.querySelector('.mockup-canvas-wrapper svg') as SVGSVGElement | null;
  if (!svgElement) return;

  renderSvgToImageBlob(svgElement).then((blob) => {
    if (!blob) return;
    const jpgURL = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = jpgURL;
    downloadLink.download = `${mode}-${activeSubtype}-mockup-square.png`;
    downloadLink.click();
    URL.revokeObjectURL(jpgURL);
  });
};

const handleCopyMockupImage = async (event: React.MouseEvent<HTMLDivElement>) => {
  event.preventDefault();
  const svgElement = event.currentTarget.querySelector('svg') as SVGSVGElement | null;
  if (!svgElement) return;

  const blob = await renderSvgToImageBlob(svgElement);
  const label = `${paletteName} / ${mode.toUpperCase()} / ${activeSubtype.toUpperCase()}`;
  if (!blob) {
    await navigator.clipboard.writeText(label);
    return;
  }

  if ('ClipboardItem' in window && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
        'text/plain': new Blob([label], { type: 'text/plain' }),
      }),
    ]);
  } else {
    await navigator.clipboard.writeText(label);
  }
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
        { id: 'day', label: t('subtypeSpace'), icon: <MaterialIcon name="wb_sunny" size={14} /> },
        { id: 'night', label: t('subtypeNight'), icon: <MaterialIcon name="dark_mode" size={14} /> },
        { id: 'moodboard', label: t('subtypeMaterials'), icon: <MaterialIcon name="layers" size={14} /> },
      ];
    } else if (mode === 'industrial') {
      return [
        { id: 'speaker', label: t('subtypeSpeaker'), icon: <MaterialIcon name="speaker" size={14} /> },
        { id: 'chair', label: t('subtypeChair'), icon: <MaterialIcon name="chair" size={14} /> },
        { id: 'tool', label: t('subtypeTool'), icon: <MaterialIcon name="straighten" size={14} /> },
        { id: 'appliance', label: t('subtypeAppliance'), icon: <MaterialIcon name="coffee_maker" size={14} /> },
      ];
    } else if (mode === 'spec') {
      return [
        { id: 'list', label: t('subtypeList'), icon: <MaterialIcon name="article" size={14} /> },
        { id: 'columns', label: t('subtypeColumns'), icon: <MaterialIcon name="dashboard" size={14} /> },
      ];
    } else {
      return [
        { id: 'poster', label: t('subtypePoster'), icon: <MaterialIcon name="article" size={14} /> },
        { id: 'dashboard', label: t('subtypeUi'), icon: <MaterialIcon name="dashboard" size={14} /> },
        { id: 'landing', label: t('subtypeHero'), icon: <MaterialIcon name="web" size={14} /> },
        { id: 'packaging', label: t('subtypeSleeve'), icon: <MaterialIcon name="inventory_2" size={14} /> },
      ];
    }
  };

  return (
    <div className="mockup-viewer-panel">
      <div className="mockup-panel-header">
        <div>
          <h3 className="section-title">{t('appliedColorLab')}</h3>
          <p className="section-description">{getModeDescription(mode, lang)}</p>
        </div>
        <div className="mockup-panel-actions">
          <div className="mode-toggle-group mockup-mode-tabs" aria-label="Design mode">
            {(['architecture', 'industrial', 'graphic', 'spec'] as DesignMode[]).map((item) => (
              <button key={item} onClick={() => onModeChange(item)} className={`mode-btn ${mode === item ? 'active' : ''}`}>
                {item === 'architecture' ? t('modeArch') : item === 'industrial' ? t('modeCmf') : item === 'graphic' ? t('modeGraphic') : t('modeSpec')}
              </button>
            ))}
          </div>
          <button 
            onClick={handleDownloadJpg} 
            className="calculator-action"
            title={t('downloadPngSquare')}
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

      <div
        className="mockup-canvas-wrapper"
        style={{ aspectRatio: mode === 'spec' ? '1 / 1' : '500 / 320' }}
        onContextMenu={handleCopyMockupImage}
        title={t('rightClickCopyMockup')}
      >
        {renderActiveMockup()}
      </div>

      <div className="application-map">
        <div className="application-map-header">
          <span>{t('applicationMap')}</span>
          <b>{mode === 'architecture' ? t('spatialUse') : mode === 'industrial' ? t('cmfUse') : mode === 'graphic' ? t('systemUse') : t('sheetUse')}</b>
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
