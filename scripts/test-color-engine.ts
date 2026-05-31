import { generateHarmony } from '../lib/harmony';
import { applySliders } from '../lib/variation';
import { checkWcag, checkApca } from '../lib/accessibility';
import { generateColorName } from '../lib/naming';
import { exportPaletteToSvg } from '../lib/exporters/svg-exporter';
import { createColorFromHex } from '../lib/color-spaces';
import { createPaletteFromPreset, moveColor, normalizePaletteSize } from '../lib/palette';
import { PRESETS } from '../data/presets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log('--- STARTING QUIET FUTURE COLOR STUDIO TEST SUITE ---');

// Test 1: Harmonies
console.log('Test 1: Verifying harmonies generation...');
const seedOklch = { l: 0.70, c: 0.05, h: 220 }; // cool blue
const harmonyColors = generateHarmony(seedOklch, 'complementary');
assert(harmonyColors.length === 8, `Harmony complementary should yield 8 colors, got ${harmonyColors.length}`);
assert(harmonyColors[0].l > 0.8, 'First element of complementary should be a light tone');
assert(harmonyColors[7].l < 0.3, 'Last element of complementary should be a dark tone');
console.log('✅ Harmonies passed.');

// Test 2: Color Lock
console.log('Test 2: Verifying color locking mechanics...');
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

assert(mutatedColors[0].hex === initialColors[0].hex, `Locked color changed from ${initialColors[0].hex} to ${mutatedColors[0].hex}`);
assert(mutatedColors[1].hex !== initialColors[1].hex, `Unlocked color remained the same: ${initialColors[1].hex}`);
console.log('✅ Color lock passed.');

// Test 3: Contrast Calculations
console.log('Test 3: Verifying accessibility contrast matrix accuracy...');
const white = { r: 255, g: 255, b: 255 };
const black = { r: 0, g: 0, b: 0 };
const wcag = checkWcag(white, black);
const apca = checkApca(white, black);

assert(wcag.ratio === 21, `WCAG ratio for white on black should be 21:1, got ${wcag.ratio}:1`);
assert(apca.score <= -100 || apca.score >= 100, `APCA score for high contrast should be near absolute 100, got Lc ${apca.score}`);
console.log('✅ Accessibility calculations passed.');

// Test 4: Naming Generator
console.log('Test 4: Verifying color naming generator consistency...');
const name1 = generateColorName({ l: 0.95, c: 0.01, h: 60 });
const name2 = generateColorName({ l: 0.15, c: 0.01, h: 220 });
assert(typeof name1 === 'string' && name1.length > 0, 'Name 1 should be a non-empty string');
assert(name1 !== 'Soot Soot', 'Naming generator should prevent duplicate words');
assert(name2.includes('Carbon') || name2.includes('Soot') || name2.includes('Ink') || name2.includes('Graphite') || name2.includes('Hearth'), `Name 2 should match low lightness naming: ${name2}`);
console.log('✅ Naming consistency passed.');

// Test 5: Exporter outputs
console.log('Test 5: Verifying SVG export structure...');
const dummyColors = [
  createColorFromHex('#E9E4DA', 'Vapor Linen'),
  createColorFromHex('#34373C', 'Carbon Silk')
];
const svgOutput = exportPaletteToSvg(dummyColors, 'Quiet Future', 'Architecture');
assert(svgOutput.includes('<svg') && svgOutput.includes('</svg>'), 'SVG output should contain standard svg tags');
assert(svgOutput.includes('VAPOR LINEN') || svgOutput.includes('Vapor Linen'), 'SVG output should render color name labels');
console.log('✅ Exporter output passed.');

// Test 6: Palette sizing
console.log('Test 6: Verifying palette size controls...');
const sizedThree = createPaletteFromPreset(PRESETS[0], 3, 'architecture');
const sizedTwelve = createPaletteFromPreset(PRESETS[0], 12, 'graphic');
const presetSizeOverride = createPaletteFromPreset(PRESETS[1], 5, 'architecture');
assert(sizedThree.length === 3, `Expected 3 colors, got ${sizedThree.length}`);
assert(sizedTwelve.length === 12, `Expected 12 colors, got ${sizedTwelve.length}`);
assert(presetSizeOverride.length === 5, `Preset loading should respect requested palette size, got ${presetSizeOverride.length}`);
assert(sizedTwelve.every((color) => color.displayName.length > 0), 'Generated extension colors should have names');
console.log('✅ Palette sizing passed.');

// Test 7: Reordering preserves color data
console.log('Test 7: Verifying manual reordering mechanics...');
const reorderSeed = createPaletteFromPreset(PRESETS[0], 5, 'architecture');
reorderSeed[1].locked = true;
const moved = moveColor(reorderSeed, 1, 3);
assert(moved[3].id === reorderSeed[1].id, 'Moved color should retain its id');
assert(moved[3].locked === true, 'Moved color should retain lock state');
assert(moved[3].displayName === reorderSeed[1].displayName, 'Moved color should retain display name');
assert(moved[3].role === reorderSeed[1].role, 'Moved color should retain semantic role');
const resizedAfterMove = normalizePaletteSize(moved, 4, 'architecture');
assert(resizedAfterMove.length === 4, `Resized reordered palette should have 4 colors, got ${resizedAfterMove.length}`);
assert(resizedAfterMove.some((color) => color.id === reorderSeed[1].id && color.locked), 'Resizing should preserve locked moved color');
const movedSvg = exportPaletteToSvg(moved, 'Reordered', 'Architecture');
assert(
  movedSvg.indexOf(moved[0].hex.toUpperCase()) < movedSvg.indexOf(moved[3].hex.toUpperCase()),
  'SVG export should preserve current palette order'
);
console.log('✅ Reordering passed.');

console.log('\n🎉 ALL COLOR ENGINE UNIT TESTS PASSED SUCCESSFULLY! 🎉');
