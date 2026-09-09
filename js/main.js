/**
 * Boots the page: builds the animated title, runs the landing intro, drives the
 * mouse parallax and the ember field, and slides between the two panels.
 *
 * The intro itself is pure CSS — this file only stamps the letters out and adds
 * the class that starts the timeline, so the sequencing lives next to the
 * styles it animates.
 */
(() => {
  const MUTE_KEY = 'true-seal:sessiz';
  const SLIDE_MS = 900;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const track = document.getElementById('track');
  const heroPanel = document.getElementById('hero-panel');
  const gamePanel = document.getElementById('game-panel');
  const heroContent = document.getElementById('hero-content');
  const heroTitle = document.getElementById('hero-title');
  const heroArt = document.getElementById('hero-art');
  const heroHaze = document.getElementById('hero-haze');
  const heroTorch = document.getElementById('hero-torch');
  const gameArt = document.getElementById('game-art');
  const startBtn = document.getElementById('start-btn');
  const backBtn = document.getElementById('back-btn');
  const muteBtn = document.getElementById('mute-btn');
  const muteIcon = document.getElementById('mute-icon');
  const heroStatus = document.getElementById('hero-status');
  const loadingBar = heroStatus.querySelector('.loading-bar');
  const loadingFill = document.getElementById('loading-fill');
  const loadingText = document.getElementById('loading-text');

  let onGamePanel = false;
  let slideTimer = null;

  /* ---- title ---- */

  /**
   * Two stacked copies of the name: an outline that draws in letter by letter,
   * and a filled copy that floods across once the outline has landed.
   */
  function buildTitle() {
    const text = heroTitle.dataset.text || '';
    const layer = (modifier) => {
      const wrap = document.createElement('span');
      wrap.className = `title__layer title__layer--${modifier}`;
      wrap.setAttribute('aria-hidden', 'true');
      [...text].forEach((char, i) => {
        const span = document.createElement('span');
        span.className = char === ' ' ? 'title__char title__char--space' : 'title__char';
        span.style.setProperty('--i', String(i));
        span.textContent = char === ' ' ? ' ' : char;
        wrap.append(span);
      });
      return wrap;
    };

    const sweep = document.createElement('span');
    sweep.className = 'title__sweep';
    sweep.setAttribute('aria-hidden', 'true');

    heroTitle.append(layer('stroke'), layer('fill'), sweep);
  }

  /* ---- ember field ---- */

  const embers = (() => {
    const canvas = document.getElementById('ember-canvas');
    const ctx = canvas.getContext('2d');
    const styles = getComputedStyle(document.documentElement);
    const warm = styles.getPropertyValue('--chakra').trim();
    const cool = styles.getPropertyValue('--chakra-deep').trim();

    let width = 0;
    let height = 0;
    let motes = [];
    let raf = null;

    function spawn(seeded) {
      return {
        x: Math.random() * width,
        y: seeded ? Math.random() * height : height + Math.random() * 80,
        radius: 1 + Math.random() * 2.6,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.14 + Math.random() * 0.42),
        alpha: 0.25 + Math.random() * 0.55,
        drift: Math.random() * Math.PI * 2,
        warm: Math.random() < 0.65
      };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (width * height) / 12000));
      motes = Array.from({ length: count }, () => spawn(true));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      motes.forEach((mote) => {
        const glow = mote.radius * 5;
        const grad = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, glow);
        grad.addColorStop(0, mote.warm ? warm : cool);
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = mote.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, glow, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function step() {
      motes.forEach((mote, i) => {
        mote.drift += 0.014;
        mote.x += mote.vx + Math.sin(mote.drift) * 0.24;
        mote.y += mote.vy;
        if (mote.y + mote.radius * 5 < 0) motes[i] = spawn(false);
      });
      draw();
      raf = requestAnimationFrame(step);
    }

    function play() {
      if (raf !== null || reduceMotion) return;
      raf = requestAnimationFrame(step);
    }

    function pause() {
      if (raf === null) return;
      cancelAnimationFrame(raf);
      raf = null;
    }

    resize();
    draw();
    window.addEventListener('resize', () => {
      resize();
      draw();
    });

    return { play, pause };
  })();

  /* ---- mouse parallax ---- */

  const parallax = (() => {
    // Target vs. current, eased every frame, so the layers trail the cursor.
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let pointerX = 0;
    let pointerY = 0;
    let raf = null;

    function onMove(event) {
      const rect = heroPanel.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      targetX = pointerX / rect.width - 0.5;
      targetY = pointerY / rect.height - 0.5;
      if (raf === null) raf = requestAnimationFrame(step);
    }

    function step() {
      x += (targetX - x) * 0.075;
      y += (targetY - y) * 0.075;

      heroArt.style.transform = `scale(1.08) translate3d(${x * -34}px, ${y * -26}px, 0)`;
      heroHaze.style.transform = `translate3d(${x * 18}px, ${y * 14}px, 0)`;
      heroContent.style.transform = `translate3d(${x * -10}px, ${y * -8}px, 0)`;
      heroTorch.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;

      if (Math.abs(targetX - x) > 0.0008 || Math.abs(targetY - y) > 0.0008) {
        raf = requestAnimationFrame(step);
      } else {
        raf = null;
      }
    }

    function enable() {
      if (reduceMotion) return;
      heroPanel.addEventListener('pointermove', onMove);
    }

    function disable() {
      heroPanel.removeEventListener('pointermove', onMove);
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    }

    return { enable, disable };
  })();

  /* ---- panel slide ---- */

  function setActivePanel(toGame) {
    onGamePanel = toGame;
    track.classList.toggle('is-game', toGame);
    // `inert` keeps the off-screen panel out of tab order and the a11y tree.
    heroPanel.inert = toGame;
    gamePanel.inert = !toGame;

    clearTimeout(slideTimer);
    const settle = reduceMotion ? 0 : SLIDE_MS;

    if (toGame) {
      embers.pause();
      parallax.disable();
      slideTimer = setTimeout(() => Game.start(), settle);
    } else {
      Game.stop();
      embers.play();
      parallax.enable();
      slideTimer = setTimeout(() => startBtn.focus(), settle);
    }
  }

  /* ---- mute ---- */

  function applyMute(next) {
    AudioBus.setMuted(next);
    muteBtn.setAttribute('aria-pressed', String(next));
    muteBtn.title = next ? 'Sesi aç' : 'Sesi kapat';
    muteIcon.textContent = next ? '◌' : '◉';
    muteBtn.querySelector('.sr-only').textContent = next ? 'Sesi aç' : 'Sesi kapat';
    try {
      localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch (err) {
      /* nothing to persist to — the toggle still works for this session */
    }
  }

  function readMute() {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  /* ---- boot ---- */

  function setProgress(ratio) {
    const percent = Math.round(ratio * 100);
    loadingFill.style.width = `${percent}%`;
    loadingBar.setAttribute('aria-valuenow', String(percent));
    loadingText.textContent = `Mühürler hazırlanıyor… %${percent}`;
  }

  async function boot() {
    buildTitle();
    Game.mount({ onExit: () => setActivePanel(false) });
    gamePanel.inert = true;
    applyMute(readMute());
    embers.play();
    parallax.enable();
    heroPanel.classList.add('is-playing');

    // Backdrops are optional, so they are applied whenever they turn up.
    Preloader.backgrounds().then((art) => {
      if (art.hero) {
        heroArt.style.backgroundImage = `url("${art.hero}")`;
        heroPanel.classList.add('has-art');
      }
      if (art.game) {
        gameArt.style.backgroundImage = `url("${art.game}")`;
        gamePanel.classList.add('has-art');
      }
    });

    const { failed } = await Preloader.run(setProgress);

    startBtn.disabled = false;
    startBtn.classList.add('is-armed');
    if (failed > 0) {
      loadingText.textContent = `${failed} dosya yüklenemedi — oyun yine de oynanabilir.`;
      loadingText.classList.add('is-warning');
    } else {
      heroStatus.classList.add('is-done');
    }
  }

  startBtn.addEventListener('click', () => {
    AudioBus.unlock();
    setActivePanel(true);
  });

  backBtn.addEventListener('click', () => setActivePanel(false));

  muteBtn.addEventListener('click', () => {
    AudioBus.unlock();
    applyMute(!AudioBus.isMuted());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && onGamePanel) setActivePanel(false);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || onGamePanel) embers.pause();
    else embers.play();
  });

  boot();
})();
