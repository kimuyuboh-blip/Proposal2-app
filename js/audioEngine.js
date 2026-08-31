/**
 * AudioEngine
 * Owns the three <audio> elements that live outside the page sections in
 * index.html. Because those elements are never removed from the DOM,
 * calling .play() once on the heartfelt track and simply leaving it alone
 * on every later "page change" (which is just a CSS show/hide, not a
 * navigation) is what gives the illusion of a persistent background track.
 * The song is chained to follow the heartfelt track: it starts a few
 * seconds after the heartfelt track ends, and any replay of the heartfelt
 * track cancels/stops it until that replay ends and the delay runs again.
 */
const AudioEngine = (() => {
  const instructions = document.getElementById('instructions-audio');
  const heartfelt = document.getElementById('heartfelt-audio');
  const song = document.getElementById('song-audio');

  const SONG_DELAY_MS = 3000;
  let heartfeltStarted = false;
  let songTimer = null;

  /** Cancels a pending delayed start and halts/resets the song. */
  function stopSong() {
    if (songTimer) {
      clearTimeout(songTimer);
      songTimer = null;
    }
    if (!song.paused) song.pause();
    song.currentTime = 0;
  }

  /** Queues the song to start SONG_DELAY_MS after the heartfelt track ends. */
  function scheduleSong() {
    stopSong();
    songTimer = setTimeout(() => {
      songTimer = null;
      song.play().catch(() => {});
    }, SONG_DELAY_MS);
  }

  // Every time the heartfelt track finishes — first play or any later
  // replay — line the song up to follow it after the same pause.
  heartfelt.addEventListener('ended', scheduleSong);

  function playInstructions() {
    instructions.currentTime = 0;
    // Give the heartfelt track the ~44s of instructions playback as a
    // buffering head start, instead of competing with instructions.m4a for
    // bandwidth at page load — that's what was making it start silently late.
    heartfelt.preload = 'auto';
    heartfelt.load();
    return instructions.play();
  }

  function onInstructionsEnded(callback) {
    instructions.addEventListener('ended', callback, { once: true });
  }

  /**
   * Starts the background track once; later calls are no-ops.
   * Returns whether playback actually started (vs. being blocked by the
   * browser's autoplay policy), so callers can surface a "tap to start" hint.
   */
  function startHeartfelt() {
    if (heartfeltStarted) return Promise.resolve(true);
    heartfeltStarted = true;
    heartfelt.currentTime = 0;
    // The heartfelt track runs ~2.5 minutes — plenty of runway to fetch the
    // song in the background well before it's actually needed.
    song.preload = 'auto';
    song.load();
    return heartfelt.play().then(
      () => true,
      () => {
        // Autoplay was blocked — reset so a later tap (e.g. the replay
        // button) can retry via replayHeartfelt().
        heartfeltStarted = false;
        return false;
      }
    );
  }

  function replayHeartfelt() {
    stopSong();
    heartfeltStarted = true;
    heartfelt.currentTime = 0;
    heartfelt.play();
  }

  function onHeartfeltEnded(callback) {
    heartfelt.addEventListener('ended', callback);
  }

  return {
    playInstructions,
    onInstructionsEnded,
    startHeartfelt,
    replayHeartfelt,
    onHeartfeltEnded,
  };
})();
