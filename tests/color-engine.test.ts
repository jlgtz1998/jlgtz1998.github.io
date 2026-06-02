import { describe, it, expect } from 'vitest';
import { generateHarmony } from '../lib/harmony';
import { applySliders } from '../lib/variation';
import { checkWcag, checkApca } from '../lib/accessibility';
import { generateColorName } from '../lib/naming';
import { exportPaletteToSvg } from '../lib/exporters/svg-exporter';
import { createColorFromHex } from '../lib/color-spaces';
import { createPaletteFromPreset, createPaletteFromPresetNative, moveColor, normalizePaletteSize, generatePaletteHarmony } from '../lib/palette';
import { PRESETS } from '../data/presets';

describe('CRAN3O Color Studio Engine', () => {
  it('Verifies harmonies generation (Test 1)', () => {
    const seedOklch = { l: 0.70, c: 0.05, h: 220 }; // cool blue
    const harmonyColors = generateHarmony(seedOklch, 'complementary');
    expect(harmonyColors.length).toBe(8);
    expect(harmonyColors[0].l).toBeGreaterThan(0.8);
    expect(harmonyColors[7].l).toBeLessThan(0.3);
  });

  it('Verifies color locking mechanics (Test 2)', () => {
    const initialColors = [
      createColorFromHex('#E9E4DA', 'Vapor Linen'),
      createColorFromHex('#34373C', 'Carbon Silk')
    ];
    initialColors[0].locked = true; // lock Vapor Linen
    initialColors[1].locked = false; // unlock Carbon Silk

    const mutatedColors = applySliders(initialColors, {
      temperature: 100, // force warm
      muting: 100, // force fully muted
      contrast: 100,
      luminosity: 100,
      futurism: 100,
      neutrality: 100,
      warmAccent: 100,
      cinematicFog: 100,
      materialFeel: 100,
    });

    expect(mutatedColors[0].hex).toBe(initialColors[0].hex);
    expect(mutatedColors[1].hex).not.toBe(initialColors[1].hex);
  });

  it('Verifies accessibility contrast matrix accuracy (Test 3)', () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    const wcag = checkWcag(white, black);
    const apca = checkApca(white, black);

    expect(wcag.ratio).toBe(21);
    expect(apca.score <= -100 || apca.score >= 100).toBe(true);
  });

  it('Verifies color naming generator consistency (Test 4)', () => {
    const name1 = generateColorName({ l: 0.95, c: 0.01, h: 60 });
    const name2 = generateColorName({ l: 0.15, c: 0.01, h: 220 });
    expect(typeof name1).toBe('string');
    expect(name1.length).toBeGreaterThan(0);
    expect(name1).not.toBe('Soot Soot');
    
    const validLowLightnessWords = ['Carbon', 'Soot', 'Ink', 'Graphite', 'Hearth'];
    const matchesKeyword = validLowLightnessWords.some((word) => name2.includes(word));
    expect(matchesKeyword).toBe(true);
  });

  it('Verifies SVG export structure (Test 5)', () => {
    const dummyColors = [
      createColorFromHex('#E9E4DA', 'Vapor Linen'),
      createColorFromHex('#34373C', 'Carbon Silk')
    ];
    const svgOutput = exportPaletteToSvg(dummyColors, 'Quiet Future', 'Architecture');
    expect(svgOutput.includes('<svg')).toBe(true);
    expect(svgOutput.includes('</svg>')).toBe(true);
    expect(svgOutput.includes('VAPOR LINEN') || svgOutput.includes('Vapor Linen')).toBe(true);
  });

  it('Verifies palette size controls (Test 6)', () => {
    const sizedThree = createPaletteFromPreset(PRESETS[0], 3, 'architecture');
    const sizedEight = createPaletteFromPreset(PRESETS[0], 8, 'architecture');
    const sizedTwelve = createPaletteFromPreset(PRESETS[0], 12, 'graphic');
    const presetSizeOverride = createPaletteFromPreset(PRESETS[1], 5, 'architecture');
    const nativeQuietFuture = createPaletteFromPresetNative(PRESETS[0], 'architecture');
    const nativeCurtainStone = createPaletteFromPresetNative(PRESETS.find((preset) => preset.id === 'curtain-stone')!, 'architecture');

    expect(sizedThree.length).toBe(3);
    expect(sizedEight.length).toBe(8);
    expect(sizedTwelve.length).toBe(12);
    expect(presetSizeOverride.length).toBe(5);
    expect(nativeQuietFuture.length).toBe(PRESETS[0].colors.length);
    expect(nativeCurtainStone.length).toBe(6);
    expect(sizedTwelve.every((color) => color.displayName.length > 0)).toBe(true);
  });

  it('Verifies manual reordering mechanics (Test 7)', () => {
    const reorderSeed = createPaletteFromPreset(PRESETS[0], 5, 'architecture');
    reorderSeed[1].locked = true;
    const moved = moveColor(reorderSeed, 1, 3);
    
    expect(moved[3].id).toBe(reorderSeed[1].id);
    expect(moved[3].locked).toBe(true);
    expect(moved[3].displayName).toBe(reorderSeed[1].displayName);
    expect(moved[3].role).toBe(reorderSeed[1].role);

    const resizedAfterMove = normalizePaletteSize(moved, 4, 'architecture');
    expect(resizedAfterMove.length).toBe(4);
    expect(resizedAfterMove.some((color) => color.id === reorderSeed[1].id && color.locked)).toBe(true);

    const movedSvg = exportPaletteToSvg(moved, 'Reordered', 'Architecture');
    const hex0Index = movedSvg.indexOf(moved[0].hex.toUpperCase());
    const hex3Index = movedSvg.indexOf(moved[3].hex.toUpperCase());
    expect(hex0Index).toBeLessThan(hex3Index);
  });

  it('roles manuales se preservan al generar armonía', () => {
    const initialColors = createPaletteFromPreset(PRESETS[0], 8, 'architecture');
    initialColors[1].role = 'primary';
    initialColors[2].role = 'accent';
    initialColors[2].locked = true;

    const seedColor = initialColors[0];
    const generated = generatePaletteHarmony(initialColors, seedColor, 'complementary', 'architecture');

    expect(generated[1].hex).not.toBe(initialColors[1].hex);
    expect(generated[1].role).toBe('primary');

    expect(generated[2].hex).toBe(initialColors[2].hex);
    expect(generated[2].role).toBe('accent');

    expect(generated[3].role).toBe('muted');
  });
});
