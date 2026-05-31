import { ColorData } from '../../types';

export function exportPaletteToSvg(colors: ColorData[], paletteName: string, modeName: string): string {
  const width = 800;
  const height = colors.length * 90 + 200;
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #121416; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <!-- Background grid -->
    <rect width="${width}" height="${height}" fill="#121416" />
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-opacity="0.02" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grid)" />

    <!-- Top Border Line -->
    <line x1="40" y1="40" x2="${width - 40}" y2="40" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>

    <!-- Header -->
    <text x="40" y="80" fill="#ffffff" font-size="24" font-weight="700" letter-spacing="-0.5">${paletteName.toUpperCase()}</text>
    <text x="40" y="105" fill="#a9a7a1" font-size="12" font-weight="500" letter-spacing="1">CRAN3O COLOR STUDIO</text>
    
    <text x="${width - 40}" y="80" text-anchor="end" fill="#70808a" font-size="12" font-weight="600">${dateStr.toUpperCase()}</text>
    <text x="${width - 40}" y="105" text-anchor="end" fill="#ffffff" fill-opacity="0.6" font-size="12" font-weight="500" letter-spacing="0.5">MODE: ${modeName.toUpperCase()}</text>

    <!-- Header divider -->
    <line x1="40" y1="130" x2="${width - 40}" y2="130" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
  `;

  // Draw colors
  colors.forEach((color, index) => {
    const y = 160 + index * 90;
    const lValue = Math.round(color.oklch.l * 100) / 100;
    const cValue = Math.round(color.oklch.c * 100) / 100;
    const hValue = Math.round(color.oklch.h);
    
    svgContent += `
      <!-- Swatch -->
      <rect x="40" y="${y}" width="100" height="70" rx="3" fill="${color.hex}" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
      
      <!-- Label Details -->
      <text x="160" y="${y + 25}" fill="#ffffff" font-size="16" font-weight="600">${color.displayName}</text>
      <text x="160" y="${y + 48}" fill="#a9a7a1" font-size="12" font-weight="500" letter-spacing="0.5">${color.role.toUpperCase()}</text>
      <text x="160" y="${y + 63}" fill="#70808a" font-size="11" font-weight="500">${color.temperature.toUpperCase()} TONE</text>

      <!-- Technical values -->
      <text x="320" y="${y + 25}" fill="#ffffff" fill-opacity="0.8" font-size="12" font-family="monospace">HEX: ${color.hex.toUpperCase()}</text>
      <text x="320" y="${y + 48}" fill="#a9a7a1" font-size="11" font-family="monospace">RGB: ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}</text>

      <text x="500" y="${y + 25}" fill="#ffffff" fill-opacity="0.8" font-size="12" font-family="monospace">HSL: ${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%</text>
      <text x="500" y="${y + 48}" fill="#a9a7a1" font-size="11" font-family="monospace">OKLCH: ${lValue}, ${cValue}, ${hValue}°</text>
      
      <!-- Swatch indicator line -->
      <line x1="40" y1="${y + 80}" x2="${width - 40}" y2="${y + 80}" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    `;
  });

  // Footer
  const footerY = height - 40;
  svgContent += `
    <line x1="40" y1="${footerY - 20}" x2="${width - 40}" y2="${footerY - 20}" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
    <text x="40" y="${footerY}" fill="#70808a" font-size="10" font-weight="500">PRECISION SPACE OKLCH • GENERATED VIA CULORI ENGINE</text>
    <text x="${width - 40}" y="${footerY}" text-anchor="end" fill="#70808a" font-size="10" font-weight="500">RAMS-MEAD RETRO FUTURIST SYSTEM</text>
  </svg>`;

  return svgContent;
}
