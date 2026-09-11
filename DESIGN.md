# Night-Watch Console — DESIGN.md

> SOC console for analysts triaging breaches. Dark-only, data-dense, keyboard-first.
> Fused from Linear's marketing-surface discipline (canvas ladder, hairlines,
> lavender scarcity, tight tracking) + Sentry's data-dense dashboard pragmatism,
> audited against Vercel Web Interface Guidelines. This file is the visual source
> of truth — implement to it, don't drift from it.

## 1. Visual Theme & Atmosphere

Near-black console, faint blue tint. Hierarchy comes from surface lift +
1px hairlines, never drop shadows. One chromatic accent (lavender) reserved
for brand mark, primary CTA, focus ring, and link emphasis. Severity hues are
*data ink*, not chrome — they appear only where severity is the information
(pills, bars, dots). Everything else is monochrome. Dense but calm: cockpit
density, gallery discipline. No gradients, no glass, no glow, no noise overlays.

## 2. Color Palette & Roles

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#010102` | App background. Never pure `#000000`. |
| `surface-1` | `#0f1011` | Panels, cards, drawers, raised header. |
| `surface-2` | `#141516` | Hover fills, inset wells, selected tabs. |
| `surface-3` | `#18191a` | Deepest wells (table heads, code blocks). |
| `hairline` | `#23252a` | Default 1px borders, dividers. |
| `hairline-strong` | `#34343a` | Emphasized borders, input focus edge. |
| `ink` | `#f7f8f8` | Headlines, primary data. |
| `ink-muted` | `#d0d6e0` | Secondary text. |
| `ink-subtle` | `#8a8f98` | Tertiary text, placeholders, captions. |
| `ink-faint` | `#62666d` | Disabled, footnotes, footer. |
| `primary` | `#5e6ad2` | THE accent: brand mark, primary CTA, focus ring, links. Nothing else. |
| `primary-hover` | `#828fff` | Primary CTA hover only. |
| `sev-critical` | `#f2555a` | Critical severity data only. |
| `sev-high` | `#ff9f43` | High severity data only. |
| `sev-medium` | `#e3b008` | Medium severity data only. Deliberately gold, never amber — amber belongs to no token. |
| `sev-low` | `#3ddc97` | Low severity / healthy states. |

Rules: one accent per surface — a lavender CTA never sits inside a severity-tinted panel. Warm/cool mixing is banned; all grays are blue-tinted. Saturation of chrome stays near zero; saturation lives only in severity data.

## 3. Typography Rules

Families: **Inter** (UI; documented Linear substitute — tight tracking carries the voice, not the foundry) + **JetBrains Mono** (data: hashes, IPs, timestamps, counts, IDs).

| Token | Size / Weight / Leading / Tracking | Use |
|---|---|---|
| `display` | 20px / 600 / 1.2 / -0.6px | Page titles. One per view. |
| `title-sm` | 13px / 600 / 1.3 / 0 | Panel headers. |
| `body` | 13px / 400 / 1.5 / -0.05px | Default UI text. |
| `body-sm` | 12.5px / 400 / 1.5 / 0 | Table cells, secondary. |
| `micro` | 11px / 600 / 1.3 / +0.08em | Labels, eyebrows, table heads. Uppercase. |
| `mono` | 12.5px / 400 / 1.5 / 0 | All data tokens. `tabular-nums` always. |
| `button` | 13px / 600 / 1.2 / 0 | Every button label. Max 3 words for primaries. |

Rules: headlines `text-wrap: balance`. Display never exceeds 20px in-console (this is a tool, not marketing). Eyebrows are rationed — at most one per view, never stacked above every panel. Sentence case everywhere except micro labels. `…` not `...`. Active voice, second person, numerals for counts. Errors name the fix, not just the fault.

## 4. Component Stylings

- **Buttons**: 8px radius, `13px/600` label, padding `8px 14px`. Primary: lavender fill, white text, hover lightens. Secondary: surface-1 + hairline. Danger: transparent + critical border + critical text. Ghost: text-only. Pressed state: `scale-[0.98]`. Disabled: 50% opacity. Labels fit one line.
- **Inputs**: surface-3 fill, hairline border, 8px radius, `13px` text. Focus: hairline-strong edge + lavender ring. Labels above, hints below, errors inline below with field focus on submit. Search fields carry `aria-label`, never placeholder-only.
- **Tables**: header row surface-3, 11px micro caps, hairline bottom rule. Rows 1px `hairline/70` dividers, hover `white/[0.02]`. No outer glow. Rows that open detail are keyboard-operable (`tabIndex`, Enter/Space, `role="button"`, label).
- **Pills**: severity = tinted bg + tinted text + tinted border, 11px caps. Neutral = surface-2 + muted. Pill radius only for pills/tabs/status — never cards or buttons.
- **Tabs**: plain text tabs; selected = surface-2 fill + hairline border. No underline indicators.
- **Panels**: surface-1 + hairline, 12px radius. No shadows on dark. Filter toolbars are open rows, not panels — boxing is earned, not default.
- **Drawers**: right-anchored, surface-1, full height, no outer rounding, `overscroll-contain`, Escape closes, labelled dialog.
- **Pagination**: Prev/Next + `n / m` mono counter. Hidden entirely when one page — never render disabled dead controls.
- **Toasts**: bottom-right, bordered, `aria-live="polite"`.
- **Skeletons**: block pulses matching row shape. No spinners for content.
- **Empty states**: composed inset well — title, one-line hint, one action. Never blank panels.
- **Confirm**: destructive actions arm in place (“Delete” → “Confirm?” for 4s), never `window.confirm`, never immediate.
- **Nav rail**: 232px, grouped, 2px lavender active bar + `white/[0.06]` wash. Icons 18px, stroke 1.5, `aria-hidden`. One family only (Heroicons).
- **Topbar**: 56px, breadcrumbs, global search (`⌘K`), UTC clock, LIVE/RETRY channel pill, alerts bell with count, role badge.
- **Brand mark**: solid lavender rounded square with inner ring (pure CSS, geometric — no drawn paths), wordmark tracked +0.14em.

## 5. Layout Principles

4px base unit. Console max width 1440px, 24px gutters. Views: header band → toolbar row → content grid. KPI stats are neutral cards (label + tabular numeral + hint) — no color bars; color means severity or nothing. Grids over flex math. `min-w-0` on every flex text child. `min-h-[100dvh]` for auth split, never `h-screen`. Mobile: single column under 768px, rail becomes drawer, tables scroll-x in wells.

## 6. Depth & Elevation

Surface ladder + hairlines only. Level 0: canvas text. Level 1: surface-1 + hairline (cards, drawers). Level 2: surface-2 + hairline-strong (selected, wells). Level 3: focus ring, 2px lavender at 50%. No drop shadows anywhere on dark. Top edge hairline highlight on lifted panels allowed once per surface.

## 7. Do's and Don'ts

Do: tabular numerals for every number; truncate with `max-w` + `truncate`; `title` attributes on truncated cells; skip-link to `#nw-main`; one `h1` per view; `aria-label` on every icon-only control; `aria-hidden` on decorative icons; `touch-action: manipulation`; `⌘K` search; shareable URLs (filters + page in query params).
Don't: gradients, glass, glow, noise, emojis, purple/blue decorative washes, pill buttons, centered hero anything (this is a console), eyebrows on every panel, native `confirm()`, disabled pagination on single pages, placeholder-only inputs, `transition-all`, `outline-none` without ring, `div onClick` without keyboard path, hardcoded date formats (use `Intl`), amber anywhere.

## 8. Responsive Behavior

Rail → drawer under 1024px (hamburger in topbar). KPI grids 4→2→1. Tables keep columns, scroll inside wells. Drawers go full-width under 640px. Touch targets ≥40px for CTAs, ≥44px inputs on touch. `env(safe-area-inset-*)` on topbar/footer. No `user-scalable=no` ever.

## 9. Agent Prompt Guide

Quick reference: canvas `#010102` · surfaces `#0f1011/#141516/#18191a` · hairlines `#23252a/#34343a` · ink `#f7f8f8/#d0d6e0/#8a8f98/#62666d` · accent `#5e6ad2` (hover `#828fff`) · severity `#f2555a/#ff9f43/#e3b008/#3ddc97` · radius `8 buttons+inputs / 12 panels / pill tabs+status` · type Inter tight + JetBrains Mono tabular.
Build prompt: "Rebuild this view to Night-Watch DESIGN.md: Linear ladder surfaces, lavender locked to brand/CTA/focus/links, severity hues as data ink only, 8/12 radius scale, Inter -0.6px titles + mono tabular data, open toolbars, keyboard-operable rows, URL-synced filters, hidden single-page pagination."
