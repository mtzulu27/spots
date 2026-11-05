# Spots night access: background carousel

MagicPath component467777087168724992, revision467778532131639296.
Only the selected dark-glass proposal changes. Other style trials and the source
six-background comparison remain intact. Remove the top-left version label.

Reuse all six normalized photographic assets, starting on photo04. Crossfade1.4s
with a subtle2.5% scale settling over9s; no animation on the form or mark.
Keep the special photo04 crop on its own image, not on every fading image.
Six selection targets and an explicit pause/play button replace the comparison tray.
Auth state persists across background changes.

Auto-advance9s while enabled, visible and not focused in the auth region. Disable
initial autoplay for reduced motion; manual playback still uses instant changes.
Clean up matchMedia/visibility listeners and timeout on unmount. Only loaded,
non-failed photos can be selected. Skip broken photos and show an error if all fail.

Browser verification: all six images load; manual selection updates active dot;
automatic advancement observed; pause button changes to play; form stays fixed.
No app implementation, hosting deployment or persistent local process.
