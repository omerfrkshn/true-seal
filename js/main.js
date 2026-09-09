/**
 * Boots the page: drifting ink field on the landing panel, asset preloading,
 * and the horizontal slide between the two panels.
 */
(() => {
  const MUTE_KEY = 'muhur-hafizasi:sessiz';
  const SLIDE_MS = 900;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const track = document.getElementById('track');
  const heroPanel = document.getElementById('hero-panel');
  const gamePanel = document.getElementById('game-panel');
  const startBtn = document.getElementById('start-btn');
  const backBtn = document.getElementById('back-btn');
  const muteBtn = document.getElementById('mute-btn');
  const muteIcon = document.getElementById('mute-icon');
  const heroStatus = document.getElementById('hero-status');
  const heroBest = document.getElementById('hero-best');
  const loadingBar = heroStatus.querySelector('.loading-bar');
  const loadingFill = document.getElementById('loading-fill');
  const loadingText = document.getElementById('loading-text');

  let onGamePanel = false;
  let slideTimer = null;

  /* ---- landing ink field ---- */

  const ink = (() => {
    const canvas = document.getElementById('ink-canvas');
    const ctx = canvas.getContext('2d');
    const styles = getComputedStyle(document.documentElement);
    const warm = styles.getPropertyValue('--chakra-deep').trim();
    const cool = styles.getPropertyValue('--ink-600').trim();

    let width = 0;
    let height = 0;
    let motes = [];
    let raf = null;

    function spawn(seeded) {
      return {
        x: Math.random() * width,
        y: seeded ? Math.random() * height : height + Math.random() * 120,
        radius: 24 + Math.random() * 96,
        vx: (Math.random() - 0.5) * 0.14,
        vy: -(0.06 + Math.random() * 0.24),
        alpha: 0.05 + Math.random() * 0.13,
        warm: Math.random() < 0.4
      };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(54, (width * height) / 17000));
      motes = Array.from({ length: count }, () => spawn(true));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      motes.forEach((mote) => {
        const grad = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.radius);
        grad.addColorStop(0, mote.warm ? warm : cool);
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = mote.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function step() {
      motes.forEach((mote, i) => {
        mote.x += mote.vx;
        mote.y += mote.vy;
        if (mote.y + mote.radius < 0) motes[i] = spawn(false);
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
      ink.pause();
      slideTimer = setTimeout(() => Game.start(), settle);
    } else {
      Game.stop();
      ink.play();
      refreshHeroBest();
      slideTimer = setTimeout(() => startBtn.focus(), settle);
    }
  }

  /* ---- record + mute ---- */

  function refreshHeroBest() {
    const best = Game.getBest();
    heroBest.hidden = best < 1;
    if (best >= 1) {
      heroBest.innerHTML = `EN İYİ SEVİYE · <strong>${best}</strong>`;
    }
  }

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
    Game.mount({ onExit: () => setActivePanel(false) });
    gamePanel.inert = true;
    applyMute(readMute());
    refreshHeroBest();
    ink.play();

    const { failed } = await Preloader.run(setProgress);

    startBtn.disabled = false;
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
    if (document.hidden || onGamePanel) ink.pause();
    else ink.play();
  });

  boot();
})();
