import { ColorData } from '../../types';

const pdfTranslations = {
  en: {
    swatchCatalog: 'SWATCH CATALOG',
    date: 'DATE',
    mode: 'MODE',
    swatches: 'Swatches',
    contrastMatrix: 'Contrast & Readability Matrix',
    colorName: 'Color Name',
    role: 'ROLE',
    tone: 'TONE',
    wcagNote: '* WCAG Contrast Ratio (target &ge; 4.5:1 for body text, &ge; 3.0:1 for large text).',
    apcaNote: '* APCA Lc score (target absolute score &ge; 75 for body reading, &ge; 45 for headers/buttons). Positive score represents Dark on Light text; negative represents Light on Dark text.',
    footerLeft: 'PRECISION SPACE OKLCH • GENERATED WITH CULORI ENGINE',
    footerRight: 'OKLCH CHROMATIC CONTROL SYSTEM',
    warm: 'WARM',
    cool: 'COOL',
    neutral: 'NEUTRAL',
  },
  es: {
    swatchCatalog: 'CATÁLOGO DE MUESTRAS',
    date: 'FECHA',
    mode: 'MODO',
    swatches: 'Muestras',
    contrastMatrix: 'Matriz de Contraste y Legibilidad',
    colorName: 'Nombre del Color',
    role: 'ROL',
    tone: 'TONO',
    wcagNote: '* Relación de contraste WCAG (objetivo &ge; 4.5:1 para texto de cuerpo, &ge; 3.0:1 para texto grande).',
    apcaNote: '* Puntuación APCA Lc (objetivo de puntuación absoluta &ge; 75 para lectura de cuerpo, &ge; 45 para encabezados/botones). Una puntuación positiva representa texto oscuro sobre fondo claro; una puntuación negativa representa texto claro sobre fondo oscuro.',
    footerLeft: 'OKLCH DE PRECISIÓN ESPACIAL • GENERADO CON MOTOR CULORI',
    footerRight: 'SISTEMA DE CONTROL CROMÁTICO OKLCH',
    warm: 'CÁLIDO',
    cool: 'FRÍO',
    neutral: 'NEUTRO',
  }
};

export function printPaletteCatalog(colors: ColorData[], paletteName: string, modeName: string, lang: 'en' | 'es' = 'en'): void {
  // Create a printable container
  const printContainer = document.createElement('div');
  printContainer.id = 'studio-print-catalog';
  
  const dateStr = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const t = pdfTranslations[lang];

  // Generate contrast table for printing
  let contrastRows = '';
  colors.forEach((c1) => {
    contrastRows += `<tr><td style="font-weight: 600; padding: 6px; font-size: 10px; border: 1px solid #eee;">${c1.displayName}</td>`;
    colors.forEach((c2) => {
      if (c1.id === c2.id) {
        contrastRows += `<td style="text-align: center; color: #aaa; background: #fafafa; font-size: 10px; border: 1px solid #eee;">-</td>`;
      } else {
        // Calculate WCAG contrast on the fly for the print table
        const l1 = getWcagLuminance(c1.rgb);
        const l2 = getWcagLuminance(c2.rgb);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const wRatio = Math.round(ratio * 10) / 10;
        
        // APCA contrast
        const apca = getApcaContrast(c1.rgb, c2.rgb);
        
        contrastRows += `
          <td style="text-align: center; padding: 6px; font-size: 10px; border: 1px solid #eee;">
            <div style="font-weight: bold;">${wRatio}:1</div>
            <div style="color: #666;">Lc ${apca}</div>
          </td>
        `;
      }
    });
    contrastRows += '</tr>';
  });

  const swatchesHtml = colors.map(color => {
    const oklchStr = `${Math.round(color.oklch.l * 100) / 100}, ${Math.round(color.oklch.c * 100) / 100}, ${Math.round(color.oklch.h)}°`;
    
    // Translate temperature
    const tempText = color.temperature === 'warm' ? t.warm :
                     color.temperature === 'cool' ? t.cool : t.neutral;

    return `
      <div style="display: flex; align-items: center; border-bottom: 1px solid #e5e5e5; padding: 12px 0; page-break-inside: avoid;">
        <div style="width: 80px; height: 60px; margin-right: 20px; flex-shrink: 0;">
          <svg width="80" height="60" style="border: 1px solid #ddd; border-radius: 2px; display: block;">
            <rect width="80" height="60" fill="${color.hex}" />
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 15px; font-weight: 700; color: #111;">${color.displayName}</div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">${t.role}: ${color.role.toUpperCase()} | ${t.tone}: ${tempText}</div>
        </div>
        <div style="width: 140px; font-family: monospace; font-size: 11px; color: #333; line-height: 1.4;">
          <strong>HEX:</strong> ${color.hex.toUpperCase()}<br/>
          <strong>RGB:</strong> ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}
        </div>
        <div style="width: 160px; font-family: monospace; font-size: 11px; color: #333; line-height: 1.4;">
          <strong>HSL:</strong> ${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%<br/>
          <strong>OKLCH:</strong> ${oklchStr}
        </div>
      </div>
    `;
  }).join('');

  printContainer.innerHTML = `
    <style>
      @media print {
        html, body, #__next, .studio-shell, main {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          display: block !important;
          position: static !important;
          background: #fff !important;
          color: #111 !important;
        }
        body > *:not(#studio-print-catalog) {
          display: none !important;
        }
        #studio-print-catalog, #studio-print-catalog * {
          visibility: visible !important;
        }
        #studio-print-catalog {
          display: block !important;
          position: relative !important;
          left: 0;
          top: 0;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #111;
          background: #fff;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      
      #studio-print-catalog {
        display: none;
      }
      
      @media print {
        #studio-print-catalog {
          display: block !important;
        }
      }
    </style>
    
    <div style="border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; color: #111;">${paletteName}</h1>
        <p style="font-size: 11px; color: #666; margin: 4px 0 0 0; letter-spacing: 1px; font-weight: 600;">CRAN3O COLOR STUDIO • ${t.swatchCatalog}</p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; font-weight: 700; color: #111;">${t.date}: ${dateStr.toUpperCase()}</div>
        <div style="font-size: 11px; color: #666; margin-top: 2px;">${t.mode}: ${modeName.toUpperCase()}</div>
      </div>
    </div>
    
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 12px; font-weight: 700; color: #666; border-bottom: 1px solid #111; padding-bottom: 4px; text-transform: uppercase; margin-bottom: 10px;">${t.swatches}</h2>
      ${swatchesHtml}
    </div>
    
    <div style="page-break-inside: avoid; margin-top: 30px;">
      <h2 style="font-size: 12px; font-weight: 700; color: #666; border-bottom: 1px solid #111; padding-bottom: 4px; text-transform: uppercase; margin-bottom: 15px;">${t.contrastMatrix}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="border-bottom: 1px solid #ddd; background-color: #f9f9f9; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
            <th style="text-align: left; padding: 8px; font-size: 11px; border: 1px solid #eee;">${t.colorName}</th>
            ${colors.map(c => `<th style="padding: 8px; font-size: 10px; text-align: center; width: 80px; border: 1px solid #eee;">${c.displayName.split(' ')[0]}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${contrastRows}
        </tbody>
      </table>
      <p style="font-size: 9px; color: #666; margin-top: 10px; line-height: 1.4;">
        ${t.wcagNote}<br/>
        ${t.apcaNote}
      </p>
    </div>
    
    <div style="position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #ddd; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #999;">
      <div>${t.footerLeft}</div>
      <div>${t.footerRight}</div>
    </div>
  `;

  // Helper functions replicated locally to prevent external dependencies in this printable window context
  function getWcagLuminance(rgb: {r: number, g: number, b: number}): number {
    const a = [rgb.r, rgb.g, rgb.b].map(v => {
      const val = v / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getApcaContrast(textRgb: {r: number, g: number, b: number}, bgRgb: {r: number, g: number, b: number}): number {
    const getL = (color: {r: number, g: number, b: number}) => {
      const trc = 2.4;
      const r = Math.pow(color.r / 255.0, trc);
      const g = Math.pow(color.g / 255.0, trc);
      const b = Math.pow(color.b / 255.0, trc);
      let y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
      if (y < 0.022) {
        y += Math.pow(0.022 - y, 1.414);
      }
      return y;
    };
    const Yt = getL(textRgb);
    const Yb = getL(bgRgb);
    if (Yb > Yt) {
      return Math.round((Math.pow(Yb, 0.56) - Math.pow(Yt, 0.62)) * 114);
    } else {
      return Math.round((Math.pow(Yb, 0.65) - Math.pow(Yt, 0.55)) * 114);
    }
  }

  // Append container, print, and remove
  document.body.appendChild(printContainer);
  window.print();
  document.body.removeChild(printContainer);
}
