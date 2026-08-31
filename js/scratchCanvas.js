/**
 * ScratchCanvas
 * A reusable, touch-and-mouse scratch-off layer for a single <canvas>.
 * Draws a metallic overlay, erases it under the pointer via
 * destination-out compositing, and reports cleared progress by sampling
 * the alpha channel. When `threshold` is reached the canvas fades out
 * and stops intercepting pointer events, revealing whatever sits beneath
 * it in the DOM.
 */
class ScratchCanvas {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });

    this.threshold = options.threshold ?? 0.8;
    this.brushRadius = options.brushRadius ?? 32;
    this.shimmer = options.shimmer ?? false;
    this.label = options.label ?? 'Scratch to Reveal';
    this.onProgress = options.onProgress ?? (() => {});
    this.onThreshold = options.onThreshold ?? (() => {});

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.isPointerDown = false;
    this.cleared = false;
    this.lastPoint = null;
    this.gestureStart = null;
    this.rafId = null;
    this.progressCheckScheduled = false;
    this.shimmerPhase = 0;
    this.tapMoveTolerance = 10; // px — beyond this, a gesture counts as a scratch, not a tap

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._bindHandlers();
    this._resize();
    this._paintBase();
    this._attachEvents();
    this._makeKeyboardAccessible();

    window.addEventListener('resize', this._handleResize);
  }

  /** Resumes the shimmer loop; no-ops once cleared or if shimmer is disabled. */
  resumeShimmer() {
    if (this.cleared || !this.shimmer || this.prefersReducedMotion || this.rafId) return;
    this._startShimmerLoop();
  }

  /** Pauses the shimmer loop without clearing progress — for canvases on
   *  pages the visitor isn't currently viewing, so they don't burn main-
   *  thread time (and battery) redrawing something nobody can see. */
  pauseShimmer() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _bindHandlers() {
    this._handleResize = this._resize.bind(this);
    this._pointerDown = this._pointerDown.bind(this);
    this._pointerMove = this._pointerMove.bind(this);
    this._pointerUp = this._pointerUp.bind(this);
    this._touchStart = this._touchStart.bind(this);
    this._touchMove = this._touchMove.bind(this);
    this._touchEnd = this._touchEnd.bind(this);
    this._keyDown = this._keyDown.bind(this);
  }

  /** Lets keyboard/screen-reader users reveal the content without a drag gesture. */
  _makeKeyboardAccessible() {
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'button');
    this.canvas.setAttribute('aria-label', `${this.label} (press Enter to reveal)`);
    this.canvas.addEventListener('keydown', this._keyDown);
  }

  _keyDown(e) {
    if (this.cleared) return;
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    this.onProgress(1);
    this._clear();
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.cleared) this._paintBase();
  }

  _metallicGradient(offset = 0) {
    const { width, height } = this;
    const g = this.ctx.createLinearGradient(0, 0, width, height);
    const stops = [
      [0.0, '#b9bcc4'],
      [0.2, '#e9ecf3'],
      [0.35, '#8b8f99'],
      [0.5, '#d9b06c'],
      [0.65, '#f3e0b8'],
      [0.8, '#8b8f99'],
      [1.0, '#c7cad1'],
    ];
    stops.forEach(([stop, color]) => {
      const shifted = (stop + offset) % 1;
      g.addColorStop(Math.min(Math.max(shifted, 0), 1), color);
    });
    return g;
  }

  _paintBase() {
    const { ctx, width, height } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this._metallicGradient();
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `600 ${Math.max(14, Math.min(width, height) * 0.045)}px "Playfair Display", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this._drawWrappedLabel();
  }

  _drawWrappedLabel() {
    const { ctx, width, height } = this;
    const maxLineWidth = width * 0.85;
    const words = this.label.split(' ');
    const lines = [];
    let current = '';
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxLineWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);

    const lineHeight = Math.max(18, Math.min(width, height) * 0.06);
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });
  }

  _startShimmerLoop() {
    const step = () => {
      if (this.cleared) return;
      this.shimmerPhase = (this.shimmerPhase + 0.0025) % 1;
      const { ctx, width, height } = this;
      // source-atop only paints where existing pixels are opaque, so
      // scratched-away (transparent) areas are never repainted.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this._metallicGradient(this.shimmerPhase);
      ctx.fillRect(0, 0, width, height);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  _attachEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', this._pointerDown);
    window.addEventListener('mousemove', this._pointerMove);
    window.addEventListener('mouseup', this._pointerUp);
    c.addEventListener('touchstart', this._touchStart, { passive: false });
    c.addEventListener('touchmove', this._touchMove, { passive: false });
    c.addEventListener('touchend', this._touchEnd, { passive: false });
    c.addEventListener('touchcancel', this._touchEnd, { passive: false });
  }

  _localPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  _pointerDown(e) {
    if (this.cleared) return;
    this.isPointerDown = true;
    const p = this._localPoint(e.clientX, e.clientY);
    this.gestureStart = p;
    this._scratchAt(p.x, p.y);
    this.lastPoint = p;
  }

  _pointerMove(e) {
    if (!this.isPointerDown || this.cleared) return;
    const p = this._localPoint(e.clientX, e.clientY);
    this._scratchSegment(this.lastPoint, p);
    this.lastPoint = p;
  }

  _pointerUp(e) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    const p = this._localPoint(e.clientX, e.clientY);
    this._maybeForwardTap(p, e.clientX, e.clientY);
    this.lastPoint = null;
    this.gestureStart = null;
  }

  _touchStart(e) {
    if (this.cleared) return;
    e.preventDefault();
    this.isPointerDown = true;
    const t = e.touches[0];
    const p = this._localPoint(t.clientX, t.clientY);
    this.gestureStart = p;
    this._scratchAt(p.x, p.y);
    this.lastPoint = p;
  }

  _touchMove(e) {
    if (this.cleared) return;
    // Stop the page from scrolling while the user scratches on mobile.
    e.preventDefault();
    if (!this.isPointerDown) return;
    const t = e.touches[0];
    const p = this._localPoint(t.clientX, t.clientY);
    this._scratchSegment(this.lastPoint, p);
    this.lastPoint = p;
  }

  _touchEnd(e) {
    e.preventDefault();
    this.isPointerDown = false;
    const t = e.changedTouches[0];
    if (t) {
      const p = this._localPoint(t.clientX, t.clientY);
      this._maybeForwardTap(p, t.clientX, t.clientY);
    }
    this.lastPoint = null;
    this.gestureStart = null;
  }

  /**
   * A scratch canvas covers the full page, so even a spot the user has
   * already cleared still eats clicks meant for whatever is underneath
   * (canvas hit-testing doesn't know about per-pixel transparency). If
   * this gesture was a genuine tap (little movement) on an already-erased
   * pixel, forward it to the real element below instead of waiting for
   * the whole-canvas auto-clear threshold.
   */
  _maybeForwardTap(point, clientX, clientY) {
    if (this.cleared || !this.gestureStart) return;
    const dx = point.x - this.gestureStart.x;
    const dy = point.y - this.gestureStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > this.tapMoveTolerance) return;
    if (this._alphaAt(point.x, point.y) >= 32) return;

    const prevPointerEvents = this.canvas.style.pointerEvents;
    this.canvas.style.pointerEvents = 'none';
    const hit = document.elementFromPoint(clientX, clientY);
    this.canvas.style.pointerEvents = prevPointerEvents;

    if (!hit || hit === this.canvas) return;
    const clickable = hit.closest('button, a, [data-scratch-clickable]') || hit;
    clickable.click();
  }

  _alphaAt(x, y) {
    const px = Math.round(x * this.dpr);
    const py = Math.round(y * this.dpr);
    try {
      return this.ctx.getImageData(px, py, 1, 1).data[3];
    } catch (err) {
      return 255;
    }
  }

  _scratchAt(x, y) {
    const { ctx } = this;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, this.brushRadius, 0, Math.PI * 2);
    ctx.fill();
    this._scheduleProgressCheck();
  }

  _scratchSegment(from, to) {
    if (!from) {
      this._scratchAt(to.x, to.y);
      return;
    }
    const { ctx } = this;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.brushRadius * 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    this._scheduleProgressCheck();
  }

  _scheduleProgressCheck() {
    if (this.progressCheckScheduled) return;
    this.progressCheckScheduled = true;
    requestAnimationFrame(() => {
      this.progressCheckScheduled = false;
      this._checkProgress();
    });
  }

  _checkProgress() {
    if (this.cleared) return;
    const { ctx, width, height, dpr } = this;
    const stride = 4; // sample every 4th pixel on each axis for performance
    let data;
    try {
      data = ctx.getImageData(0, 0, Math.round(width * dpr), Math.round(height * dpr)).data;
    } catch (err) {
      return; // defensive: getImageData should not throw since this canvas
      // only ever draws gradients/text, never external images
    }
    const pxWidth = Math.round(width * dpr);
    const pxHeight = Math.round(height * dpr);
    let transparent = 0;
    let sampled = 0;
    for (let y = 0; y < pxHeight; y += stride) {
      for (let x = 0; x < pxWidth; x += stride) {
        const idx = (y * pxWidth + x) * 4 + 3;
        if (data[idx] < 32) transparent++;
        sampled++;
      }
    }
    const pct = sampled ? transparent / sampled : 0;
    this.onProgress(pct);
    if (pct >= this.threshold) {
      this._clear();
    }
  }

  _clear() {
    if (this.cleared) return;
    this.cleared = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.canvas.classList.add('is-cleared');
    this.canvas.tabIndex = -1;
    this.onThreshold();
    setTimeout(() => {
      this.canvas.classList.add('is-hidden');
    }, 650);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._handleResize);
    window.removeEventListener('mousemove', this._pointerMove);
    window.removeEventListener('mouseup', this._pointerUp);
    this.canvas.removeEventListener('keydown', this._keyDown);
  }
}
