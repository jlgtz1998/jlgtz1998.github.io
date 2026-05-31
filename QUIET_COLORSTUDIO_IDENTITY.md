# Quiet Future Color Studio - Design System & Visual Identity

This document compiles the comprehensive visual identity, typographic rules, color tokens, and interactive behaviors that define the **Quiet Future Color Studio** application. Use this as a reference for extending the application or building sister applications within the same ecosystem.

## 1. Core Design Philosophy

*   **Quiet Future / Retrofuturism**: A sophisticated, calm, and luminous take on sci-fi aesthetics. Inspired subtly by "Nothing" industrial design, avoiding obvious cliches (like aggressive neon or invasive red accents) in favor of high-contrast neutral tones.
*   **Dieter Rams Functionalism**: "Less, but better." Layouts must remain clean, sparse, and extremely well-spaced. Form follows function; remove any dashboard clutter.
*   **Technical Blueprint Aesthetic**: UI elements should feel precise, measured, and highly intentional.
*   **Cinematic Transitions**: Use slow, calculated animations for theme toggling and major state changes (using `cubic-bezier(0.2, 0.7, 0.2, 1)`).

## 2. Typography

The typographic stack relies on precise, geometric, and technical fonts available via Google Fonts.

*   **Primary Headings & Logos**: `Orbitron` (Weights: 500, 600, 700, 900)
    *   *Usage*: Major titles, application branding. Injects a retro-futuristic, sci-fi feel while remaining perfectly legible.
*   **Body & UI Controls**: `Space Grotesk` (Weights: 400, 500, 600, 700)
    *   *Usage*: Primary font for cards, buttons, lists, and settings. Technical, geometric, and highly readable.
*   **Data & Metrics**: `Space Mono` (Weights: 400, 700)
    *   *Usage*: Hexadecimal codes, mathematical readouts, slider values.

### Typographic Rules:
*   **Casing**: Labels, buttons, column headers, and sub-headers use **UPPERCASE** to maintain a structured, blueprint-like aesthetic.
*   **Hierarchy**: Use font-weight and color muting (`text-primary` vs. `text-muted`) to establish visual hierarchy, rather than drastically changing font sizes.
*   **Base Size**: Base font size is kept small (`13px`) to ensure the interface feels precise and instrument-like.

## 3. Color Tokens & Theme System

The application uses a dual-mode system. Both modes must feel premium, complete, and highly considered. The active states prefer neutral, high-contrast charcoal and white, explicitly avoiding red accents.

### Light Mode (Chalk, Cool Greys, High Contrast)
*   `--bg-app`: `#f4f5f6` (Application background)
*   `--bg-panel`: `#ffffff` (Primary panel surface)
*   `--bg-panel-deep`: `#f9fafb` (Secondary grouped surface)
*   `--text-primary`: `#111827` (Main readable text)
*   `--text-secondary`: `#4b5563` (Supporting text)
*   `--text-muted`: `#9ca3af` (De-emphasized labels)
*   `--border-light`: `rgba(0, 0, 0, 0.05)`
*   `--button-dark`: `#111827` (Primary interactive state)

### Dark Mode (Premium Charcoal & Slate)
*   `--bg-app`: `#0c0f12` (Application background)
*   `--bg-panel`: `#13171a` (Primary panel surface)
*   `--bg-panel-deep`: `#1a1f24` (Secondary grouped surface)
*   `--text-primary`: `#f9fafb` (Main readable text)
*   `--text-secondary`: `#9ca3af` (Supporting text)
*   `--text-muted`: `#4b5563` (De-emphasized labels)
*   `--border-light`: `rgba(255, 255, 255, 0.04)`
*   `--button-dark`: `#f9fafb` (Primary interactive state)

## 4. UI Components & Interactions

### Swatches & Cards
*   **Card Structure**: Clean, minimal borders. Cards have a fixed layout (e.g., 190px height) where the color swatch takes precedence.
*   **Lock Indicator**: Embedded *inside* the color fill area in the bottom-left corner. It remains hidden by default, reveals as a translucent icon on hover, and stays visible at high opacity when locked.
*   **Color Naming**: Names are constrained to two lines. If a name wraps, it pushes downwards without distorting or shrinking the size of the color swatch above it.
*   **Interactions**: Use native drag-and-drop instead of manual reordering arrows. Provide a dedicated, subtle copy icon immediately next to HEX codes. Delete functions (`x`) appear only on hover.

### Controls, Sliders & Inputs
*   **Sliders**: Track is a minimalist line (`2px` height) with small, precise rectangular thumbs (`6x14px`). Avoid lines that intersect or clutter the surrounding text.
*   **Role Selectors**: Subtle dropdowns positioned below the color names. They feature thin, custom SVG arrows, extremely muted small text, and uppercase formatting to stay out of the way.
*   **Buttons**: Solid or transparent with 1px borders. Active buttons invert their colors (e.g., dark background with light text) rather than using a bright accent color.

### Iconography
*   **Style**: Google Material Symbols (Rounded/Outlined).
*   **Implementation**: Functional and sparse. Icons (lock, plus, x, undo, redo, copy) should scale perfectly to match their surrounding text metrics.

## 5. Algorithmic Color Guidelines (Color Engine)

*   **Color Space**: All generative algorithms, harmonies, and variations MUST operate strictly in the **OKLCH** color space. Avoid raw HEX or HSL math for generation.
*   **Chroma Cap**: For sophisticated palettes, do not generate high-saturation colors natively. Default harmonies limit chroma to a cap of `0.08` to `0.10` in OKLCH, scaling up slightly only for active accent colors.
*   **Accessibility First**: Every interactive color combination must show WCAG 2.1 and APCA Lc ratios. Target reading text to achieve $|Lc| \ge 75$. Positive scores mean Dark-on-Light text; negative scores mean Light-on-Dark text.
