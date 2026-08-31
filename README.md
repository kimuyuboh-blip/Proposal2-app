# Proposal2-app

A single-page, mobile-first "will you be my girlfriend" experience. The visitor
scratches away a metallic overlay on each of four screens to reveal a voice
note, a memory, a quote, and finally the question itself — with confetti,
haptics, and a chained audio soundtrack for the payoff.

No build step, no framework, no dependencies beyond one vendored script —
just `index.html`, plain CSS, and plain JS.

**Live:** https://kimuyuboh-blip.github.io/Proposal2-app/

## Running it locally

Because the app loads audio/image assets via relative paths, open it through
a local server rather than `file://`:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.

## How the experience flows

| Page | What happens |
|---|---|
| 1 — Instructions | Scratch the screen to reveal a "Play Me" button. Tapping it plays a spoken-instructions voice note. Once it finishes, a "Next" button appears. |
| 2 — Memory | A photo + short memory text, revealed by scratching. |
| 3 — Quote | A full-bleed photo with a layered quote reveal. |
| 4 — The question | Scratching reveals "Will you officially be my girlfriend?" with Yes/No buttons. Tapping "Yes" triggers a confetti burst and a victory screen with a personal sign-off line. |

Pages are never unloaded — navigation is just a CSS class toggle
(`.page.active`) — which is what lets the background audio keep playing
seamlessly as the visitor moves forward.

A page-progress dot indicator (bottom center) and a "Replay Voice Note"
corner button (top right) appear from page 2 onward.

## Audio behavior

Three `<audio>` elements live in `index.html`, outside the page sections, and
are owned by `js/audioEngine.js`:

- **`instructions-audio`** (`assets/audio/instructions.m4a`) — played on
  page 1 when "Play Me" is tapped.
- **`heartfelt-audio`** (`assets/audio/heartfelt_message.m4a`) — the main
  voice note. It starts automatically the moment the visitor moves to page 2,
  and can be replayed at any time via the corner button.
- **`song-audio`** (`assets/audio/song.mp3`) — a background song chained to
  follow the heartfelt track:
  - When the heartfelt track finishes, the song is scheduled to start
    **3 seconds later**.
  - If the heartfelt track is replayed while the song is playing or still in
    that 3-second countdown, the song immediately stops/resets and the
    pending start is cancelled.
  - Once that replay finishes, the same 3-second-delay-then-play sequence
    runs again.

If the browser blocks autoplay (common on mobile), the affected button
(`Play Me` or the corner replay button) relabels itself and pulses to invite
a manual tap.

## The scratch-to-reveal mechanic

`js/scratchCanvas.js` implements a reusable `ScratchCanvas` class: one
canvas per page, painted with a metallic gradient and (optionally) an
animated shimmer. Pointer/touch drags erase the overlay via
`destination-out` compositing; once the erased-pixel percentage crosses a
configurable `threshold`, the canvas fades out and stops intercepting
input, revealing the real content underneath.

Accessibility notes:
- Each canvas is keyboard-focusable and reveals immediately on
  <kbd>Enter</kbd> / <kbd>Space</kbd>, so the drag gesture isn't required.
- A short tap on an already-cleared spot is forwarded to whatever element
  sits beneath the canvas, since the canvas still intercepts hit-testing
  there otherwise.
- `prefers-reduced-motion` disables the shimmer animation loop and shortens
  page/element transitions app-wide.

## Other details

- **Confetti** is powered by a locally vendored copy of
  [`canvas-confetti`](https://github.com/catdad/canvas-confetti)
  (`js/vendor/confetti.browser.min.js`) — no third-party CDN dependency. A
  lighter single burst is used under `prefers-reduced-motion`.
- **Haptic feedback** (`navigator.vibrate`) fires on each scratch reveal and
  on tapping "Yes", where supported.
- **`[hidden]` is authoritative**: a global `[hidden] { display: none !important; }`
  rule in `css/style.css` ensures elements toggled via the `hidden` attribute
  are actually removed from layout/tab order, even where a class on the same
  element also sets `display`.
- Background images for pages 2–4, and the `heartfelt`/`song` audio tracks,
  are preloaded in stages tied to playback (image warm-up + heartfelt
  buffering start together with the instructions voice note; song buffering
  starts once heartfelt begins) rather than all at once on page 1 mount —
  so the initial load only has to fetch the instructions audio, keeping
  first paint fast on mobile connections.
- **Photos ship as WebP with a JPEG fallback** via `image-set()` in
  `css/style.css` (`.photo-memory`, `.photo-loving`, `.photo-us`) — roughly a
  third the size of the JPEGs at the same visual quality on browsers that
  support it, with the plain `url(...)` JPEG declaration kept first as the
  fallback for anything that doesn't.
- **Pull-to-refresh** (`js/pullToRefresh.js`) is reimplemented from scratch:
  every scratch canvas sets `touch-action: none` so scratching never scrolls
  the page, which as a side effect blocks the browser's native swipe-down
  gesture. A 56px hot zone at the top of the screen detects the same
  down-drag gesture and reloads the page past a threshold.
- **Installable as a home-screen app**: `manifest.json` + the
  `theme-color`/`apple-mobile-web-app-*` meta tags in `index.html` let mobile
  browsers tint their UI to match the page and offer "Add to Home Screen".
- **Offline app-shell caching** via `sw.js`: caches the static
  HTML/CSS/JS/images so a reload on a flaky connection doesn't break the
  page. Deliberately excludes `assets/audio/*` — `<audio>` elements issue
  HTTP range requests to seek/buffer, which the Cache API doesn't serve
  correctly, so audio is left to the network as normal.

## Customizing

| To change | Edit |
|---|---|
| Photos | `assets/images/photo1.jpg`, `loving.jpeg`, `us.jpeg` (swap files, same names, or update `index.html` background-image URLs) |
| Voice note / instructions / song | Replace files in `assets/audio/` (same filenames) or update the `src` attributes on the `<audio>` elements in `index.html` |
| Memory / quote / question text | Edit the text directly in `index.html` |
| Victory sign-off line | `.victory-signoff` paragraph in `index.html` (page 4) |
| Colors / fonts | CSS custom properties at the top of `css/style.css` (`:root`) |
| Scratch difficulty | `threshold` / `brushRadius` options passed to each `new ScratchCanvas(...)` in `js/app.js` |

## File structure

```
index.html              Markup for all four pages + shared audio elements
css/style.css            All styling, including reduced-motion and hidden-attribute rules
js/app.js                Page navigation, scratch canvas wiring, Yes/No + confetti + haptics
js/audioEngine.js        Owns the three <audio> elements and the song-chaining logic
js/scratchCanvas.js      Reusable scratch-to-reveal canvas component
js/confettiEffect.js     Thin wrapper around the vendored confetti library
js/pullToRefresh.js      Custom swipe-down-to-refresh gesture
js/vendor/               Vendored third-party scripts (confetti)
assets/images/           Photos used on pages 2-4, WebP variants, and app icons
assets/audio/            Voice notes + background song
manifest.json            Web app manifest (installable home-screen app)
sw.js                    Service worker — offline app-shell caching
```

## Browser support

Targets modern mobile and desktop browsers (Safari iOS, Chrome, Firefox,
Edge). Relies on the Canvas 2D API, `HTMLMediaElement`, and
`navigator.vibrate` (haptics silently no-op where unsupported).
