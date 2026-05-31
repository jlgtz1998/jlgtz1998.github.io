# CRAN3O Color Studio

CRAN3O Color Studio is a professional, high-fidelity web utility built for generating, varying, visualizing, and exporting premium color palettes. Designed specifically for architectural systems, CMF industrial design, and graphic design, the application implements state-of-the-art color space transformations using OKLCH and monitors accessibility parameters via APCA and WCAG 2.1.

## 🚀 Features

*   **Generative OKLCH Engine**: All mutations and harmony equations operate inside the perceptual, uniform OKLCH space.
*   **11 Harmonic Formulas**: Supports Monochromatic, Analogous, Complementary, Split-Complementary, Triadic, Tetradic, Achromatic, Warm-Cool Balance, Material Palette, Cinematic Noir, and Muted Futurist.
*   **CMF Variation Sliders**: Precise retro-futuristic controls over Contrast, Luminosity, Temperature, Muting, Cinematic Fog, Material Feel, Warm Accent Amplitude, and Understated/Visible Futurism.
*   **Mode Profiles**: Toggle between Architecture, Industrial (CMF), and Graphic Design modes to automatically adjust algorithm weights, recommended presets, and mockups.
*   **Interactive OKLCH Wheel**: High-precision custom Canvas-rendered color wheel reflecting active lightness slices.
*   **Accessibility Matrix**: Real-time checking of WCAG 2.1 contrast ratios and APCA Lc scores in parallel, plus a built-in Daltonism simulator.
*   **Premium Exporters**: Export design swatches to SVG, Retina PNG, PDF specification sheet, CSS Variables, Raw JSON, or copy a simple hex list.
*   **My Color Identity**: Tune generative model parameters to align with your personal creative signature.

## 🛠️ Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Runtime/State**: React 19, TypeScript
*   **Color Processing**: [Culori](https://github.com/d3/d3-color)
*   **Styling**: Pure, clean Vanilla CSS variables with custom dark and light themes.

## 📂 File Structure

```bash
├── app/
│   ├── globals.css      # Core design system stylesheet
│   ├── layout.tsx       # Metadata and root body wrappers
│   └── page.tsx         # Dashboard layout, state controllers, and matrix
├── components/
│   ├── ColorWheel.tsx   # Canvas-based OKLCH radial selector
│   ├── IdentityPanel.tsx# User profile sliders
│   └── MockupViewer.tsx # Custom vector SVG mockups (Speaker, Chair, Poster, etc.)
├── data/
│   ├── influences.ts    # Mode profiles and recommended variables
│   └── presets.ts       # Seeds inspired by Dieter Rams, Syd Mead, etc.
├── lib/
│   ├── accessibility.ts # APCA & WCAG contrast verification
│   ├── color-spaces.ts  # Culori OKLCH converters
│   ├── harmony.ts       # Mathematical equations for the 11 harmonies
│   ├── naming.ts        # Premium commercial name generators
│   ├── variation.ts     # CMF sliders and lock mutations
│   └── exporters/
│       ├── pdf-exporter.ts # PDF specification sheet catalog layout
│       └── svg-exporter.ts # Vector layout swatch sheet generator
├── scripts/
│   └── test-color-engine.ts # TypeScript test suite
├── AGENTS.md            # Guidelines for AI coding agents
└── package.json
```

## ⚙️ Running Locally

First, install the dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## 🧪 Testing

We have built a dedicated test suite verifying the color engine, contrast ratios, and lock mechanics. Run the tests using:
```bash
npm test
```

## Static Web Release

This project is configured for a static export with Next.js. A production build creates the public web files in `out/`, so the app can run on free static hosting without a backend server.

```bash
npm run build
```

Version control uses Git. The included GitHub Actions workflow publishes the static export to GitHub Pages on every push to `master`.
