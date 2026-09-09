/**
 * The twelve hand seals, in traditional zodiac order.
 *
 * `id` doubles as the asset slug:
 *   assets/seals/png/<id>.png    transparent cut-out, shown as the click flash
 *   assets/seals/color/<id>.jpg  coloured tile, used on buttons and in the scroll
 *   assets/audio/names/<id>_<romaji lowercased>.wav
 */
const SEALS = [
  { id: 'fare', label: { tr: 'Fare', en: 'Rat' }, romaji: 'Ne', kana: 'ネ' },
  { id: 'okuz', label: { tr: 'Öküz', en: 'Ox' }, romaji: 'Ushi', kana: 'ウシ' },
  { id: 'kaplan', label: { tr: 'Kaplan', en: 'Tiger' }, romaji: 'Tora', kana: 'トラ' },
  { id: 'tavsan', label: { tr: 'Tavşan', en: 'Hare' }, romaji: 'U', kana: 'ウ' },
  { id: 'ejderha', label: { tr: 'Ejderha', en: 'Dragon' }, romaji: 'Tatsu', kana: 'タツ' },
  { id: 'yilan', label: { tr: 'Yılan', en: 'Snake' }, romaji: 'Mi', kana: 'ミ' },
  { id: 'at', label: { tr: 'At', en: 'Horse' }, romaji: 'Uma', kana: 'ウマ' },
  { id: 'koc', label: { tr: 'Koç', en: 'Ram' }, romaji: 'Hitsuji', kana: 'ヒツジ' },
  { id: 'maymun', label: { tr: 'Maymun', en: 'Monkey' }, romaji: 'Saru', kana: 'サル' },
  { id: 'kus', label: { tr: 'Kuş', en: 'Bird' }, romaji: 'Tori', kana: 'トリ' },
  { id: 'kopek', label: { tr: 'Köpek', en: 'Dog' }, romaji: 'Inu', kana: 'イヌ' },
  {
    id: 'domuz',
    label: { tr: 'Yaban Domuzu', en: 'Boar' },
    short: { tr: 'Domuz', en: 'Boar' },
    romaji: 'I',
    kana: 'イ'
  }
];

/** Full name in the current language. */
function sealLabel(seal) {
  return seal.label[I18n.get()] || seal.label.tr;
}

/** Shorter form for the buttons, where the tiles are narrow. */
function sealShort(seal) {
  const short = seal.short && seal.short[I18n.get()];
  return short || sealLabel(seal);
}

const sealPaths = {
  png(id) {
    return `assets/seals/png/${id}.png`;
  },
  color(id) {
    return `assets/seals/color/${id}.jpg`;
  },
  nameAudio(seal) {
    return `assets/audio/names/${seal.id}_${seal.romaji.toLowerCase()}.wav`;
  }
};

const CLICK_SOUND_COUNT = 10;

const clickSoundPaths = Array.from(
  { length: CLICK_SOUND_COUNT },
  (_, i) => `assets/audio/click/el_muhru_ses_${i + 1}.wav`
);

const JUTSU_SOUND_PATH = 'assets/audio/click/jutsu_aktivasyon_sesi.wav';
const COUNTDOWN_SOUND_PATH = 'assets/audio/ui/sayac_sesi.wav';

const START_SOUND_COUNT = 6;

/** One is picked at random whenever a run is started or retried. */
const startSoundPaths = Array.from(
  { length: START_SOUND_COUNT },
  (_, i) => `assets/audio/ui/baslat_ses_${i + 1}.mp3`
);

const GAMEOVER_SOUND_PATH = 'assets/audio/ui/muhur_bozuldu.mp3';

/** Loaded after the blocking preload — the game is playable without them. */
const MUSIC_PATHS = {
  hero: 'assets/audio/music/hero.mp3',
  game: 'assets/audio/music/game.mp3'
};

/**
 * Beat positions measured off the countdown recording's envelope, so the
 * digits land on the sound instead of on an arbitrary even split.
 * Three digits, then the "Ezberle!" cue on the fourth beat.
 */
const COUNTDOWN_BEATS_MS = [210, 1100, 2210];
const COUNTDOWN_CUE_MS = 3200;
const COUNTDOWN_TOTAL_MS = 4020;

/** Optional backdrops. Missing files simply leave the procedural background. */
const BACKGROUND_PATHS = {
  hero: 'assets/bg/hero.png',
  game: 'assets/bg/game.png'
};
