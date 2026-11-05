# Spots neutral-glass comparison

New MagicPath frame: Spots Acceso Vidrio neutro adaptable.
Component467780365180874752, revision467780365180874753.
Original dark-glass component467777087168724992 is unchanged.

Retain autoplay, no visible slider controls, white mark above card and14px buttons.
Neutral62% off-white with32px backdrop blur replaces black32% plus brightness.68.
Dark text keeps the functional surface readable. No photo classification or theme
switching: the same material naturally takes the current image's color/light.

Verified actual browser rendering on bright park05, nighttime04 and billar01.
Computed filter is blur32px saturation.9, with no brightness multiplier.

## Photo-responsive revision

After feedback, replace the fixed clear treatment with a real32x32 pixel sample
of the photo area under the card. CORS headers on the storage images were checked.
Account for cover crop, viewport size and the special photo04 transform. Resample
when the photo, viewport or form dimensions change; clean up ResizeObserver and
resize listener. Calibrated per-photo fallback remains if CORS becomes unavailable.
Below perceptual brightness.43 use a restrained dark tint12-21% with light copy;
above it use a light tint52-56% and dark copy. The bright-side minimum protects
small legalcopy over mixed sky/grass frames. Transition material and copy with
the photo rather than applying a fixed brightness multiplier. No visible controls.
Current component467780365180874752, revision467783008032792576. No local app or
hosting changes. This is photo-responsive material, not an OS dark-mode switch.
