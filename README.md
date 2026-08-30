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
- Background images for pages 2–4 are preloaded as soon as page 1 mounts, so
  they don't pop in mid-reveal.

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
js/vendor/               Vendored third-party scripts (confetti)
assets/images/           Photos used on pages 2-4
assets/audio/            Voice notes + background song
```

## Browser support

Targets modern mobile and desktop browsers (Safari iOS, Chrome, Firefox,
Edge). Relies on the Canvas 2D API, `HTMLMediaElement`, and
`navigator.vibrate` (haptics silently no-op where unsupported).
