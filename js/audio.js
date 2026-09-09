/**
 * Web Audio bus.
 *
 * A correct tap fires two clips at once (the generic hand-seal whoosh plus the
 * Japanese name), so decoded buffers are used instead of <audio> elements —
 * overlapping playback and retriggering are free that way.
 *
 * The failure sound is synthesised rather than loaded: a detuned pair of
 * oscillators sliding downwards, plus a short noise crack.
 */
const AudioBus = (() => {
  const buffers = new Map();
  let ctx = null;
  let master = null;
  let muted = false;
  let lastClickKey = null;

  function init() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    return ctx;
  }

  /** Browsers keep the context suspended until a real gesture happens. */
  function unlock() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
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

  /** Random hand-seal whoosh, never the same one twice in a row. */
  function playClick() {
    const keys = clickSoundPaths.map((_, i) => `click:${i}`).filter((k) => buffers.has(k));
    if (!keys.length) return;
    let key = keys[Math.floor(Math.random() * keys.length)];
    if (keys.length > 1 && key === lastClickKey) {
      key = keys[(keys.indexOf(key) + 1) % keys.length];
    }
    lastClickKey = key;
    play(key, { gain: 0.85 });
  }

  function playName(seal) {
    play(`name:${seal.id}`, { gain: 1 });
  }

  function playJutsu() {
    play('jutsu', { gain: 1 });
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

    // Short crack on the attack so the failure reads as a snap, not just a drone.
    const noiseLength = Math.floor(ctx.sampleRate * 0.12);
    const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / noiseLength);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseBand = ctx.createBiquadFilter();
    noiseBand.type = 'bandpass';
    noiseBand.frequency.value = 900;
    noiseBand.Q.value = 1.2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    noise.connect(noiseBand).connect(noiseGain).connect(master);
    noise.start(now);
  }

  function setMuted(next) {
    muted = next;
    if (master) master.gain.value = next ? 0 : 1;
  }

  function isMuted() {
    return muted;
  }

  return { init, unlock, load, play, playClick, playName, playJutsu, playError, setMuted, isMuted };
})();
