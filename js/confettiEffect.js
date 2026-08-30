/**
 * ConfettiEffect
 * Thin wrapper around the canvas-confetti CDN library (loaded as
 * window.confetti) so the celebration burst is a single call from app.js.
 */
const ConfettiEffect = (() => {
  function explode() {
    if (typeof confetti !== 'function') return;

    const colors = ['#d9b06c', '#f3e0b8', '#c96a86', '#7a2740', '#f8f0e3'];

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 40, spread: 60, startVelocity: 20, origin: { y: 0.6 }, colors });
      return;
    }

    confetti({
      particleCount: 140,
      spread: 100,
      startVelocity: 45,
      origin: { y: 0.6 },
      colors,
    });

    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1 }, colors });
    }, 250);

    setTimeout(() => {
      confetti({ particleCount: 80, spread: 120, startVelocity: 35, origin: { y: 0.5 }, colors });
    }, 500);
  }

  return { explode };
})();
