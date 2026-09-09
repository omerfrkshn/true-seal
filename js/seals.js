/**
 * The twelve hand seals, in traditional zodiac order.
 *
 * `id` doubles as the asset slug:
 *   assets/seals/png/<id>.png    transparent cut-out, shown as the click flash
 *   assets/seals/color/<id>.jpg  coloured tile, used on buttons and in the scroll
 *   assets/audio/names/<id>_<romaji lowercased>.wav
 */
const SEALS = [
  { id: 'fare', label: 'Fare', romaji: 'Ne', kana: 'ネ' },
  { id: 'okuz', label: 'Öküz', romaji: 'Ushi', kana: 'ウシ' },
  { id: 'kaplan', label: 'Kaplan', romaji: 'Tora', kana: 'トラ' },
  { id: 'tavsan', label: 'Tavşan', romaji: 'U', kana: 'ウ' },
  { id: 'ejderha', label: 'Ejderha', romaji: 'Tatsu', kana: 'タツ' },
  { id: 'yilan', label: 'Yılan', romaji: 'Mi', kana: 'ミ' },
  { id: 'at', label: 'At', romaji: 'Uma', kana: 'ウマ' },
  { id: 'koc', label: 'Koç', romaji: 'Hitsuji', kana: 'ヒツジ' },
  { id: 'maymun', label: 'Maymun', romaji: 'Saru', kana: 'サル' },
  { id: 'kus', label: 'Kuş', romaji: 'Tori', kana: 'トリ' },
  { id: 'kopek', label: 'Köpek', romaji: 'Inu', kana: 'イヌ' },
  { id: 'domuz', label: 'Yaban Domuzu', short: 'Domuz', romaji: 'I', kana: 'イ' }
];

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
