---
name: Spots
description: A visual-first city guide that turns "what should we do?" into a confident plan.
colors:
  paper: "#fffaf6"
  paper-warm: "#f7f3f0"
  ink: "#141417"
  ink-soft: "#2d1830"
  muted: "#7f7480"
  line: "#141417"
  border-soft: "#e7dce3"
  coral: "#ff4e76"
  tomato: "#ff5a2e"
  butter: "#ffd451"
  acid-lime: "#cfff2f"
  deep-plum: "#5f2e61"
  burgundy: "#64070f"
  rose-pop: "#ef7ac8"
  jungle: "#0b5a46"
typography:
  display:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "0"
  headline:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0"
  title:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "0"
  body:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0"
  label:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0"
rounded:
  sm: "10px"
  md: "16px"
  lg: "22px"
  xl: "28px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "34px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "18px 34px"
  chip-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  spot-card:
    backgroundColor: "{colors.tomato}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "14px"
  image-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
---

# Design System: Spots Probe V1

## Explore: Account Visual Baseline (Current Override)

### Account aligned with current Explore (2026-09-04)
Mi cuenta uses the exact shared ExploreGridCard and GridColumnSelector from
Explore, with only one-column and two-column modes (one by default). Both
screens share photo ratios (2:1 and 1.8:1), 12px image corners, monochrome
category badges, title/bookmark row, status, location and budget metadata.
Grid spacing is 16px and columns are measured from the available width.
Selectors share the 14px muted group, 4px padding/gap, 32px buttons and 10px
button corners with a white selected surface and accessible selected states.
Account preserves its profile, menu, Lugares/Parches tabs and saved/liked data.
Profile and section titles use Explore's 18px/600 scale, 20px gutters and 28px
section spacing. Empty states use white surfaces, 16px corners, 20px padding,
18px headings and 14px/21px secondary copy. Event cards retain event names
and omit place-only bookmark and opening-hours controls.

### Discovery Home Structure
Update: omit the standalone categories rail. "Para visitar hoy" is a wrapping
photo grid with an icon-only 1/2-column selector (2 default), 12px gaps, name/location/budget,
bookmark overlays, and incremental loading. Upper home blocks remain unchanged.
Discovery cards and photos use 12px corners, with 8px inset captions.
Today grid cards use a 2.3:1 photo above a title/bookmark row and wrapping
inline metadata (budget, category, distance/location, availability). No outer
card fill; preserve one/two columns and never fabricate ratings.
Reference: supplied travel home screenshot, adapted to Spots content only.
Order: profile and notification row; integrated search/filter pill; five circular
category shortcuts with labels below; section title and see-all action above a
horizontal photo-card rail; category pills rail; compact recommendation rail;
floating five-action navigation. Retain account colors, 24px card corners,
14px body, 12px metadata, 18px section titles, and white/muted controls.
Photo cards place name/location/budget in a white bottom inset, bookmark top-right.
All rails scroll without wrapping. Reserve bottom space for navigation and safe area.
See-all opens the existing full feed; filtering and search use the real catalog.

Explore now takes its aesthetic from `apps/mobile/app/(tabs)/account.tsx`,
not the poster probe below. Shared colors live in `apps/mobile/lib/account-ui.ts`.
Canvas #f5f5f7; white surfaces; muted surfaces #ededf0; text #141417,
secondary #5f5f67; coral #EF3857 with a 12% tint for selected states.
Use the existing account font, weights 400-700, 12px metadata, 14px body,
and sentence-case titles. Cards/images use 24px radii without heavy outlines.
Controls use white/muted surfaces, not yellow fills or black borders.
Explore search uses a white surface with a 1px #d6d6dc border to distinguish
it from the gray canvas; its outer height remains 42px.
Preserve Explore's four header rows, 42px controls/chips, cover/title overlay,
description/action row, horizontal metadata, filtering, and entrance animations.
Selected categories retain the radial transition with a soft coral fill,
stronger text weight and an accessible selected state. No global theme change
or account layout change is intended by this override.

## 1. Overview

**Creative North Star: "The Pocket City Poster"**

Spots should feel like a stack of small city posters you can actually use. The UI borrows the confidence of printed gig flyers, the pace of swipeable consumer apps, and the clarity of iOS utility screens, but it stays useful enough to answer: why go, with whom, when, how much, and where.

This v1 exists for visual probes. It is intentionally bolder than a production baseline: thick outlines, warm paper backgrounds, punchy color blocks, oversized Montserrat, and photography treated as the main proof. The system should not look like a generic directory, a Google Maps clone, a cold reservation app, or a SaaS dashboard wearing lifestyle photos.

**Key Characteristics:**
- High-contrast black outlines around cards, images, chips, and primary controls.
- Warm off-white canvases instead of pure white.
- Montserrat only, pushed through weight contrast rather than font switching.
- Photo-first cards with saturated color containers.
- Big, confident labels that name the occasion, not just the category.
- Navigation and filters that feel tactile, compact, and direct.
- Modular layouts that feel like a curated city deck, not a uniform card grid.

## 2. Colors

The palette is warm paper plus city-poster color: a calm base, black structure, and a rotating set of saturated accents for moods and categories.

### Primary
- **Poster Ink**: The structural color for text, outlines, icon strokes, and high-confidence actions. Use it wherever the interface needs commitment.
- **Spots Coral**: The inherited brand pulse for likes, active states, discovery moments, and emotional emphasis. Use sparingly enough that it still feels like a signal.

### Secondary
- **Tomato Card**: Food, urgency, heat, and high-energy places.
- **Butter Card**: Day plans, brunch, casual optimism, and light recommendations.
- **Acid Lime Card**: Discovery, novelty, wellness, and playful categories.
- **Deep Plum**: Night, culture, editorial surfaces, and darker image overlays.

### Tertiary
- **Burgundy Night**: Dense evening cards and dramatic photo-backed recommendations.
- **Rose Pop**: Social, romantic, dessert, saved-list, and feminine-coded accents when coral is too expected.
- **Jungle Green**: Outdoor plans, cocktails, calm evening surfaces, and grounded contrast.

### Neutral
- **Warm Paper**: The default app background. It should feel physical and soft, never sterile.
- **Soft Paper**: Secondary background for sheets, tabs, and inactive surfaces.
- **Muted Copy**: Metadata, helper text, timestamps, distance, budget, and secondary signals.
- **Soft Border**: Dividers inside dense surfaces. Do not use it when a bold black outline would better communicate affordance.

### Named Rules

**The Poster Color Rule.** One saturated color may carry a card, but the screen should not become a rainbow grid. Keep each viewport to two dominant accents plus one small signal accent.

**The Black Spine Rule.** If a component is meant to be touched, selected, saved, opened, or compared, it gets structural black through outline, text, or icon.

## 3. Typography

**Display Font:** Montserrat, system fallback.
**Body Font:** Montserrat, system fallback.
**Label/Mono Font:** Montserrat, system fallback.

**Character:** Montserrat must do all the work. The system gets personality from weight, scale, density, and blunt composition, not from adding a decorative typeface.

### Hierarchy
- **Display** (900, 42px, 0.95): Screen greetings, hero place names, mood headlines, and single-option decision moments.
- **Headline** (800, 28px, 1.05): Section titles, saved-list headers, result group titles, and bottom-sheet titles.
- **Title** (800, 20px, 1.12): Card titles, place names, CTA labels, and primary chip groups.
- **Body** (500, 16px, 1.45): Descriptions, editorial blurbs, and detail copy. Cap longer text blocks at 65ch on web and 4 to 6 readable lines on mobile.
- **Label** (700, 13px, 1.1): Pills, tags, distance, budget, open status, and compact metadata.

### Named Rules

**The Weight Ladder Rule.** Use 900 for identity and moment, 800 for decisions, 700 for controls, 500 for readable context. Avoid weak 400 labels inside cards.

**The No Tiny Cool Text Rule.** Metadata can be compact, but it must remain legible on top of images and color blocks. If a label needs to be 11px to fit, rewrite it.

## 4. Elevation

Depth is primarily created by outline, overlap, scale, and image contrast. Shadows are secondary and should feel like physical lift under a sticker or floating CTA, not like generic app-card softness.

### Shadow Vocabulary
- **Floating CTA** (`0 18px 42px rgba(20, 20, 23, 0.28)`): Use for sticky primary actions such as "View More", "Elegir este plan", or a bottom decision bar.
- **Poster Lift** (`0 12px 0 rgba(20, 20, 23, 0.10)`): Use only for playful probe variants where the card should feel printed and stacked.
- **Photo Overlay** (`0 22px 56px rgba(8, 4, 8, 0.34)`): Use on image-heavy dark surfaces and login/onboarding compositions.

### Named Rules

**The Outline First Rule.** Reach for a 2px black outline before reaching for a shadow. Shadow without structure will make Spots feel like a generic marketplace.

## 5. Components

### Buttons
- **Shape:** Pill or large rounded rectangle, depending on context. CTAs use pill radius (`999px`); card-contained actions use rounded rectangle (`16px` to `22px`).
- **Primary:** Poster Ink background with Warm Paper text, Montserrat 800 or 900, generous horizontal padding (`18px 34px`).
- **Hover / Focus:** Slight translate up (`-2px`), stronger outline, and visible focus ring. Mobile press states should scale to `0.98`, not fade away.
- **Secondary / Ghost / Tertiary:** White or Warm Paper fill, 2px Poster Ink outline, bold black label. Ghost controls are only for low-risk actions.

### Chips
- **Style:** Small pill, visible outline, compact Montserrat 700, with the selected state filled in either Poster Ink or the active mood color.
- **State:** Selected chips must change at least two attributes: fill and text color, or outline and icon. Never rely on color alone.

### Cards / Containers
- **Corner Style:** Rounded but not soft (`16px` to `22px`). Cards should feel designed, not bubbly.
- **Background:** Either Warm Paper for neutral containers or a full accent block for featured recommendations.
- **Shadow Strategy:** Follow the Outline First Rule. Use Floating CTA shadow only for sticky actions and Poster Lift only in more playful probes.
- **Border:** Use 2px Poster Ink outlines on recommendation cards, image cards, and major controls. Use Soft Border only inside dense admin-like sections.
- **Internal Padding:** Compact but confident (`12px` to `16px` inside cards, `24px` for screen gutters).
- **Layout Role:** Treat cards as modules with jobs. A large card anchors a decision, a rail card supports comparison, a small chip opens a mood, and a bottom preview connects map context to action.

### Inputs / Fields
- **Style:** Pill or rounded field, Warm Paper fill, 2px Poster Ink or Soft Border depending on visual weight.
- **Focus:** Border moves to Poster Ink or Spots Coral with a visible focus ring. Do not use subtle-only focus states.
- **Error / Disabled:** Errors use Coral or Burgundy plus text, never color alone. Disabled states reduce contrast but keep label readability.

### Navigation
- **Style:** Minimal icon buttons and bold labels. Top actions may be black-line icons on paper; bottom nav should be compact, tactile, and not oversized.
- **Active State:** Active items use fill, weight, and icon change. Avoid only tinting an icon.
- **Mobile Treatment:** Preserve iOS safe areas and thumb reach. Sticky actions may float over content if they include a soft fade or reserved bottom spacing.

### Recommendation Card

The signature card is a poster tile: accent background, rounded image, bold place or occasion title, and small operational metadata. It should answer one decision quickly: what is this, why now, and how easy is it to act?

### Layout Modules

Probe layouts should be composed from distinct modules: search plus filter, mood chips, a featured recommendation, horizontal rails, detail sheets, map previews, and floating navigation. Do not turn every module into the same card. The screen should read as a decision path, not an inventory.

## 6. Do's and Don'ts

### Do:
- **Do** keep Montserrat as the only typeface and use weight contrast aggressively.
- **Do** use warm off-white backgrounds instead of pure white.
- **Do** make photography the main evidence for a place, with readable overlays and enough crop discipline.
- **Do** give touchable cards a visible black structure: outline, icon stroke, or bold label.
- **Do** let color communicate mood and category, but keep each viewport controlled.
- **Do** make every place suggest an occasion, not only a category.
- **Do** keep operational details close: distance, open status, budget, neighborhood, and reason to go.
- **Do** design for a useful decision in 30 to 60 seconds.
- **Do** vary module size and purpose so the screen feels curated rather than generated.

### Don't:
- **Don't** make Spots feel like a generic directory, Google Maps clone, cold reservations app, institutional event listing, saturated marketplace, or endless grid with no point of view.
- **Don't** use pure `#000000` or `#ffffff` as the visual default in new probes. Use Poster Ink and Warm Paper.
- **Don't** make cards depend on thin gray borders and soft shadows alone.
- **Don't** overload the top of the screen with filters before the user has seen a recommendation.
- **Don't** use tourist-cliche visual language, forced folklore, or caricatured local signals.
- **Don't** use gradient text, decorative glassmorphism, side-stripe accent borders, or repeated identical card grids.
- **Don't** hide legibility behind photography. Text over images needs a real scrim, solid chip, or relocation.
- **Don't** let probe color become chaos. Bold does not mean every card gets a different loud color in the same viewport.
- **Don't** make the default explore screen a uniform grid of cards.

## Current Map View: Account-Style Spots

The map uses the current Explore/account tokens, overriding the earlier poster-style probe above: white surfaces, accountUi text colors, 12px category labels, 42-48px circular controls and search, and the existing DiscoveryPlaceCard with 12px image corners. The Uber Eats reference supplies layout only, not branding or ratings.

The map fills the viewport beneath floating back/search/filter controls and a horizontal category rail. A bottom card carousel (190px high, up to 360px wide) sits above the existing five-action navigation. Category-icon markers select cards; carousel selection recenters the map. Search and filters retain the current Spots data. Safe-area spacing protects controls, attribution stays visible, and native apps retain the existing web-map fallback.

Map refinement: omit the back control (Home remains in navigation), extend search, and fade overlays on a background tap while preserving navigation. Another background tap or marker selection restores overlays. Suggest area search only after user pan/zoom or changed criteria, never initial centering. Keep OSM attribution visible; the current raster treatment is neutral grayscale, not a replacement cartography provider.

### Account empty collections (2026-09-04)
Reference: user-supplied Google Maps empty-state crop. Preserve its centered
vertical stack: large neutral outline icon, short heading, supporting sentence,
and generous open space. Adapt the icon to bookmark-outline (64px) for saved
collections. Use the Explore canvas without a card, border or shadow; 300px
minimum content height, 40px vertical padding, 24px icon-to-copy spacing,
18px/24px semibold heading and 14px/21px secondary centered text with a 320px
maximum line width. Keep profile and collection tabs visible. Omit result count
and column controls when the selected collection is empty.

### Undo removed bookmark
Account removal shows an 8-second bottom snackbar naming the removed place and
a Deshacer button. Restore only the latest removal, without toggling an already
saved place off. Clear pending undo on leaving the screen or account changes.
Use the softer dark-gray textSecondary surface (#5f5f67), white 14px/20px text, white outlined 44px-minimum undo button,
16px corners, 20px side gutters and bottom safe area + 16px. Reserve scroll
space while visible; announce the message politely to assistive technology.
The snackbar uses the shared Entrance animation: a 14px upward slide with
opacity fading in over 320ms, respecting reduced-motion preferences. Replays
when a different removed bookmark replaces the current notification.

### Parches / city events
The central ticket-outline destination is Parches: dated local events, not an itinerary
builder. Reuse SearchField, ExploreGridCard, GridColumnSelector, Entrance and a
shared five-action DiscoveryNavigation. Canvas, typography, pills, photo ratios
and spacing remain Explore's. Header: back and centered Parches title, with no saved events shortcut;
search/filter pill directly below the header, horizontal date pills, category chips,
result heading and 1/2-column selector. Date choices: Hoy, Mañana, Este fin de
semana, Elegir fecha and Próximos. A month calendar uses 7 equal columns and
44px day cells; selected days use coralSoft. Filter sheet uses white surface,
28px top corners, 20px padding and existing category/zone/budget chips.
Event cards add a calendar row; explicit zero ticket price means Gratis, missing
price means Precio por confirmar. Missing dates never qualify as Hoy; show
undated entries at the end of Próximos, labeled Fecha por confirmar. On empty
selected dates, offer upcoming events while retaining non-date filters. Empty
catalog uses centered calendar icon, title and explanatory copy, without fake
listings. Mi cuenta/Parches is bookmark-based with the existing undo action.
Dates are interpreted in America/Bogota; ended events are excluded. New optional
catalog fields: starts_at, ends_at, ticket_price. No database migration or data
publication is part of this screen change.

Parches filters reuse Places FilterSection, FilterDivider and filterSheetStyles: 88% height, white sheet, drag handle, identical header and fixed Limpiar/primary results footer. Event category, ticket budget and location use the same animated accordions and selection chips; applying commits the draft and dismissing discards it.

### Place update notifications
The existing notification panel shows real catalog deltas, with local per-account read state, a coral unread count on the Explore bell and a mark-all-read action. Cards summarize the notification with its type chip; omit date, time and change description, retaining the place photo, name and location/budget metadata. First catalog load is a baseline, not a new-place event. Loading, retryable error and empty states retain the current calm surface and typography. No audit flags or draft removals imply business closure.

Notification card place images use explicit 72 × 72px dimensions and a 1:1 aspect ratio, with alignSelf flex-start to prevent flex-row stretching when adjacent text wraps. Crop with cover and clip to the existing 12px corners.

Notification location and budget remain in a single non-wrapping horizontal row; both text labels truncate with trailing ellipses when space is limited.

Notification place names use one line with trailing ellipsis, never wrapping to a second line.

Notification type chips use 10px text with 13px line height for a more discreet update label.

Updates to the same place (including its branches) are condensed within 24 hours of the first update. Keep the first notification ID/read state, union changed fields, and show the latest content; updates after that window create a new notification.

Notification card titles show only the place name, without the unread suffix “Nueva”. Unread state remains tracked by the bell counter and read actions.

Notification list items have no trailing arrow control. The entire item opens the place and marks the notification as read.

PWA status bar uses the light Explore background (#f5f5f7) and the iOS default opaque status bar. Preserve the existing iOS standalone full-screen height recovery. Explore applies the top safe area once above the greeting; the sticky search keeps 8px top padding without repeating the safe inset.

PWA chrome follows the route: dark (#050305, black status bar) for login/setup and light (#f5f5f7, default status bar) for Explore. Explore reserves env(safe-area-inset-top) outside the animated scroll area, then adds the normal 20px header gutter. Full-screen height recovery remains unchanged.
