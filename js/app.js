/**
 * App
 * Wires together navigation between the 4 "pages" (sections toggled with
 * a CSS class, never actually unloaded), the per-page scratch canvases,
 * and the page-specific interactions (Play Me gating, the Yes/No question,
 * confetti, and the replay corner button).
 */
(() => {
  const pages = Array.from(document.querySelectorAll('.page'));
  const replayBtn = document.getElementById('replay-btn');
  const replayBtnLabel = document.getElementById('replay-btn-label');
  const pageDots = document.getElementById('page-dots');
  const dots = Array.from(document.querySelectorAll('.page-dot'));

  /** Short vibration cue for mobile; silently no-ops where unsupported. */
  function haptic(pattern = 15) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // Warm the image cache for later pages while the visitor is still on
  // page 1, so backgrounds don't pop in right as a scratch reveal finishes.
  ['assets/images/photo1.jpg', 'assets/images/loving.jpeg', 'assets/images/us.jpeg'].forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  function goToPage(pageNumber) {
    pages.forEach((section) => {
      section.classList.toggle('active', Number(section.dataset.page) === pageNumber);
    });
    replayBtn.hidden = pageNumber < 2;
    requestAnimationFrame(() => replayBtn.classList.toggle('is-visible', pageNumber >= 2));
    pageDots.hidden = pageNumber < 2;
    requestAnimationFrame(() => pageDots.classList.toggle('is-visible', pageNumber >= 2));
    dots.forEach((dot) => {
      dot.classList.toggle('is-active', Number(dot.dataset.dot) === pageNumber);
    });
  }

  replayBtn.addEventListener('click', () => {
    replayBtn.classList.remove('needs-tap');
    replayBtnLabel.textContent = 'Replay Voice Note';
    AudioEngine.replayHeartfelt();
  });

  AudioEngine.onHeartfeltEnded(() => {
    replayBtnLabel.textContent = 'Replay Voice Note';
  });

  // ---------------------------------------------------------------------
  // Page 1 — instructions gate
  // ---------------------------------------------------------------------
  const playMeBtn = document.getElementById('play-me-btn');
  const instructionsHint = document.getElementById('instructions-hint');
  const nextBtn1 = document.getElementById('next-btn-1');

  function startInstructions() {
    if (playMeBtn.classList.contains('is-playing') || playMeBtn.disabled) return;
    playMeBtn.classList.remove('needs-tap');
    playMeBtn.classList.add('is-playing');
    playMeBtn.querySelector('.btn__label').textContent = 'Playing…';
    instructionsHint.textContent = 'Listen closely…';
    AudioEngine.playInstructions().catch(() => {
      // Autoplay blocked (e.g. the scratch gesture didn't count as
      // direct user activation) — reset so the button tap can retry, and
      // pulse the button so it's obvious another tap is needed.
      playMeBtn.classList.remove('is-playing');
      playMeBtn.classList.add('needs-tap');
      playMeBtn.querySelector('.btn__label').textContent = 'Play Me';
      instructionsHint.textContent = 'Tap to listen';
    });
  }

  new ScratchCanvas(document.getElementById('scratch-1'), {
    shimmer: false,
    threshold: 0.7,
    label: 'Scratch the full screen to reveal',
    onThreshold: () => {
      instructionsHint.textContent = 'Tap to listen';
    },
  });

  playMeBtn.addEventListener('click', startInstructions);

  AudioEngine.onInstructionsEnded(() => {
    playMeBtn.disabled = true;
    playMeBtn.querySelector('.btn__label').textContent = 'Played';
    instructionsHint.textContent = '';
    nextBtn1.hidden = false;
    requestAnimationFrame(() => nextBtn1.classList.add('is-visible'));
  });

  nextBtn1.addEventListener('click', () => {
    goToPage(2);
    replayBtnLabel.textContent = 'Playing…';
    AudioEngine.startHeartfelt().then((started) => {
      if (!started) {
        replayBtnLabel.textContent = 'Tap to Play Voice Note';
        replayBtn.classList.add('needs-tap');
      }
    });
  });

  // ---------------------------------------------------------------------
  // Page 2 — photo + memory
  // ---------------------------------------------------------------------
  const nextBtn2 = document.getElementById('next-btn-2');
  new ScratchCanvas(document.getElementById('scratch-2'), {
    shimmer: true,
    threshold: 0.8,
    onThreshold: () => {
      haptic();
      nextBtn2.hidden = false;
      requestAnimationFrame(() => nextBtn2.classList.add('is-visible'));
    },
  });
  nextBtn2.addEventListener('click', () => goToPage(3));

  // ---------------------------------------------------------------------
  // Page 3 — layered quote reveal
  // ---------------------------------------------------------------------
  const nextBtn3 = document.getElementById('next-btn-3');
  new ScratchCanvas(document.getElementById('scratch-3'), {
    shimmer: true,
    threshold: 0.8,
    onThreshold: () => {
      haptic();
      nextBtn3.hidden = false;
      requestAnimationFrame(() => nextBtn3.classList.add('is-visible'));
    },
  });
  nextBtn3.addEventListener('click', () => goToPage(4));

  // ---------------------------------------------------------------------
  // Page 4 — the question
  // ---------------------------------------------------------------------
  const questionButtons = document.getElementById('question-buttons');
  const questionContent = document.getElementById('question-content');
  const victoryContent = document.getElementById('victory-content');
  const yesBtn = document.getElementById('yes-btn');

  new ScratchCanvas(document.getElementById('scratch-4'), {
    shimmer: true,
    threshold: 0.8,
    onThreshold: () => {
      haptic();
      questionButtons.hidden = false;
      requestAnimationFrame(() => questionButtons.classList.add('is-visible'));
    },
  });

  yesBtn.addEventListener('click', () => {
    haptic([20, 40, 20]);
    questionButtons.classList.remove('is-visible');
    questionContent.hidden = true;
    victoryContent.hidden = false;
    requestAnimationFrame(() => victoryContent.classList.add('is-visible'));
    ConfettiEffect.explode();
  });

  // Start on page 1.
  goToPage(1);
})();
