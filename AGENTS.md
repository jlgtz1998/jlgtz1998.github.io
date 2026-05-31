# Coding Guidelines for AI Agents

Welcome to **Quiet Future Color Studio**. If you are an AI coding assistant working on this codebase, you MUST adhere strictly to the following architectural guidelines, design aesthetics, and mathematical rules.

## 1. Design & Aesthetic Guidelines

*   **Dieter Rams Functionalism**: Keep layouts clean, sparse, and extremely well-spaced. Do not add clutter or SaaS dashboards indicators.
*   **Quiet Future Atmosphere**: Avoid neon cyberpunk aesthetics. Favor sophisticated, calm, and luminous tones (curated plaster whites, travertine, slate green, soot gray).
*   **Light & Dark Themes**: Both modes must feel premium and complete. The transition must be slow and cinematic (`transition: var(--transition-slow)`).
*   **Accessibility First**: Every interactive color combination must show WCAG 2.1 and APCA Lc ratios. Never rely solely on color to communicate state.

## 2. Color Science & Mathematical Rules

*   **Work in OKLCH**: The generative algorithms, harmonies, and variations MUST operate inside the OKLCH color space. Avoid raw HEX or HSL math.
*   **Culori for Conversions**: Always use the wrappers in [color-spaces.ts](file:///e:/NOSTROMO/01_PROJECTS%20Desarrollo%20Activo/15_QUIET_COLORSTUDIO/lib/color-spaces.ts) for converting between HEX, HSL, RGB, and OKLCH.
*   **Chroma Cap**: For sophisticated palettes, do not generate high-saturation colors. Default default harmonies to a chroma cap of `0.08` to `0.10` in OKLCH, scaling up slightly for active accent colors.
*   **APCA Lc Range**: Positive scores represent Dark-on-Light text; negative scores represent Light-on-Dark text. Ensure reading text achieves $|Lc| \ge 75$.

## 3. Architecture & File Structure

*   **app/**: Contains pages and global styling variables. We use Next.js App Router.
*   **components/**: Core React components (ColorWheel, MockupViewer, IdentityPanel). Keep them modular and typed.
*   **lib/**: Low-level utility engines. Keep UI out of color engines.
    *   [color-spaces.ts](file:///e:/NOSTROMO/01_PROJECTS%20Desarrollo%20Activo/15_QUIET_COLORSTUDIO/lib/color-spaces.ts) (Culori conversions)
    *   [harmony.ts](file:///e:/NOSTROMO/01_PROJECTS%20Desarrollo%20Activo/15_QUIET_COLORSTUDIO/lib/harmony.ts) (11 harmony equations)
    *   [variation.ts](file:///e:/NOSTROMO/01_PROJECTS%20Desarrollo%20Activo/15_QUIET_COLORSTUDIO/lib/variation.ts) (mutations, sliders, locks)
    *   [accessibility.ts](file:///e:/NOSTROMO/01_PROJECTS%20Desarrollo%20Activo/15_QUIET_COLORSTUDIO/lib/accessibility.ts) (APCA, WCAG 2.1)
    *   [naming.ts](file:///e:/NOSTROMO/01_PROJECTS%20Desarrollo%20Activo/15_QUIET_COLORSTUDIO/lib/naming.ts) (premium name generators)
*   **data/**: Configuration matrices and default presets.
*   **scripts/**: Developer utility and testing scripts.

## 4. Maintenance & Testing

*   Always run `npm test` after modifying the color engine.
*   Ensure mockups in `MockupViewer.tsx` map colors to logical zones (e.g. `bg`, `surface`, `accent1`, `accent2`, `details`) to preserve contrast when palettes change.
