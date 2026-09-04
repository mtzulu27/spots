# Layout System: Spots Probe V1

## Purpose

This file defines the layout direction for Spots probes. It learns from the reference without copying the travel app. The goal is a mobile-first structure where recommendations feel modular, visual, and easy to act on, while still helping the user decide in 30 to 60 seconds.

Spots should not be a simple feed of identical cards. It should feel like a composed deck of decision modules: search, mood, featured recommendation, quick categories, horizontal rails, map context, and detail sheets.

## Layout North Star

**A curated city deck, not a database feed.**

Every screen should be built from modules with different jobs. Some modules help the user choose a mood, some show one strong recommendation, some let them compare, some expose map context, and some give enough detail to act. The layout should make those jobs visible.

## Core Primitives

### 1. Framed Content Modules

Use framed modules instead of generic cards. A module may contain an image, metadata, actions, tabs, price, neighborhood, open status, or a map preview. It is a decision unit, not decoration.

Good uses:
- Featured place
- Mood prompt
- Nearby recommendation
- Saved spot
- "For tonight" cluster
- Detail summary
- Map result preview

Avoid:
- Repeating the same image-card shape endlessly
- Making every item the same height
- Treating all categories, spots, and actions as equal

### 2. Horizontal Rails

Use horizontal rails when the user is comparing a small set of curated options. Rails should have a clear theme and a small scope.

Examples:
- Popular ahora
- Cerca y abierto
- Para una cita
- Brunch sin pensarlo
- Guardados para despues

Rules:
- Rails need a visible section title and a reason to exist.
- Rails should not become a dumping ground for every place.
- The first card in a rail should be strong enough to make the rail feel curated.

### 3. Vertical Decision Flow

The main explore screen should read top to bottom as a decision conversation:

1. Where am I and what moment am I in?
2. What am I in the mood for?
3. What is one strong option?
4. What are a few alternatives?
5. What can I do next?

This is more important than showing maximum content above the fold.

### 4. Floating Navigation

The reference uses a dark floating bottom nav with a strong active item. Spots can use this pattern for probes because it makes the app feel tactile and mobile-native.

Rules:
- Keep it compact and thumb-reachable.
- Active state must use shape plus color plus icon weight.
- Do not let the nav cover primary content without bottom spacing or a fade.
- Use it for main app destinations, not one-off actions.

### 5. Search Plus Filter Cluster

Search and filter should feel like one tool. Search is the open-ended entry. Filter is the narrowing action.

Rules:
- The search bar can be large and calm.
- The filter control should be a bright circular or pill action, not a hidden text link.
- Do not lead with a dense filter panel before showing recommendations.

### 6. Detail As Sheet

The detail screen should behave like a visual hero plus an actionable sheet. The image gives desire, the sheet gives confidence.

Sheet order:
1. Tabs or quick sections
2. Decision facts: open status, distance, budget, time, neighborhood
3. Editorial reason to go
4. Services or amenities
5. Primary action

Rules:
- The sheet can overlap the hero image.
- The primary action should be persistent or near the bottom of the visible sheet.
- Details should answer: why go, with whom, when, how much, and where.

### 7. Map As Canvas

Map screens should be visually distinct from feed screens. The map is the canvas; cards become previews attached to places.

Rules:
- Use map pins with photo or category identity, not anonymous dots.
- Keep search and mood chips floating over the map.
- Use a bottom preview card for the selected spot.
- Do not make the map the default experience unless location is central to the task.

## Screen Archetypes

### Explore Home

Structure:
1. Greeting or moment cue
2. Search plus filter
3. Mood/category actions
4. Featured recommendation or "best next choice"
5. Horizontal rail of alternatives
6. Compact recommendation modules
7. Floating bottom nav

The screen should feel curated and breathable. It can use several module types, but each type needs a different job.

### Quick Decision

Structure:
1. One strong recommendation
2. Why it fits right now
3. Three facts: distance, budget, open status
4. Two actions: save or go deeper
5. Small rail of alternatives

This screen should reduce anxiety. It should not ask the user to configure too much.

### Place Detail

Structure:
1. Full-width photo hero
2. Small top controls
3. Place name and compact trust metadata
4. Overlapping information sheet
5. Sticky or near-sticky action

The detail view is where editorial taste meets operational confidence.

### Map Explore

Structure:
1. Full-screen map canvas
2. Floating search
3. Mood chips
4. Photo pins or category pins
5. Bottom selected-place card
6. Floating bottom nav

The map should help users understand proximity and neighborhoods, not become a generic maps clone.

### Saved Spots

Structure:
1. Bold title
2. Lightweight filters
3. Mixed saved modules: big recent save, small grouped saves, location clusters
4. Optional "plan with these" action

Saved should feel like a personal collection, not a static bookmark list.

## Density And Rhythm

Use alternating module sizes to create rhythm:
- One large anchor module
- Two medium comparison cards
- A row of small category chips
- A compact list or map preview

Avoid layouts where every section has the same title, same spacing, same card size, and same CTA position.

## Applying The Visual Style

The visual system from `DESIGN.md` should wrap these layout primitives:
- Warm paper canvas
- Bold Montserrat
- Black structural outlines
- Saturated card backgrounds
- Photo-led evidence
- Floating tactile controls

The layout system decides where things go and what job each module has. The design system decides how those modules feel.

## Do's And Don'ts

### Do

- Do build screens as a sequence of decision modules.
- Do vary module size and purpose.
- Do use horizontal rails for curated comparison, not infinite browsing.
- Do make detail screens a hero plus actionable sheet.
- Do use map screens when spatial context changes the decision.
- Do keep search and filter close together.
- Do reserve large modules for high-confidence recommendations.

### Don't

- Don't copy the travel app's categories, labels, or information architecture.
- Don't make every recommendation a simple card.
- Don't use a uniform grid as the default explore layout.
- Don't put filter complexity before the user sees useful options.
- Don't let floating nav or CTAs cover content without spacing.
- Don't make the map feel like Google Maps with a skin.
