/**
 * Web Audio bus.
 *
 * A correct tap fires two clips at once (the generic hand-seal whoosh plus the
 * Japanese name), so decoded buffers are used instead of <audio> elements —
 * overlapping playback and retriggering are free that way.
 *
 * Three effects have no recording behind them and are synthesised here: the
 * failure sound, the combo chime, and the tick that speeds up as a level's
 * time limit runs out.
 *
 * Music runs through its own sub-bus so the loops sit under the effects, and
 * swapping tracks crossfades rather than cutting.
 */
const AudioBus = (() => {
  const MUSIC_LEVEL = 0.32;
  const MUSIC_FADE_MS = 900;

  const buffers = new Map();
  /** Last pick per random pool, so the same clip never fires twice in a row. */
  const lastPicks = new Map();
  let ctx = null;
  let master = null;
  let musicBus = null;
  let currentMusic = null;
  let muted = false;

  function init() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_LEVEL;
    musicBus.connect(master);
    return ctx;
  }

  /** Browsers keep the context suspended until a real gesture happens. */
  function unlock() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function state() {
    return ctx ? ctx.state : 'unavailable';
  }

  async function load(key, url) {
    if (!ctx) return;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ses yuklenemedi: ${url}`);
    const raw = await res.arrayBuffer();
    const decoded = await new Promise((resolve, reject) => {
      // The callback form is kept for older Safari, which does not return a promise.
      const maybePromise = ctx.decodeAudioData(raw, resolve, reject);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(resolve, reject);
      }
    });
    buffers.set(key, decoded);
  }

  function play(key, { gain = 1, rate = 1, delay = 0 } = {}) {
    if (muted || !ctx || !buffers.has(key)) return null;
    unlock();
    const source = ctx.createBufferSource();
    source.buffer = buffers.get(key);
    source.playbackRate.value = rate;
    const vol = ctx.createGain();
    vol.gain.value = gain;
    source.connect(vol).connect(master);
    source.start(ctx.currentTime + delay);
    return source;
  }

  /** Picks from a numbered pool, avoiding an immediate repeat. */
  function playRandom(prefix, count, gain) {
    const keys = [];
    for (let i = 0; i < count; i += 1) {
      const key = `${prefix}:${i}`;
      if (buffers.has(key)) keys.push(key);
    }
    if (!keys.length) return;
    let key = keys[Math.floor(Math.random() * keys.length)];
    if (keys.length > 1 && key === lastPicks.get(prefix)) {
      key = keys[(keys.indexOf(key) + 1) % keys.length];
    }
    lastPicks.set(prefix, key);
    play(key, { gain });
  }

  /** Random hand-seal whoosh. */
  function playClick() {
    playRandom('click', clickSoundPaths.length, 0.85);
  }

  /** Random shout when a run is started or retried. */
  function playStart() {
    playRandom('start', startSoundPaths.length, 1);
  }

  /** The string sting that lands with the "seal broke" card. */
  function playGameover() {
    play('gameover', { gain: 1 });
  }

  function playName(seal) {
    play(`name:${seal.id}`, { gain: 1 });
  }

  function playJutsu() {
    play('jutsu', { gain: 1 });
  }

  /** Returns the source so the caller can cut it short if the round aborts. */
  function playCountdown() {
    return play('countdown', { gain: 0.9 });
  }

  function playError() {
    if (muted || !ctx) return;
    unlock();
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.5);
    filter.Q.value = 6;

    const body = ctx.createGain();
    body.gain.setValueAtTime(0.0001, now);
    body.gain.exponentialRampToValueAtTime(0.42, now + 0.02);
    body.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    filter.connect(body).connect(master);

    [
      { type: 'sawtooth', from: 196, to: 52, detune: 0 },
      { type: 'square', from: 146, to: 41, detune: -18 }
    ].forEach(({ type, from, to, detune }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(to, now + 0.5);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 0.58);
    });

    noiseBurst(now, 0.12, 900, 0.3, 0.14);
  }

  /** Bright metallic ring, brighter as the streak gets longer. */
  function playCombo(streak) {
    if (muted || !ctx) return;
    unlock();
    const now = ctx.currentTime;
    const step = Math.min(streak, 8);
    const root = 520 * Math.pow(2, step / 12);

    [1, 1.5, 2.02].forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(root * ratio, now);
      osc.frequency.exponentialRampToValueAtTime(root * ratio * 1.35, now + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.2 / (i + 1), now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 0.65);
    });

    noiseBurst(now, 0.18, 4200, 0.16, 0.2);
  }

  /**
   * Clock tick during input. `urgency` (0..1) raises the pitch and level so the
   * last stretch before the time limit actually feels like pressure.
   */
  function playTick(urgency = 0) {
    if (muted || !ctx) return;
    unlock();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(760 + urgency * 620, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.035 + urgency * 0.075, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 2;
    osc.connect(band).connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** Shared shaped-noise helper for the synthesised effects. */
  function noiseBurst(at, seconds, centre, level, decay) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = centre;
    band.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    source.connect(band).connect(g).connect(master);
    source.start(at);
  }

  /* ---- music ---- */

  function fadeOutTrack(track, seconds) {
    const now = ctx.currentTime;
    const level = track.gain.gain;
    level.cancelScheduledValues(now);
    level.setValueAtTime(Math.max(level.value, 0.0001), now);
    level.exponentialRampToValueAtTime(0.0001, now + seconds);
    track.source.stop(now + seconds + 0.05);
  }

  /**
   * Starts a looping track, crossfading out whatever was playing. Muting only
   * pulls the master down, so the loop keeps its place and comes straight back.
   */
  function playMusic(key, { fadeMs = MUSIC_FADE_MS } = {}) {
    if (!ctx || !buffers.has(key)) return;
    if (currentMusic && currentMusic.key === key) return;
    unlock();

    const seconds = fadeMs / 1000;
    if (currentMusic) fadeOutTrack(currentMusic, seconds);

    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffers.get(key);
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(1, now + seconds);
    source.connect(gain).connect(musicBus);
    source.start(now);
    currentMusic = { key, source, gain };
  }

  function stopMusic({ fadeMs = MUSIC_FADE_MS } = {}) {
    if (!currentMusic) return;
    fadeOutTrack(currentMusic, fadeMs / 1000);
    currentMusic = null;
  }

  function setMuted(next) {
    muted = next;
    if (master) master.gain.value = next ? 0 : 1;
  }

  function isMuted() {
    return muted;
  }

  return {
    init,
    unlock,
    state,
    load,
    play,
    playClick,
    playStart,
    playName,
    playJutsu,
    playCountdown,
    playGameover,
    playError,
    playCombo,
    playTick,
    playMusic,
    stopMusic,
    setMuted,
    isMuted
  };
})();
