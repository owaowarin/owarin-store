<!-- diagram-design-profile
name: OWARIN
slug: owarin
source-url: none
created: 2026-09-11
updated: 2026-09-11
notes: OWARIN house skin, dark-first. Washi/sumi/vermilion, Trirong + IBM Plex Sans Thai + IBM Plex Mono
-->
# Style Guide

**The single source of truth for colors, typography, and tokens.** Every diagram draws from this — not from hex values inlined in other reference files. If you want to change the visual skin of Diagram Design, change this file.

OWARIN skin: warm washi paper, sumi ink, a single vermilion accent, stone-grey muted. Built dark-first to match the OWARIN deck system (dark canvas, hairline rules, one focal accent per figure). Light mode is the same palette inverted for print and light-background embeds.

To generate your own from a website URL, see [`onboarding.md`](onboarding.md).

---

## Tokens

### Semantic roles

Every token is referred to by **semantic role**, not by its hex value. Type references (`type-*.md`) and SKILL.md say `accent`, not `#f7591f`.

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper` | Page background, default node fill | `#f4f1ea` (washi) | `#121110` (sumi) |
| `paper-2` | Diagram container bg, secondary fill | `#e9e4d9` | `#1c1a18` |
| `ink` | Primary text, primary stroke | `#1a1815` (sumi) | `#f4f1ea` (washi) |
| `muted` | Secondary text, default arrow stroke | `#5b554b` (stone) | `#a8a093` (ash) |
| `soft` | Sublabels, boundary labels | `#8a8377` | `#7a736a` |
| `rule` | Hairline borders | `rgba(26,24,21,0.12)` | `rgba(244,241,234,0.12)` |
| `rule-solid` | Stronger borders, baselines | `#c9c2b4` (bone) | `rgba(201,194,180,0.25)` |
| `accent` | Focal / 1–2 max per diagram | `#bf3f26` (vermilion / shu) | `#e2603f` |
| `accent-tint` | Fill for accent-bordered boxes | `rgba(191,63,38,0.08)` | `rgba(226,96,63,0.10)` |
| `link` | HTTP/API calls, external arrows | `#2f5d50` (pine) | `#6fa391` |

> **Brand palette source:** OWARIN's five-color palette — `sumi #1a1815`, `washi #f4f1ea`, `bone #c9c2b4`, `vermilion #bf3f26`, `stone #5b554b`. Vermilion (shu) is the one warm accent of the Japanese editorial register the brand sits in; it is the only saturated hue allowed in a figure. The `soft`, `rule`, and `link` tokens are derived (lighter stone, ink-at-opacity, and a desaturated pine to keep external-call arrows distinguishable from the accent).

> **Note:** The pre-baked example HTML files in `assets/` were built under an earlier skin. Regenerating them against the current `style-guide.md` is a v5.1 task. New diagrams the skill produces will use the tokens above.

### Inversion rule (light → dark)

Any `rgba(26,24,21, X)` in light becomes `rgba(244,241,234, X)` in dark. Same opacities, RGB flipped. Vermilion lifts from `#bf3f26` to `#e2603f` so it still reads as focal on sumi paper. **Dark is the default for OWARIN work** — client decks and the reporting pipeline are dark-canvas; reach for light only for print or a light-background embed.

### Series palette (multi-series chart types only)

A small set of desaturated, editorial-tone colors for chart types that genuinely need to distinguish multiple overlapping entities (currently: **radar**). The "1-focal" rule still holds — `accent` is reserved for the focal series; the palette below covers the rest.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `series-1` | `#7c8f6f` (sage) | `#9caf8f` | Non-focal series |
| `series-2` | `#5e7a9b` (dusty-blue) | `#82a0c0` | Non-focal series |
| `series-3` | `#b8915a` (mustard) | `#d3ad7a` | Non-focal series |
| `series-4` | `#9c6b50` (rust-brown) | `#b88670` | Non-focal series |
| `series-5` | `#6e6479` (slate) | `#8d8298` | Non-focal series |

Fills sit at `0.18` opacity light, `0.22` dark; strokes use the full color. **Don't backfill these tokens to non-chart types** — architecture, swimlane, etc. continue to use muted-ink variants. The series palette is opt-in for diagrams where overlapping shapes demand distinguishable color, not a license to add color elsewhere.

### Terminal skin (opt-in alternate)

A self-contained palette for the terminal-window primitive (see [primitive-terminal.md](primitive-terminal.md)) — a CLI-chrome register for dev-tool posts and technical social cards. It does not replace the default skin above and isn't affected by onboarding; it's a second, fixed skin you opt into per-diagram.

| Token | Hex | Purpose |
|---|---|---|
| `terminal-page` | `#0a0a0a` | Page background behind the window |
| `terminal-paper` | `#141414` | Window body, node fill |
| `terminal-bar` | `#1b1b1b` | Titlebar strip |
| `terminal-border` | `#2b2b2b` | Window border, hairlines |
| `terminal-ink` | `#f5f5f5` | Primary text, primary stroke (fixed terminal skin, not the OWARIN `ink`) |
| `terminal-muted` | `#9a9a9a` | Secondary text, sublabels, ring stroke |
| `terminal-soft` | `#5c5c5c` | Tertiary — inactive dots, spokes |
| `terminal-accent` | `#ff5a36` | The one accent — focal station, prompt sign, active dot |
| `terminal-accent-tint` | `rgba(255,90,54,0.12)` | Fill for accent-bordered boxes |

**1-accent rule still holds.** Everything that isn't `terminal-ink` or `terminal-muted`/`terminal-soft` should be `terminal-accent` — never introduce a second hue.

---

## Typography

| Role | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `title` | Trirong | 1.75rem | 400 | Page H1 (Thai-capable serif) |
| `node-name` | IBM Plex Sans Thai | 12px | 600 | Human-readable labels (Thai and Latin) |
| `sublabel` | IBM Plex Mono | 9px | 400 | Port, protocol, URL, field type (Latin only) |
| `eyebrow` | IBM Plex Mono | 7–8px | 500, tracked 0.18em, uppercase | Type tags, axis labels |
| `arrow-label` | IBM Plex Mono | 8px | 400, tracked 0.06em | Arrow annotations |
| `callout` | Trirong *italic* | 14px | 400 | Editorial asides only (Thai-capable serif) |

### Font stack

```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Trirong:ital@0;1&display=swap" rel="stylesheet">
```

### Thai labels

Thai is the primary label language for OWARIN diagrams. IBM Plex Sans Thai carries both scripts, so a mixed Thai/Latin label needs no family switch — that is the reason it is the `node-name` face.

**Width budget.** Thai is not full-width: every Thai base character costs its face's Latin advance (0.60em), and every combining mark — vowels above and below, and the four tone marks — costs **nothing**, exactly like the nonspacing marks in the per-character rule above. Counting `len(string)` is the trap: `ยิงแอดชอปปี้` is twelve code points but only eight advancing characters, and a box sized for twelve is a third too wide.

**Height, not width, is what breaks.** Thai stacks up to two marks above a base and one below, so a Thai line needs more vertical room than a Latin one at the same size. Give Thai text `line-height: 1.45` and add 2px to the top and bottom padding of any box whose label may carry a tone mark. A mask rect sized from Latin metrics clips the marks off `ปี้` and the label reads as a different word.

Three rules follow:

- **Sublabels stay Latin.** Ports, protocols, field types, and URLs are Latin anyway — keep `IBM Plex Mono` there and don't translate them. IBM Plex Mono carries no Thai, and a 9px Thai sublabel loses its marks regardless.
- **Floor of 12px.** Thai marks go to mud below 12px. If a Thai name doesn't fit at 12px, cut the name — don't shrink the type.
- **Arrow labels, eyebrows, and legend text switch register.** Those slots are 7–8px mono, uppercase and tracked. Thai has no uppercase and tracking pulls its marks off their bases. A Thai label in one of those slots becomes 12px IBM Plex Sans Thai at weight 500, no tracking, no uppercase transform, and its mask rect grows to match (18px tall for Thai, not 16px, for the marks). Latin labels in the same diagram keep the mono treatment.

**Load-bearing rule:** Mono is for *technical* content (ports, commands, URLs, field types) and stays Latin. Names go in IBM Plex Sans Thai. Page title is Trirong. Italic Trirong is reserved for annotation callouts (see [primitive-annotation.md](primitive-annotation.md)). **Never JetBrains Mono** as a blanket "dev" font.

---

## Stroke, radius, spacing

| Token | Value | Use |
|---|---|---|
| `stroke-thin` | `0.8` | Tag-box outlines, leaf nodes |
| `stroke-default` | `1` | Most strokes |
| `stroke-strong` | `1.2` | Emphasis strokes |
| `radius-sm` | `4` | Small tags |
| `radius-md` | `6` | Node boxes |
| `radius-lg` | `8` | Containers, rings |
| `grid` | `4` | Every coord, size, and gap is divisible by 4 (hard rule) |

---

## Node type → treatment

Semantic role combinations — reference these by name in type specs.

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` | `accent` |
| `backend` | `paper` | `ink` |
| `store` | `ink @ 0.05` | `muted` |
| `external` | `ink @ 0.03` | `ink @ 0.30` |
| `input` | `muted @ 0.10` | `soft` |
| `optional` | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| `security` | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

---

## Customizing the skin

Four options:

1. **Run onboarding** — see [`onboarding.md`](onboarding.md). Drop a URL; the skill extracts the palette + fonts and rewrites this file.
2. **Edit by hand** — change the hex values in the tables above. Run the pre-output taste gate afterward to verify the accent still reads as "focal" against the new paper color.
3. **Brand handoff** — paste your existing design-token JSON into a new section here and map its tokens to the semantic roles above.
4. **Client profiles** — save and switch named skins, or bind one to a project, using [`profiles.md`](profiles.md).

### Constraints (don't break these)

- **Contrast**: `ink` must hit WCAG AA on `paper`. `muted` must hit AA on `paper` for 11px+ text.
- **One accent**: pick one color for `accent`. Two accents erases the focal signal.
- **No rainbow palette**: if your brand ships 8 colors, pick 3 (paper, ink, accent). The rest become `muted` variants.
- **Serif + sans + mono**: three families, not more. Trirong (title and callouts), IBM Plex Sans Thai (names), IBM Plex Mono (technical). The serif title against sans labels is the contrast the system leans on — don't collapse it to one family.
- **Paper is warm-neutral, not pure white**: pure white turns the design sterile. Pick a cream, bone, or light grey with a hint of warmth.
- **Dot pattern is optional, not default**: the 22×22 dot pattern is an opt-in "dotted paper" variant (good for long-form editorial hero diagrams). The default background is a clean `paper` fill, no pattern. When the pattern is enabled, it should sit at ~10% opacity of `ink` on `paper` — visible but quiet.
- **Container is clean by default**: the diagram sits directly on the page paper, no secondary container background or border. A framed variant (`paper-2` bg + `rule` border + 8px radius + padding) is available as an opt-in for card-heavy layouts, but don't reach for it by default — the extra chrome fights the figure.
