/**
 * Turkish / English copy.
 *
 * Static markup is translated through `data-i18n` attributes so the strings
 * stay in one place; anything rendered at runtime asks for a key with `t()`.
 * The chosen language is remembered, and falls back to the browser's own
 * preference on a first visit.
 */
const I18n = (() => {
  const STORE_KEY = 'true-seal:dil';
  const DEFAULT = 'tr';

  const DICT = {
    tr: {
      'meta.title': 'True Seal — El Mührü Hafıza Oyunu',
      'meta.description':
        'On iki el mührünü ezberle ve aynı sırayla ör. Dizi uzar, gösterim hızlanır, süre daralır. Kombo bozulmadan ne kadar ileri gidebilirsin?',

      'lang.aria': 'Dil seçimi',
      'hero.aria': 'Giriş',
      'hero.desc': 'On iki el mührü. Diziyi ezberle, aynı sırayla ör.',
      'hero.start': 'OYUNA BAŞLA',
      'hero.loadingAria': 'Varlıklar yükleniyor',
      'hero.loading': 'Mühürler hazırlanıyor… %{p}',
      'hero.loadFailed': '{n} dosya yüklenemedi — oyun yine de oynanabilir.',

      'game.aria': 'Oyun alanı',
      'game.back': 'Ana Menü',
      'game.level': 'Seviye',
      'game.seals': 'Mühür',
      'game.score': 'Puan',
      'game.combo': 'KOMBO',
      'game.gridAria': 'El mühürleri',
      'game.replay': 'Tekrar Göster',
      'game.muteOn': 'Sesi kapat',
      'game.muteOff': 'Sesi aç',

      'hint.idle': 'Diziyi bekle.',
      'hint.countdown': 'Hazır ol…',
      'hint.playback': 'İzle ve ezberle.',
      'hint.input': 'Şimdi aynı sırayla tekrarla.',
      'hint.success': 'Jutsu aktif.',
      'hint.gameover': 'Mühür bozuldu.',

      'cue.memorise': 'EZBERLE!',
      'cue.jutsu': 'JUTSU AKTİF',
      'cue.combo': 'KOMBO x{n}',

      'over.title': 'MÜHÜR BOZULDU',
      'over.body': 'Sıradaki mühür {seal} olmalıydı.',
      'over.score': 'Puan',
      'over.level': 'Seviye',
      'over.combo': 'En uzun kombo',
      'over.best': 'Rekor',
      'over.record': 'Yeni rekor!',
      'over.retry': 'Tekrar Dene',
      'over.menu': 'Ana Menü',

      'seal.alt': '{seal} mührü'
    },

    en: {
      'meta.title': 'True Seal — Hand Seal Memory Game',
      'meta.description':
        'Memorise the twelve hand seals and weave them back in order. The sequence grows, the playback speeds up, the clock tightens. How far can you go without breaking your combo?',

      'lang.aria': 'Language',
      'hero.aria': 'Intro',
      'hero.desc': 'Twelve hand seals. Memorise the sequence, weave it back in order.',
      'hero.start': 'START GAME',
      'hero.loadingAria': 'Loading assets',
      'hero.loading': 'Preparing the seals… {p}%',
      'hero.loadFailed': '{n} files failed to load — the game still works.',

      'game.aria': 'Game area',
      'game.back': 'Main Menu',
      'game.level': 'Level',
      'game.seals': 'Seals',
      'game.score': 'Score',
      'game.combo': 'COMBO',
      'game.gridAria': 'Hand seals',
      'game.replay': 'Show Again',
      'game.muteOn': 'Mute',
      'game.muteOff': 'Unmute',

      'hint.idle': 'Wait for the sequence.',
      'hint.countdown': 'Get ready…',
      'hint.playback': 'Watch and memorise.',
      'hint.input': 'Now repeat it in order.',
      'hint.success': 'Jutsu active.',
      'hint.gameover': 'The seal broke.',

      'cue.memorise': 'MEMORISE!',
      'cue.jutsu': 'JUTSU ACTIVE',
      'cue.combo': 'COMBO x{n}',

      'over.title': 'THE SEAL BROKE',
      'over.body': 'The next seal should have been {seal}.',
      'over.score': 'Score',
      'over.level': 'Level',
      'over.combo': 'Longest combo',
      'over.best': 'Best',
      'over.record': 'New record!',
      'over.retry': 'Try Again',
      'over.menu': 'Main Menu',

      'seal.alt': '{seal} seal'
    }
  };

  const LOCALES = { tr: 'tr-TR', en: 'en-US' };
  const listeners = [];
  let lang = DEFAULT;

  function read() {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored && DICT[stored]) return stored;
    } catch (err) {
      /* private mode — fall through to the browser preference */
    }
    return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }

  function write(next) {
    try {
      localStorage.setItem(STORE_KEY, next);
    } catch (err) {
      /* nothing to persist to — the choice still holds for this session */
    }
  }

  function t(key, vars) {
    const table = DICT[lang] || DICT[DEFAULT];
    let text = table[key] != null ? table[key] : DICT[DEFAULT][key];
    if (text == null) return key;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.split(`{${name}}`).join(String(vars[name]));
      });
    }
    return text;
  }

  /** Sweeps the document for translatable text, titles and labels. */
  function applyStatic(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  function apply() {
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = t('meta.description');
    applyStatic();
    listeners.forEach((fn) => fn(lang));
  }

  function set(next) {
    if (!DICT[next] || next === lang) return;
    lang = next;
    write(next);
    apply();
  }

  function init() {
    lang = read();
    apply();
  }

  return {
    init,
    set,
    apply,
    applyStatic,
    t,
    get: () => lang,
    locale: () => LOCALES[lang],
    onChange: (fn) => listeners.push(fn)
  };
})();
