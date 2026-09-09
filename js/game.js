/**
 * Round loop: countdown -> "Ezberle!" -> playback -> player input -> pass or fail.
 *
 * Every async step carries the run token it started with. Anything that
 * interrupts a round (retry, back to menu, a wrong tap) bumps the token, so
 * pending steps from the abandoned round return instead of touching the DOM.
 */
const Game = (() => {
  const BASE_LENGTH = 3;
  const MAX_LENGTH = 12;
  const BASE_SHOW_MS = 900;
  const MIN_SHOW_MS = 300;
  const SHOW_STEP_MS = 60;
  const BASE_GAP_MS = 250;
  const MIN_GAP_MS = 120;
  const GAP_STEP_MS = 15;

  const COUNTDOWN_STEP_MS = 780;
  const CUE_MS = 800;
  const LEAD_IN_MS = 260;
  const JUTSU_CUE_MS = 1100;
  const FAIL_REVEAL_MS = 950;

  const BEST_KEY = 'muhur-hafizasi:rekor';

  const HINTS = {
    idle: 'Diziyi bekle.',
    countdown: 'Hazır ol…',
    playback: 'İzle ve ezberle.',
    input: 'Şimdi aynı sırayla tekrarla.',
    success: 'Jutsu aktif. Sıradaki seviye geliyor…',
    gameover: 'Mühür bozuldu.'
  };

  const el = {};
  const timers = new Set();
  const buttons = new Map();

  let state = 'idle';
  let level = 1;
  let sequence = [];
  let inputIndex = 0;
  let best = 0;
  let runToken = 0;
  let onExit = () => {};

  /* ---- timing helpers ---- */

  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function sleep(ms) {
    return new Promise((resolve) => later(resolve, ms));
  }

  function abortRun() {
    runToken += 1;
    timers.forEach(clearTimeout);
    timers.clear();
  }

  /* ---- difficulty ---- */

  function lengthFor(lv) {
    return Math.min(MAX_LENGTH, BASE_LENGTH + lv - 1);
  }

  function timingFor(lv) {
    return {
      showMs: Math.max(MIN_SHOW_MS, BASE_SHOW_MS - (lv - 1) * SHOW_STEP_MS),
      gapMs: Math.max(MIN_GAP_MS, BASE_GAP_MS - (lv - 1) * GAP_STEP_MS)
    };
  }

  /** Back-to-back duplicates read as one long display, so they are skipped. */
  function buildSequence(lv) {
    const out = [];
    for (let i = 0; i < lengthFor(lv); i += 1) {
      let pick;
      do {
        pick = SEALS[Math.floor(Math.random() * SEALS.length)];
      } while (out.length && pick.id === out[out.length - 1].id);
      out.push(pick);
    }
    return out;
  }

  /* ---- record ---- */

  function readBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch (err) {
      return 0;
    }
  }

  function writeBest(value) {
    best = value;
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (err) {
      /* private mode — the record just does not survive the session */
    }
  }

  /* ---- rendering ---- */

  function setState(next) {
    state = next;
    el.hint.textContent = HINTS[next] || '';
    const locked = next !== 'input';
    buttons.forEach((btn) => {
      btn.disabled = locked;
    });
  }

  function updateHud() {
    el.statLevel.textContent = String(level);
    el.statLength.textContent = String(lengthFor(level));
    el.statBest.textContent = String(best);
  }

  function renderDots() {
    el.dots.replaceChildren(
      ...sequence.map(() => {
        const dot = document.createElement('span');
        dot.className = 'dot';
        return dot;
      })
    );
  }

  function markDot(index, className) {
    const dot = el.dots.children[index];
    if (!dot) return;
    dot.className = className ? `dot ${className}` : 'dot';
  }

  function showScreenSeal(seal, animate) {
    el.screenIdle.hidden = true;
    el.screenImg.src = sealPaths.color(seal.id);
    el.screenImg.alt = `${seal.label} mührü`;
    el.screenImg.hidden = false;
    if (!animate) return;
    el.screenImg.classList.remove('is-shown');
    void el.screenImg.offsetWidth; // force the animation to restart
    el.screenImg.classList.add('is-shown');
  }

  function clearScreen() {
    el.screenImg.hidden = true;
    el.screenImg.classList.remove('is-shown');
    el.screenImg.alt = '';
  }

  function resetScreen() {
    clearScreen();
    el.screenIdle.hidden = false;
    el.screen.classList.remove('is-live', 'is-failed', 'is-success');
  }

  function showOverlay(text, variant) {
    el.overlay.hidden = false;
    el.overlayText.className = 'game__overlay-text';
    void el.overlayText.offsetWidth; // restart the animation for repeat cues
    el.overlayText.textContent = text;
    el.overlayText.className = `game__overlay-text ${variant}`;
  }

  function hideOverlay() {
    el.overlay.hidden = true;
    el.overlayText.textContent = '';
  }

  /** The cut-out seal that blooms in the middle of the screen on every tap. */
  function flashSeal(seal) {
    el.flashImg.sizes = SEAL_FLASH_SIZES;
    el.flashImg.srcset = sealPaths.pngSrcset(seal.id);
    el.flashImg.src = sealPaths.pngFallback(seal.id);
    el.flashKana.textContent = seal.kana;
    el.flashRomaji.textContent = seal.romaji;
    el.flash.classList.remove('is-firing');
    void el.flash.offsetWidth;
    el.flash.classList.add('is-firing');
  }

  function pulseButton(id, className, ms) {
    const btn = buttons.get(id);
    if (!btn) return;
    btn.classList.add(className);
    later(() => btn.classList.remove(className), ms);
  }

  /* ---- round ---- */

  async function runLevel() {
    abortRun();
    const token = runToken;

    sequence = buildSequence(level);
    inputIndex = 0;
    resetScreen();
    renderDots();
    updateHud();
    setState('countdown');

    for (const tick of ['3', '2', '1']) {
      showOverlay(tick, 'is-count');
      await sleep(COUNTDOWN_STEP_MS);
      if (token !== runToken) return;
    }

    showOverlay('EZBERLE!', 'is-cue');
    await sleep(CUE_MS);
    if (token !== runToken) return;
    hideOverlay();

    setState('playback');
    el.screen.classList.add('is-live');
    await sleep(LEAD_IN_MS);
    if (token !== runToken) return;

    const { showMs, gapMs } = timingFor(level);
    for (let i = 0; i < sequence.length; i += 1) {
      showScreenSeal(sequence[i], true);
      markDot(i, 'is-active');
      AudioBus.playClick();
      await sleep(showMs);
      if (token !== runToken) return;

      clearScreen();
      markDot(i, null);
      await sleep(gapMs);
      if (token !== runToken) return;
    }

    el.screen.classList.remove('is-live');
    el.screenIdle.hidden = false;
    setState('input');
  }

  function succeed() {
    abortRun();
    setState('success');
    AudioBus.playJutsu();
    el.screen.classList.add('is-success');
    showOverlay('JUTSU AKTİF', 'is-cue is-jutsu');

    level += 1;
    if (level > best) writeBest(level);
    updateHud();

    later(() => {
      hideOverlay();
      runLevel();
    }, JUTSU_CUE_MS);
  }

  function fail(expected, pressed) {
    abortRun();
    setState('gameover');
    AudioBus.playError();

    const isRecord = level > best;
    if (isRecord) writeBest(level);
    updateHud();

    markDot(inputIndex, 'is-wrong');
    pulseButton(pressed.id, 'is-miss', 900);
    el.grid.classList.add('is-error');
    later(() => el.grid.classList.remove('is-error'), 420);

    el.screen.classList.remove('is-live');
    el.screen.classList.add('is-failed');
    showScreenSeal(expected, true);

    later(() => {
      el.gameoverCorrect.textContent = `${expected.label} (${expected.romaji})`;
      el.gameoverLevel.textContent = String(level);
      el.gameoverRecord.hidden = !isRecord;
      el.gameover.hidden = false;
      el.retryBtn.focus();
    }, FAIL_REVEAL_MS);
  }

  function handlePress(seal) {
    if (state !== 'input') return;

    AudioBus.playClick();
    flashSeal(seal);

    const expected = sequence[inputIndex];
    if (seal.id !== expected.id) {
      fail(expected, seal);
      return;
    }

    AudioBus.playName(seal);
    pulseButton(seal.id, 'is-hit', 320);
    markDot(inputIndex, 'is-done');
    inputIndex += 1;

    if (inputIndex === sequence.length) succeed();
  }

  /* ---- wiring ---- */

  function renderButtons() {
    const nodes = SEALS.map((seal) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seal-btn';
      btn.disabled = true;
      btn.setAttribute('aria-label', `${seal.label} — ${seal.romaji}`);

      const img = document.createElement('img');
      img.className = 'seal-btn__img';
      img.src = sealPaths.color(seal.id);
      img.alt = '';

      const label = document.createElement('span');
      label.className = 'seal-btn__label';
      label.textContent = seal.short || seal.label;

      btn.append(img, label);
      btn.addEventListener('click', () => handlePress(seal));
      buttons.set(seal.id, btn);
      return btn;
    });

    el.grid.replaceChildren(...nodes);
  }

  function mount(handlers) {
    Object.assign(el, {
      screen: document.getElementById('seal-screen'),
      screenImg: document.getElementById('seal-screen-img'),
      screenIdle: document.getElementById('seal-screen-idle'),
      dots: document.getElementById('progress-dots'),
      hint: document.getElementById('stage-hint'),
      grid: document.getElementById('seal-grid'),
      overlay: document.getElementById('game-overlay'),
      overlayText: document.getElementById('overlay-text'),
      flash: document.getElementById('seal-flash'),
      flashImg: document.getElementById('seal-flash-img'),
      flashKana: document.getElementById('flash-kana'),
      flashRomaji: document.getElementById('flash-romaji'),
      gameover: document.getElementById('gameover'),
      gameoverCorrect: document.getElementById('gameover-correct'),
      gameoverLevel: document.getElementById('gameover-level'),
      gameoverRecord: document.getElementById('gameover-record'),
      retryBtn: document.getElementById('retry-btn'),
      menuBtn: document.getElementById('menu-btn'),
      statLevel: document.getElementById('stat-level'),
      statLength: document.getElementById('stat-length'),
      statBest: document.getElementById('stat-best')
    });

    onExit = handlers.onExit;
    best = readBest();
    renderButtons();
    updateHud();
    setState('idle');

    el.retryBtn.addEventListener('click', () => start());
    el.menuBtn.addEventListener('click', () => {
      stop();
      onExit();
    });
  }

  function start() {
    el.gameover.hidden = true;
    level = 1;
    runLevel();
  }

  function stop() {
    abortRun();
    el.gameover.hidden = true;
    hideOverlay();
    resetScreen();
    el.dots.replaceChildren();
    el.grid.classList.remove('is-error');
    setState('idle');
  }

  return { mount, start, stop, getBest: () => best };
})();
