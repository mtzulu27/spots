# Discovery navbar motion

## Desktop Explore

Approved MagicPath component467815826779684864, visual revisions467823274479476736
and467824333461549056. Web >=1024px uses a dedicated desktop shell; native and
narrow web keep MobileExploreDiscovery with its existing hook/scroll lifecycle.
Header80px, category rail52px, columns340px filters/340px results/fluid original
map; at1024-1280 use300px filters/300px results. Search320px maximum,40px high,
original flat coral mark left, location immediately right. Three nav actions
Explore/Parches/Contribute; active white/black, idle glyph-only, hover/focus
reveals label. Real account avatar expands to name/location, no demo identity.
Bell opens original notifications route. Montserrat: CTA14/20, fields13/18,
chips12/16, secondary actions11/16, filter titles12/17 semibold, card title15/21.
White surfaces, existing accountUi tokens, background#f5f5f7 and subtle search
shadow. Thin section dividers,16px rhythm. No duplicate results heading/sort.

Use the original catalog, createSpotFilter/rankSearchResults and branch-first
aggregation. Share filter options with mobile, never fork its search engine.
Preserve unknown budget semantics and all real favorites/detail callbacks.
Use original ExploreMap/DiscoveryPlaceCard, shared cluster/marker animation and
Mapbox style. Add opt-in desktop zoom controls without changing mobile defaults.
List and map share keyword, filters and immutable fixed-area bounds. Pin only
when canPinMapZone returns true (zoom>=15,longest side<=3km); while pinned,
pan/zoom never changes the scope and query/filter changes never auto-reframe.
Desfijar clears only bounds, preserves search/filters and frames matches.
Clear/Home clears query,filters,selection and area. Zero scoped results retain
Desfijar and an explicit empty message. Filter preview count uses that same area.
Do not mount both responsive experiences, request new location automatically,
or reset existing mobile navigation. Scope DOM CSS to .spots-desktop-explore.
This implementation is local only, not a Hostinger deployment.

Desktop map refinement: sorting belongs beside the center-column count in a
compact12px select, not in the filters. Header uses the original home, ticket
and contribution glyphs. Fijar zona uses board-pin14px,4px gap,content width.
Reserve the selected card224px + bottom80px and marker breathing space when
framing a selected pin, including list selection and all-branches framing.
Camera insets are opt-in; leave mobile defaults unchanged. Desktop continues
using the shared progressive clusters and marker transitions,without fan separation.
Match Main 2: drilldown14/16/18,automatic break at18,no connection lines;
hide the zone action while a place card is open without clearing its saved area.

## Search results / existing map handoff

Only the active results screen with at least one matching place shows a bottom
floating "Ver resultados en el mapa" pill. Reuse accountUi.surface (white in light
theme) as background,accountUi.text for label/glyph,discoverySurfaceShadow,48px minimum height,
999px radius,20px horizontal padding,8px gap,14px/20px600 label and20px map glyph.
Center within20px screen sides,max-width100%,bottom max(safeAreaBottom,16px).
Reserve the button height plus24px breathing room in the list's bottom padding.
No pill on Home,suggestions,empty results or map; do not add a second navbar.
Use the existing navbar map view,not /place-map (reserved for place detail).
Carry current draft query and every serialized filter into view=map. Share the
query with the existing map search field and filter sheet; preserve independent
map search when the map opens from place detail. Only matching,located branches
produce pins; never display unmatched sibling branches. Returning through Explore
keeps the result query/filters. Keep original navbar motion and map gestures.
The white results pill enters from80px below its final position over320ms with
ease-in-out cubic,translateY and opacity only. Animate once when it appears,not
on each result-count change; reduced motion shows it immediately. Stop on unmount.
Opening from this pill frames every located matching branch,not the user's
location or a fixed zoom. Reserve measured header height +24px above and bottom
navigation/locate controls below;32px side padding,maxZoom16 for single/coincident
points. Reframe only for changed results or overlay geometry,not ordinary map
gestures or card selection. Do not change ordinary Home-map or place-detail focus.
When entered through the results pill, show the existing48px white circular
back arrow beside the search field,using the map header's10px gap and20px sides.
The arrow restores the originating results query,all filters,results mode and
list position,even if map search or filters changed. Capture an immutable search
snapshot at entry. No extra map screen or duplicate navbar. Ordinary navbar-map
entry has no results-back arrow; preserve place-detail's existing back action.
Map navbar Home is a separate action: clear query,filters,results mode,map entry
snapshot and local zone selection,and return to the top of the unfiltered Home.
Do not show a numeric zoom-level chip; retain map zoom gestures and camera logic.
Navbar-map searches automatically frame matching results on keyword/filter changes,
using the same result-fitting camera. An empty initial map keeps existing location
focus. In this normal entry only,offer Fijar zona at the neighborhood scale below.
Capture geographic viewport bounds,not result IDs; apply them per branch before
grouping for every later keyword/filter change. While scoped,retain camera framing
and suppress automatic location/result focus,but keep gestures usable. Do not clear
the scope on zero results or keyword/category changes. One persistent bottom
button toggles Fijar zona / Desfijar zona. Both states use the same board-pin
glyph,white surface,position and dimensions. Hide the zone action while a selected
place card is open,including Desfijar zona. Preserve the fixed bounds; restore the
action on deselection under the same zoom rules. Reserve the longer label's width
without exposing the measuring copy to assistive technology. Expose selected
state and the current action label. When unpinned,keep the button visible only
while the viewport meets the neighborhood scale. While fixed,panning does not replace the scope; unpin then pin to
choose another area. Desfijar zona clears only viewport bounds,keeps keyword and
filters,and reframes results. No separate top status chip or duplicate empty CTA.
Controls use existing white44px capsules,12px/500 text,16px glyphs,8px gap and20px
side inset. Keep area controls outside the measured header so showing them cannot
cause a camera jump. No zoom chip. Results-pill and place-detail flows do not gain
these experimental area controls until approved. No new screen or dependency.
The filter sheet's result count uses the fixed geographic area too; non-map
filter sheets retain their existing counts and behavior.
Fijar zona is a compact32px white pill,11px/16px500 label,14px board-pin
glyph,12px horizontal padding and6px gap; retain44px touch area with6px hitSlop.
Center it in the bottom controls stack,directly above the navbar with its existing
safe-area/12px gap. Place selected cards and empty states above it,not behind it.
Neither state moves below the category row. Preserve all other scope behavior.
Offer Fijar zona only at neighborhood scale: zoom>=15 and longest geographic
viewport side<=3km. Check both zoom and actual bounds so desktop-wide viewports
cannot pin a city-sized area at the same zoom. Hide it when zooming out past
this limit. Keep Desfijar zona visible regardless of zoom while a scope exists.
Do not discard or enlarge an already-fixed scope when panning/zooming out.

## Map marker legibility and filtering motion

Category active surfaces are opaque; Tomar algo uses#FDE7EB rather than an alpha
coral layer. Preserve other category colors,typography,selection and filters.
Group overlapping map points below zoom18,not only below16. At zoom18 and above,
automatically break every cluster into individual branch logos,including branches
with identical coordinates. Reapply on zoom/filter changes; zooming below18 can
cluster again. Individual logos remain anchored to the stored branch coordinates,
even when they overlap. Do not offset them to prevent collisions.
Cluster taps advance through fixed zoom levels14,16,18,skipping any already reached.
This guarantees at most three successive drill-down taps from a broad view before
all branches are individual. Use an explicit flyTo target,not only a fitBounds
maximum that can stall at the same zoom. Center the full selected group's bounds
in the usable area between header and bottom controls. Do not add a tap counter
that leaks across searches or gestures. Use56px as the clustering proximity
threshold,not as enforced spacing. Groups must be deterministic. Tapping a cluster
zooms/reclusters until the individual threshold. No spread,fan,connecting lines
or automatic fan-framing pan. Never change catalog coordinates.
Do not scatter isolated markers or infer places. Preserve per-branch selection,
all-branches,camera framing and geographic search predicates. Selected markers
show only the elaborate place card,not a second tooltip duplicating its metadata.
Preserve marker selection emphasis and accessible names.
Broad clusters have bounded geographic
diameters so chains of places cannot create an unopenable city-wide cluster.
On filter changes retain removed marker visuals for200ms,shrinking from1 to.45
while fading to0,with no exit delay. Exiting markers cannot be clicked or focused.
Keep the existing320ms staggered entrance. Cancel pending removals if a marker
returns; clean up timers on unmount. Reduced motion removes immediately and skips
both animations. Do not animate Leaflet's outer positioning transform.

## Desktop login

Reference: MagicPath467780365180874752/revision467783008032792576,
Vidrio neutro adaptable. Web only at viewport>=900px; retain existing native and
narrow-web login. Full-bleed six-photo autoplay, starting at photo04,9-second
interval,1.4-second crossfade; no visible carousel controls. Pause for form focus,
hidden document and reduced motion. Original white S40x54 above424px panel,
20px gap,32px padding,20px radius. Montserrat,22/29px heading,14/20px buttons,
16px inputs,12/18px legal.44px white circular explore arrow top-right.
Tint/ink respond to sampled crop behind panel: threshold.43, darkrgba28/28/32
alpha.12+brightness*.22;light245/245/247 alpha.52+max(0,.65-brightness)*.18.
Backdrop blur32px/saturate.9 with opaque fallback. Assets bundled under
public/auth-desktop, never runtime MagicPath URLs. Preserve real shared auth
callbacks and errors, password visibility, recovery route and email/signup
confirmation flow. Email opens form; only explicit explore starts local guest.
This local implementation is not a hosting deployment.
Temporary desktop navigation policy: authenticated web users at>=900px skip
profile setup and onboarding, including direct links to those routes, and go to
Explore. Mobile/native keeps its existing sequence. Do not persist completed
flags; restore the flow through SKIP_DESKTOP_ACCOUNT_SETUP when ready.

## Home / Ibiza 122 announcement

Published2026-11-01 from approved MagicPath467741839064182784/revision467745276145340416:
insert one200px announcement after the existing72px sticky search shell and before
categories, never in search/results/listing/map. Keep28px Home gaps and the entire
navbar/search lifecycle unchanged. Cream#F1EDCF,petrol#12474F,coral#EF3857,white;
16px corners and discoverySurfaceShadow. Original flat S watermark230x300,
left-22/top-72,rotation-24deg,opacity.07. Same AI-assisted burger/Braun shake
cutout, bundled locally with six real tenant-logo images; no runtime MagicPath URLs.
No eyebrow. Question19px/23px400; Ibiza122?26px/28px600 on coral capsule;
support12px/17px400. Copy starts52%width/top24; arrow32px bottom14/right16.
Logos30px/2pxwhite rim,negative7px overlap,14px left/bottom. Narrow content<320px
uses28px logos,17px lead,23px destination,11px support,140px productimage and
50% copy-left. Wide content>=610px uses50% copy-left. Keep at least16px between
image bounds and copy; cap the product-image width only when needed to retain
that gap on smaller screens, preserving its aspect ratio and all other styles.
Only FlatSpotsMark's optional dimensions are generalized; default200x262 remains.
Banner press reuses the existing Ibiza122 search, not a new route or popup.
Static artwork is hidden from accessibility; one labelled button is the target.
Keep campaign colors light even in dark theme. No new dependencies,
catalog edits or claims of real bundled meal offer; asset is a concept composite.

## Budget calculator V2

Approved MagicPath467410811632111616/revision467685338207358976.
Scenario mode: gray sheet, handle, uppercase secondary12px title Un estimado del
parche, AppSegmentedTabs with Tranqui/Completo/Con toda outside white18px card.
Card order: people glyph/stepper, large32px per-person value with inline12px gray
por persona, Ver desglose disclosure with quantities/subtotals/group total.
Use existing real scenarioBudget arithmetic, missing prices remain Por confirmar.
Keep non-scenario counters and sheet dismissal/drag behavior. Disclaimer below.
Disclosure animates smoothly, supports reduced motion, and hides collapsed content
from accessibility. Local only, no hosting deployment.

Show four DiscoveryNavigation actions: Explore, Map, Contribute and Account.
Hide Parches/Eventos only from this navbar; retain its route and callback contract.
Hug the four buttons:48px targets,16px fixed gaps and8px horizontal padding.
Center the content-sized capsule in a viewport-level dock with20px safe side margins;
do not stretch it to those margins or distribute leftover width. Both icon tracks
and the active indicator use the same48px +16px step and8px origin.
Direct links to the hidden route leave all four items unselected, with no indicator.
Preserve icon meanings, route callbacks,
48px buttons, 68px container, 34px radius, shadows,
safe-area positioning and accountUi tokens. No new visual theme or dependencies.

Use one 48px accent circle translating between measured button centers with a
220-320ms ease-in-out, scaled to travel distance. Web uses one persistent
viewport-level React surface, outside screen entrance/route animations. Focused
screens register only their current callbacks; registrations flush together in a
microtask so route handoffs never replace the actual navbar DOM. When navigation
is absent (login, search, detail), its dedicated root is disposed. Web Animations
retarget from the browser's actual current transform, with no timing estimate,
animation queue, or restart when the destination screen registers. White
icon copies clipped inside the moving circle provide contrast without blending
brand colors. Decorative copies must not receive input or accessibility focus.

The active prop remains the navigation source of truth. Taps invoke the original
callbacks immediately; never delay navigation for animation. Reduced motion
snaps to the destination. Recompute geometry on layout changes. No hover is
required on touch. Keyboard/accessibility labels and selected state survive.

The web navigation host stays mounted but is hidden while the root's boot splash
is visible, including its fade-out and app-resume splash. The root publishes this
state before paint through data-spots-boot-splash. Do not solve layering by
remounting navigation or restarting its indicator.

## Soft Rounded Icons

The approved source is MagicPath Spots, component 467131169343950848,
revision 467131527487164416 (65 editable SVG glyphs). Use SpotsIcon throughout
the mobile app. Its 32-unit paths use a 2.5-unit stroke with round caps and joins.
Keep existing icon sizes, accountUi colors, selection colors and parent hit targets.
The navbar retains both icon tracks and their current animation; only glyphs change.
CategoryIcon uses this same family, including the approved disco-ball symbol.
Share glyph updated to approved MagicPath467131169343950848/revision467374561273450496:
iPhone-style upward arrow and open rounded tray,32pxviewBox/2.5pxstroke.
All share/share-outline/share-social/share-social-outline aliases resolve to this
same geometry. Preserve existing button sizes and native/Web Share behavior.
Board-pin added from approved MagicPath467131169343950848/revision467823677447229440.
Use its exact two paths for both Fijar zona and Desfijar zona, at14px with the
existing32-unit grid/2.5-unit stroke. Do not replace geographic location pins.
External Google, Apple, Instagram and WhatsApp brand marks are not redesigned.
Do not replace place logos, the Spots mark, or editorial category imagery.
No new fonts, dependencies, layout changes, routes, authentication or hosting changes.

## Contribute screen

Remove only the introductory subtitle below Aporta a Spots; retain its heading,
safe-area insets, entrance effects and existing feedback/suggest actions.
Use two independent settingsListStyles.group cards with 12px between them,
16px screen side padding and 24px from the heading to the first card.
Reuse SettingsListItem with an optional description: regular16px/22px label,
regular14px/21px secondary description,4px text gap,18px horizontal/14px vertical
padding,14px row gap and26px card radius. Existing label-only settings rows
must stay unchanged. Use the approved23px plain text-color glyphs, no circular
icon backgrounds or special coral pin;18px tertiary chevrons. Allow text wrapping.
Keep the shared four-item navbar and its motion unchanged. Local only.

ContributionSheet is the shared shell for both contribution forms. Follow the
calculator: accountUi.bg,28px top corners,20px content sides,10px top inset,
42x5px border-color handle with12px lower spacing,12px/18px600 uppercase tertiary
heading with0.6px tracking and8px upper spacing,13px/18px regular helper copy.
No visible X. The handle/header drags the sheet down continuously; dismiss at
110px travel or0.8 velocity and spring back otherwise, like the calculator.
Disable dragging while submitting. Keep labelled backdrop dismissal,native back
and accessibility escape. Translate the sheet without scale/fade on the sheet;
only the scrim fades. Footer uses max(bottomInset,16),not an additive30px inset.
Use existing AppPrimaryButton unchanged:56px high,28px radius,16px700 label and
appColors.primary, matching Filters. Do not create another CTA color/weight variant.
Reuse shared formField/formInput styles: white borderless fields,18px radius from
auth forms,14px horizontal padding,16px400 text,48px single-line height. Feedback
is the multiline variant with180px minimum height and14px vertical padding.
White44px round add/remove actions use20px approved glyphs. Keep input/textarea
regions shrinkable and scrollable,existing keyboard avoidance,drafts,validation,
submission callbacks and screen/navbar behavior. Do not change other screens.

## Notifications screen

Approved MagicPath notification revision 467139416087990272 uses Settings as its
style source. Home bell navigates to /notifications instead of opening the modal.
Header: topContentInset,16px sides,12px bottom,44px white circular AppIconButton,
20px back glyph,centered18px/600 title and44px balancing spacer. No discovery navbar.
Background and colors use accountUi; content16px sides,24px top,26px section gap.
Sectionlabels14px/500 secondary with16px inset and12px bottom; independent white
cards26px radius,18px padding,12px between cards; no shared white group or dividers.
Center logo,copy and time/actions vertically. Circular42px logos,14px/21px copy,
11px/17px dates. Preserve real catalog events/preferences and read storage.
No invented welcome/events. Missing logos use a neutral location icon, not covers.
Overflow actions mark read/unread or open the real place. Back returns to Home;
direct links fall back to /explore. Loading,empty,error,retry and image errors handled.

Notifications global actions:44px white circular vertical-ellipsis button replaces
the header's right spacer, keeping title centered. Anchored white24px-radius menu
offers Mark all read and Clear all; bulk actions include the full inbox,not40rows.
Clear uses a confirmation and persistent per-account/device dismissal tombstones;
Undo restores only the IDs dismissed by the last action. Catalog events and future
notifications are retained. Disable unavailable actions; preserve row menus.

## Home sticky search lifecycle

Keep the existing CSS sticky shell,72px footprint,search styling,PWA safe-area
padding and native stickyHeaderIndices. Web state comes from the real focused
scroll viewport and non-sticky profile bounds plus the existing page gap, never
from the sticky shell's moving onLayout position. Do not reset it on tab focus.
Synchronize on focus,scroll,resize,layout restoration and foreground resume;
ignore hidden zero-sized layouts and disconnect all observers/listeners on exit.

## Home zone chips / Plana 01

Approved MagicPath component467144607604572160,revision467144607604572161,
variant01 Plana only. Zone filter capsules:44px minimumheight,999px radius,20px inline
padding,12px railgap,noicons,shadow or visibleborder. Light activebackgroundwhite
(accountUi.surface),accountUi.text,14px/20px600. Idle transparent,textSecondary,14px/20px500.
Reserve600-weight labelwidth to avoid movement when switching selections.
Darkmode retains text/surface tokens for contrast.
Preserve zonefilter semantics,horizontal scrolling,scroll restoration and stickybar.
Do not propagate to category circles or other filters. Plana is local-only;
production retains Bruma01A from the2026-10-31 release until publication is requested.

## Place detail / continuous scroll hero

Approved single467355203897806848/revision467366360339607552: logo44px beside
title with10px gap; compact48px white branch selector14px radius without Sede
label, live status right and down chevron. Preserve existing branch sheet.
Information uses one white18px group with schedule,address,budget,people as
vertical rows, no icon discs. Actions use a separate white18px group of48px rows.
Address wraps; preserve real branch data, calculator, contacts and similar cards.
Soft focus is linked to collapse: photo blur0..8px, scale1..1.04, black veil20..64%.
Do not alter gallery gestures, paging, spring, dots, expansion or return behavior.
Branch-sheet option cards reuse the exact compact selector styles:48px minimum,
14px radius,12px horizontal padding,14px/600 name left,10px status and5px dot
right. Preserve sheet animation and data selection.
The closed selector chevron uses chevron-forward16px/textSecondary, matching
quick-action chevrons. Radio rows expose checked state to assistive technology.
Latest approved main revision467376742093459456: option02 branch sheet without
visible radios, selected#e8e8ee/1px#b8b8c2, idle white/500 name, active600.
Heading11px/16px600 uppercase gray with24px top padding. Keep checked semantics.
Replace place quick-action rows with four46px circular icon targets/labels in
one equal-width row; use selected-branch map/menu/WhatsApp/phone, omit missing
links. Instagram is a separate brand-level section using aggregate place profile,
with handle and external glyph flush right; do not change on branch selection.
Description uses secondary text and24px spacing from hero and before selector.
Preserve event layout,all gallery gestures and scroll behavior.
Local refinement:status12px/18px,information values14px/21px,address14px/20px,
helper text12px/18px,today12px/18px,weekly rows13px/20px,section labels12px/18px.
Network row shares compactInfoGroup/Row/Icon/Value with the information block:
white18px-radius container,14px inline padding,19px icon,14px text,16px external
glyph. Remove the trailing branch name beside En esta sede. Local only until
publication is explicitly requested;preserve all actions and gallery behavior.
Hero logo44px:remove inner padding,use cover crop and circular clipping so image
fills the entire badge. Preserve2px white outer border;no asset modifications.
Local icon proportions:DETAIL_ICON_SIZE18px across information leading icons,
branch-action toolbar glyphs and Instagram. DETAIL_ACTION_ICON_SIZE16px across
location external icon,budget calculator and network external icon. Preserve
46px toolbar circles,row hit areas,header icons and functional callbacks.
This release publishes the local Plana01 chips too, as part of the confirmed build.

Keep the default406px cover and its compact100px + safe-area-top minimum.
After32px of scroll, shrink one pixel per scroll pixel until the minimum;
reverse the same absolute-position mapping when scrolling up. No timed collapse,
snap threshold, scroll lock or direction-dependent state. Keep a stable406px
sticky header footprint so resizing its clipped cover cannot change scrollHeight
or feed back into scroll position. Only explicit gallery expansion may enlarge
that footprint. Clip from bottom to top, keeping the base photo at406px without
resizing, zooming or stretching it. Preserve photo gallery, header controls and
existing typography.

Hero drag expansion uses one persistent gallery image surface, not a cover/gallery
crossfade. Keep its height406px while scroll collapses the clipping stage; during
explicit expansion grow that same surface continuously to the viewport height.
Each gallery page uses cover throughout, retaining the current photo and horizontal
paging position in both directions. Apply collapse blur/scale to this surface and
one black veil above it; remove the separate base image and image-opacity blend.

Local branch-selector shadow trial: the closed compact selector reuses
discoverySurfaceShadow from the Home search bar (web 0px 4px 16px black8%;
native opacity.08,radius8,offsetY4,elevation3). Preserve48px height,14px radius,
white surface and all spacing. Do not apply this elevation to branch-sheet rows.

Feed cards: wherever FeedPlacePhoto desaturates a closed place cover, desaturate
its logo with the same getFeedPlaceGrayscaleStyle predicate and same render time.
Preserve the existing availability1/3 rule (opens soon/closed), branch aggregation,
event exemptions and web-only filter support. Never filter the entire card:
status dots, labels and controls retain their colors. Detail hero logos are unchanged.
