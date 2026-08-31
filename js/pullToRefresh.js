/**
 * PullToRefresh
 * The app locks page scrolling and every scratch canvas sets
 * touch-action: none (so a scratch gesture never scrolls the page), which
 * as a side effect disables the browser's native swipe-down-to-refresh.
 * This reimplements that gesture: starting a touch in a thin strip at the
 * very top of the screen and dragging down past a threshold reloads the
 * page. Registered on `window` with `capture: true` so it sees touches
 * before the target canvas's own (bubble-phase) listeners do, and calls
 * stopPropagation() to keep those hot-zone touches from also being read
 * as the start of a scratch stroke.
 */
(() => {
  const HOT_ZONE_PX = 56; // how close to the top edge a touch must start
  const THRESHOLD_PX = 72; // drag distance (after resistance) that triggers a refresh
  const MAX_TRAVEL_PX = 96; // how far the indicator is allowed to travel
  const RESISTANCE = 0.55; // makes the pull feel weighted, like native PTR

  const indicator = document.getElementById('ptr-indicator');
  if (!indicator) return;

  let tracking = false;
  let refreshing = false;
  let startY = 0;
  let pull = 0;

  function setPull(px) {
    pull = px;
    indicator.style.transform = `translate(-50%, ${px}px)`;
    indicator.classList.toggle('is-ready', px >= THRESHOLD_PX);
  }

  function reset() {
    tracking = false;
    indicator.classList.remove('is-dragging', 'is-ready', 'is-active');
    setPull(0);
  }

  function onTouchStart(e) {
    if (refreshing) return;
    const touch = e.touches[0];
    if (!touch || touch.clientY > HOT_ZONE_PX) return;
    tracking = true;
    startY = touch.clientY;
    setPull(0);
    indicator.classList.add('is-dragging', 'is-active');
    e.stopPropagation();
  }

  function onTouchMove(e) {
    if (!tracking) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const delta = touch.clientY - startY;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    e.preventDefault();
    setPull(Math.min(delta * RESISTANCE, MAX_TRAVEL_PX));
  }

  function onTouchEnd(e) {
    if (!tracking) return;
    e.stopPropagation();
    tracking = false;
    indicator.classList.remove('is-dragging');
    if (pull >= THRESHOLD_PX) {
      refreshing = true;
      indicator.classList.add('is-refreshing');
      indicator.classList.remove('is-ready');
      setPull(MAX_TRAVEL_PX * 0.6);
      // Brief pause so the spin is actually visible before navigation tears
      // the page down — matches the feel of native pull-to-refresh.
      setTimeout(() => window.location.reload(), 350);
    } else {
      reset();
    }
  }

  window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  window.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
  window.addEventListener('touchcancel', reset, { capture: true, passive: true });
})();
