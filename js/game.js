/**
 * Round loop: countdown -> "Ezberle!" -> playback -> player input -> pass or fail.
 *
 * Every async step carries the run token it started with. Anything that
 * interrupts a round (retry, replay, back to menu, a wrong tap) bumps the
 * token, so pending steps from the abandoned round return instead of touching
 * the DOM. Purely cosmetic timeouts deliberately stay outside that set — they
 * must still fire after an abort, or a button keeps its highlight forever.
 */
const Game = (() => {
  const LEAD_IN_MS = 260;
  const JUTSU_CUE_MS = 1200;
  const FAIL_REVEAL_MS = 950;
  const STRESS_FROM = 0.6; // share of the time limit before the pressure shows
  const TICK_SLOW_MS = 700;
  const TICK_FAST_MS = 180;
  const TICK_FROM = 0.35;

  const BEST_SCORE_KEY = 'true-seal:rekor-puan';
  const BEST_LEVEL_KEY = 'true-seal:rekor-seviye';

  const el = {};
  const timers = new Set();
  const buttons = new Map();

  let state = 'idle';
  let level = 1;
  let score = 0;
  let combo = 0;
  let longestCombo = 0;
  let sequence = [];
  let inputIndex = 0;
  let replaysLeft = Rules.REPLAY_ALLOWANCE;
  let replaysUsed = 0;
  let bestScore = 0;
  let bestLevel = 0;
  let runToken = 0;
  let countdownSource = null;
  let lastExpected = null;
  let onExit = () => {};

  // Input timer
  let inputStart = 0;
  let timeLimit = 0;
  let clockRaf = null;
  let nextTickAt = 0;

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

  function sleepUntil(deadline) {
    return sleep(Math.max(0, deadline - performance.now()));
  }

  function abortRun() {
    runToken += 1;
    timers.forEach(clearTimeout);
    timers.clear();
    stopCountdownSound();
    stopClock();
  }

  function stopCountdownSound() {
    if (!countdownSource) return;
    try {
      countdownSource.stop();
    } catch (err) {
      /* already finished */
    }
    countdownSource = null;
  }

  /* ---- record ---- */

  function readNumber(key) {
    try {
      return Number(localStorage.getItem(key)) || 0;
    } catch (err) {
      return 0;
    }
  }

  function writeNumber(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (err) {
      /* private mode — the record just does not survive the session */
    }
  }

  /* ---- rendering ---- */

  function setState(next) {
    state = next;
    el.hint.textContent = I18n.t(`hint.${next}`);
    const locked = next !== 'input';
    buttons.forEach((btn) => {
      btn.disabled = locked;
    });
    el.replayBtn.disabled = locked || replaysLeft <= 0;
  }

  function updateHud() {
    el.statLevel.textContent = String(level);
    el.statLength.textContent = String(Rules.lengthFor(level));
    el.statScore.textContent = score.toLocaleString(I18n.locale());
    el.comboChip.hidden = combo < 1;
    el.comboValue.textContent = String(combo);
  }

  function updateReplayUi() {
    el.replayCount.textContent = String(replaysLeft);
    el.replayBtn.disabled = state !== 'input' || replaysLeft <= 0;
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

  function resetDots() {
    [...el.dots.children].forEach((dot) => {
      dot.className = 'dot';
    });
  }

  function showScreenSeal(seal, animate) {
    el.screenImg.src = sealPaths.color(seal.id);
    el.screenImg.alt = I18n.t('seal.alt', { seal: sealLabel(seal) });
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
    el.screen.classList.remove('is-live', 'is-failed', 'is-success');
  }

  /** Cosmetic classes are cleared by hand because their timers can be aborted. */
  function clearButtonStates() {
    buttons.forEach((btn) => btn.classList.remove('is-hit', 'is-miss'));
    el.grid.classList.remove('is-error');
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
    el.flashImg.src = sealPaths.png(seal.id);
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
    // Deliberately not registered with `timers`: an abort must not strand it.
    setTimeout(() => btn.classList.remove(className), ms);
  }

  function popScore(points) {
    el.scorePop.textContent = `+${points.toLocaleString(I18n.locale())}`;
    el.scorePop.classList.remove('is-firing');
    void el.scorePop.offsetWidth;
    el.scorePop.classList.add('is-firing');
  }

  function burstCombo(streak) {
    el.comboText.textContent = I18n.t('cue.combo', { n: streak });
    el.comboBurst.dataset.heat = String(Math.min(streak, 6));
    el.comboBurst.classList.remove('is-firing');
    void el.comboBurst.offsetWidth;
    el.comboBurst.classList.add('is-firing');
  }

  function renderGameoverBody() {
    if (!lastExpected) return;
    const name = `${sealLabel(lastExpected)} (${lastExpected.romaji})`;
    const [before, after = ''] = I18n.t('over.body').split('{seal}');
    const strong = document.createElement('strong');
    strong.textContent = name;
    el.gameoverBody.replaceChildren(
      document.createTextNode(before),
      strong,
      document.createTextNode(after)
    );
  }

  /** Re-renders everything already on screen after a language switch. */
  function refreshLanguage() {
    el.hint.textContent = I18n.t(`hint.${state}`);
    buttons.forEach((btn, id) => {
      const seal = SEALS.find((item) => item.id === id);
      btn.setAttribute('aria-label', `${sealLabel(seal)} — ${seal.romaji}`);
      btn.querySelector('.seal-btn__label').textContent = sealShort(seal);
    });
    updateHud();
    renderGameoverBody();
    el.gameoverScore.textContent = score.toLocaleString(I18n.locale());
    el.gameoverBest.textContent = bestScore.toLocaleString(I18n.locale());
  }

  /* ---- input clock ---- */

  function startClock() {
    inputStart = performance.now();
    timeLimit = Rules.timeLimitMs(level);
    nextTickAt = timeLimit * TICK_FROM;
    el.timer.hidden = false;
    el.timer.classList.remove('is-hot', 'is-lost');
    el.timer.classList.toggle('is-guarded', combo >= 1);
    tickClock();
  }

  function tickClock() {
    const elapsed = performance.now() - inputStart;
    const urgency = Math.min(1, elapsed / timeLimit);
    el.timerFill.style.transform = `scaleX(${1 - urgency})`;

    if (urgency >= 1) {
      el.timer.classList.add('is-lost');
      el.timer.classList.remove('is-hot');
      el.panel.classList.remove('is-stress');
      if (combo > 0) {
        combo = 0; // the streak is gone the moment the limit passes
        updateHud();
        el.timer.classList.remove('is-guarded');
      }
    } else {
      const hot = urgency >= STRESS_FROM;
      el.timer.classList.toggle('is-hot', hot);
      // Only squeeze the player when there is a streak on the line.
      el.panel.classList.toggle('is-stress', hot && combo >= 1);

      if (elapsed >= nextTickAt) {
        AudioBus.playTick(urgency);
        const interval = TICK_SLOW_MS + (TICK_FAST_MS - TICK_SLOW_MS) * urgency;
        nextTickAt = elapsed + interval;
      }
    }

    clockRaf = requestAnimationFrame(tickClock);
  }

  function stopClock() {
    if (clockRaf !== null) cancelAnimationFrame(clockRaf);
    clockRaf = null;
    el.timer.hidden = true;
    el.timer.classList.remove('is-hot', 'is-lost', 'is-guarded');
    el.panel.classList.remove('is-stress');
  }

  /* ---- round ---- */

  async function playSequence(token) {
    setState('playback');
    el.screen.classList.add('is-live');
    await sleep(LEAD_IN_MS);
    if (token !== runToken) return false;

    const { showMs, gapMs } = Rules.timingFor(level);
    for (let i = 0; i < sequence.length; i += 1) {
      showScreenSeal(sequence[i], true);
      markDot(i, 'is-active');
      AudioBus.playClick();
      await sleep(showMs);
      if (token !== runToken) return false;

      clearScreen();
      markDot(i, null);
      await sleep(gapMs);
      if (token !== runToken) return false;
    }

    el.screen.classList.remove('is-live');
    return true;
  }

  function beginInput() {
    inputIndex = 0;
    resetDots();
    setState('input');
    updateReplayUi();
    startClock();
  }

  /** Back-to-back duplicates read as one long display, so they are skipped. */
  function buildSequence() {
    const out = [];
    for (let i = 0; i < Rules.lengthFor(level); i += 1) {
      let pick;
      do {
        pick = SEALS[Math.floor(Math.random() * SEALS.length)];
      } while (out.length && pick.id === out[out.length - 1].id);
      out.push(pick);
    }
    return out;
  }

  async function runLevel() {
    abortRun();
    const token = runToken;

    sequence = buildSequence();
    replaysLeft = Rules.REPLAY_ALLOWANCE;
    replaysUsed = 0;
    resetScreen();
    clearButtonStates();
    renderDots();
    updateHud();
    updateReplayUi();
    setState('countdown');

    const start = performance.now();
    countdownSource = AudioBus.playCountdown();

    for (let i = 0; i < COUNTDOWN_BEATS_MS.length; i += 1) {
      await sleepUntil(start + COUNTDOWN_BEATS_MS[i]);
      if (token !== runToken) return;
      showOverlay(String(COUNTDOWN_BEATS_MS.length - i), 'is-count');
    }

    await sleepUntil(start + COUNTDOWN_CUE_MS);
    if (token !== runToken) return;
    showOverlay(I18n.t('cue.memorise'), 'is-cue');

    await sleepUntil(start + COUNTDOWN_TOTAL_MS);
    if (token !== runToken) return;
    hideOverlay();
    countdownSource = null;

    if (await playSequence(token)) beginInput();
  }

  async function replay() {
    if (state !== 'input' || replaysLeft <= 0) return;
    replaysLeft -= 1;
    replaysUsed += 1;

    abortRun();
    const token = runToken;
    resetDots();
    updateReplayUi();

    if (await playSequence(token)) beginInput();
  }

  function succeed() {
    const elapsed = performance.now() - inputStart;
    const inTime = elapsed <= timeLimit;

    abortRun();
    setState('success');
    AudioBus.playJutsu();

    combo = inTime ? combo + 1 : 0;
    longestCombo = Math.max(longestCombo, combo);

    const result = Rules.levelScore({ level, elapsedMs: elapsed, replaysUsed, combo });
    score += result.total;

    el.screen.classList.add('is-success');
    popScore(result.total);

    // On a streak the burst is the celebration; the veiled cue would only
    // fight it for the same moment and the same middle of the screen.
    if (combo >= 2) {
      burstCombo(combo);
      AudioBus.playCombo(combo);
    } else {
      showOverlay(I18n.t('cue.jutsu'), 'is-cue is-jutsu');
    }

    level += 1;
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

    const isRecord = score > bestScore;
    if (isRecord) {
      bestScore = score;
      writeNumber(BEST_SCORE_KEY, bestScore);
    }
    if (level > bestLevel) {
      bestLevel = level;
      writeNumber(BEST_LEVEL_KEY, bestLevel);
    }

    combo = 0;
    updateHud();

    markDot(inputIndex, 'is-wrong');
    pulseButton(pressed.id, 'is-miss', 900);
    el.grid.classList.add('is-error');
    setTimeout(() => el.grid.classList.remove('is-error'), 420);

    el.screen.classList.remove('is-live');
    el.screen.classList.add('is-failed');
    showScreenSeal(expected, true);

    lastExpected = expected;

    later(() => {
      renderGameoverBody();
      el.gameoverLevel.textContent = String(level);
      el.gameoverScore.textContent = score.toLocaleString(I18n.locale());
      el.gameoverCombo.textContent = String(longestCombo);
      el.gameoverBest.textContent = bestScore.toLocaleString(I18n.locale());
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
      btn.setAttribute('aria-label', `${sealLabel(seal)} — ${seal.romaji}`);

      const img = document.createElement('img');
      img.className = 'seal-btn__img';
      img.src = sealPaths.color(seal.id);
      img.alt = '';

      const label = document.createElement('span');
      label.className = 'seal-btn__label';
      label.textContent = sealShort(seal);

      btn.append(img, label);
      btn.addEventListener('click', () => handlePress(seal));
      buttons.set(seal.id, btn);
      return btn;
    });

    el.grid.replaceChildren(...nodes);
  }

  function mount(handlers) {
    Object.assign(el, {
      panel: document.getElementById('game-panel'),
      screen: document.getElementById('seal-screen'),
      screenImg: document.getElementById('seal-screen-img'),
      dots: document.getElementById('progress-dots'),
      timer: document.getElementById('timer'),
      timerFill: document.getElementById('timer-fill'),
      hint: document.getElementById('stage-hint'),
      grid: document.getElementById('seal-grid'),
      replayBtn: document.getElementById('replay-btn'),
      replayCount: document.getElementById('replay-count'),
      overlay: document.getElementById('game-overlay'),
      overlayText: document.getElementById('overlay-text'),
      comboBurst: document.getElementById('combo-burst'),
      comboText: document.getElementById('combo-text'),
      comboChip: document.getElementById('combo-chip'),
      comboValue: document.getElementById('combo-value'),
      scorePop: document.getElementById('score-pop'),
      flash: document.getElementById('seal-flash'),
      flashImg: document.getElementById('seal-flash-img'),
      flashKana: document.getElementById('flash-kana'),
      flashRomaji: document.getElementById('flash-romaji'),
      gameover: document.getElementById('gameover'),
      gameoverBody: document.getElementById('gameover-body'),
      gameoverLevel: document.getElementById('gameover-level'),
      gameoverScore: document.getElementById('gameover-score'),
      gameoverCombo: document.getElementById('gameover-combo'),
      gameoverBest: document.getElementById('gameover-best'),
      gameoverRecord: document.getElementById('gameover-record'),
      retryBtn: document.getElementById('retry-btn'),
      menuBtn: document.getElementById('menu-btn'),
      statLevel: document.getElementById('stat-level'),
      statLength: document.getElementById('stat-length'),
      statScore: document.getElementById('stat-score')
    });

    onExit = handlers.onExit;
    bestScore = readNumber(BEST_SCORE_KEY);
    bestLevel = readNumber(BEST_LEVEL_KEY);
    renderButtons();
    updateHud();
    updateReplayUi();
    setState('idle');

    I18n.onChange(refreshLanguage);

    el.replayBtn.addEventListener('click', () => replay());
    el.retryBtn.addEventListener('click', () => start());
    el.menuBtn.addEventListener('click', () => {
      stop();
      onExit();
    });
  }

  function start() {
    el.gameover.hidden = true;
    lastExpected = null;
    level = 1;
    score = 0;
    combo = 0;
    longestCombo = 0;
    runLevel();
  }

  function stop() {
    abortRun();
    el.gameover.hidden = true;
    hideOverlay();
    resetScreen();
    clearButtonStates();
    el.dots.replaceChildren();
    combo = 0;
    updateHud();
    setState('idle');
  }

  return { mount, start, stop, getBestScore: () => bestScore, getBestLevel: () => bestLevel };
})();
