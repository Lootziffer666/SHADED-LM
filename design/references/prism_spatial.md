---
name: Prism Spatial
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#424656'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#a33200'
  on-tertiary: '#ffffff'
  tertiary-container: '#cc4204'
  on-tertiary-container: '#fff6f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832600'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  label-xs:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a focused, lightweight, and structured environment engineered for real-time 3D asset workflows, model auditing, and spatial library curation on Android devices (optimized for tall 9:21 screen geometries). The design ethos balances technical precision with tactile friendliness—avoiding utilitarian clutter without descending into decorative playfulness.

### Aesthetic Foundation
- **Visual Style:** Modern Soft Minimalist with structural organization. Natural physical affordances are communicated through pristine elevated white planes over muted ambient backgrounds, precise 1-pixel architectural borders, and generous tap zones balanced by dense tabular telemetry.
- **Atmosphere:** Airy, systematic, daylight-bright, and clean. Spatial assets, geometry previews, and texture maps retain full optical clarity without competing against dark or neon chrome.
- **Core Philosophy:** Progressive disclosure over density overload. Detailed polygon budgets, LOD switchboards, and material slots remain hidden behind fluid sheets, tap-to-expand badges, and context drawers until explicitly summoned.

## Colors

The palette leverages a high-key, luminous daylight foundation accented by a clean cobalt blue for primary interactive affordances and a deep marine teal for telemetry, mesh data, and spatial tags.

### Functional Roles
- **Canvas Base (`#F1F3F5` to `#F8F9FA`):** Ambient background providing deep contrast separation against active content without creating eye strain.
- **Surfaces (`#FFFFFF`):** Pure white applied strictly to cards, modal sheets, contextual chips, and interactive cards to denote lift and physical readiness.
- **Primary Cobalt (`#0066FF`):** Action drivers, primary CTAs, active viewport controls, camera pivot indicators, and key selections.
- **Secondary Teal (`#0D9488`):** Informational state, mesh optimization flags, polygon budget meters, and asset taxonomy tags.
- **Neutral Primary Slate (`#1E293B`):** Warm charcoal applied to high-priority headers, numeric values, and primary glyphs.
- **Neutral Muted Slate (`#64748B`):** Metadata, subheadings, unit notations (KB, MB, tris), and inactive vector icons.
- **Hairline Dividers (`#E2E8F0`):** Precise bounding lines separating telemetry panels and viewport view modes.

## Typography

The typographic hierarchy pairs the structured, geometric precision of **Space Grotesk** for headings, numeric asset metadata, and labels with the balanced, humanist legibility of **Manrope** for descriptions, long-form parameters, and dense list annotations.

### Hierarchy & Scaling
- Headings use tight line-heights and moderate tracking to prevent line breaks on narrow 9:21 mobile viewports.
- Labels utilize tabular numerical alignment wherever polygon counts, vertex densities, file sizes, or transformation coordinates (X, Y, Z) appear.
- All body scales are bounded by 1.4–1.5 line heights to ensure rapid scanning during vertical gestures.

## Layout & Spacing

Designed specifically for single-thumb ergonomics and tall 9:21 screen ratios.

### Grid & Ergonomics
- **Grid Layout:** 4-column fluid mobile grid with 12px gutters and 16px lateral outer canvas margins.
- **Vertical Rhythm:** Built on an 8px base grid with a 4px sub-grid for tight metric displays, coordinate readouts, and badge nesting.
- **Viewport Thumb-Zone:** Interactive actions, filter triggers, and asset actions anchor to the bottom 40% of the screen. Viewports, render canvases, and orbit cameras occupy the top 60% with full edge-to-edge bleed.

## Elevation & Depth

Visual hierarchy uses ultra-soft ambient occlusion shadows paired with crisp 1px neutral borders (`#E2E8F0`), creating high-definition elevation without visual weight.

### Surface Tiers
- **Tier 0 (Canvas Base):** Flat `#F8F9FA` base surface for system background and asset shelf scrollers.
- **Tier 1 (Resting Cards & Preview Containers):** Pure `#FFFFFF` surface with a subtle border and diffuse ambient shadow (`box-shadow: 0 2px 8px rgba(30, 41, 59, 0.04), 0 1px 2px rgba(30, 41, 59, 0.02)`).
- **Tier 2 (Floating Action Trays & Active Filters):** Pure `#FFFFFF` surface lifted off canvas (`box-shadow: 0 8px 24px rgba(30, 41, 59, 0.07), 0 2px 6px rgba(30, 41, 59, 0.03)`).
- **Tier 3 (Bottom Inspection Drawers & Transform Overlays):** `#FFFFFF` modal sheets elevated with focused drop shadows (`box-shadow: 0 -4px 32px rgba(30, 41, 59, 0.10)`).

## Shapes

The interface implements a unified **14px corner radius** standard across interactive surfaces, container components, and asset thumbnail masks.

- **Cards & Viewport Panels:** Standardized to 14px for a welcoming yet modular structural silhouette.
- **Buttons & Input Fields:** Standardized to 12px–14px to retain cohesive nesting inside parent cards.
- **Pills & Status Tags:** Retain fully-rounded pill forms (9999px) to clearly differentiate operational metadata from interactive containers.

## Components

### Buttons
- **Primary:** Solid `#0066FF` surface, `#FFFFFF` text, 14px border radius, 48px standard touch height, `Space Grotesk` 14px SemiBold text.
- **Secondary / Ghost:** Pure white `#FFFFFF` surface with a 1px `#E2E8F0` border, `#1E293B` text, shifting to a `#F1F3F5` pressed state.
- **Telemetry Action:** `#0D9488` background tinted to 10% opacity with solid `#0D9488` text for non-blocking operations (e.g., "Decimate Mesh", "Bake Textures").

### Input Fields & Transform Controls
- **Coordinate Inputs (X, Y, Z):** Compact 40px height containers grouped horizontally. Labelled with subtle color-coded axis indicators (Red, Green, Blue hairlines), displaying values in `Space Grotesk` with standard 1px `#E2E8F0` borders and 12px radii.
- **Search & Filter Bars:** Full-width 44px containers featuring `#FFFFFF` background, `#64748B` placeholder typography, and embedded right-aligned quick-tag chips.

### Chips & Badges
- **Format Badges (.GLTF, .USDZ, .FBX):** Compact 24px height, `#F1F3F5` fill, `#1E293B` text, 6px radius.
- **Metric Chips (Tri Count / File Size):** 24px height, soft teal tint (`rgba(13, 148, 136, 0.08)`), `#0D9488` text, pill shape.

### Cards & 3D Asset Tiles
- **Grid Tiles:** 14px radius, pure white background, featuring a top 1:1 aspect ratio neutral preview well (`#F8F9FA`), separated by a hairline rule from the metadata panel displaying title, polycount badge, and format indicator.
- **List Items:** 72px fixed height horizontal units, 56px square preview thumb on the left, two-line title/geometry metrics, trailing overflow trigger.

### Bottom Sheet Inspector
- Draggable modal surface anchored to bottom edges with a 24px top radius. Displays multi-tier tab selectors (Details, Hierarchy, Textures, Shaders) with sticky action bars at the bottom thumb-reach zone.
