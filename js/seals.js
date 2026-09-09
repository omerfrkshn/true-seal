/**
 * The twelve hand seals, in traditional zodiac order.
 *
 * `id` doubles as the asset slug:
 *   assets/seals/png/<id>-320.png   transparent cut-out, shown as the click flash
 *   assets/seals/color/<id>.jpg     coloured tile, used on buttons and in the sequence screen
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

/** Two rendered widths ship for every cut-out; the browser picks one via srcset. */
const SEAL_PNG_WIDTHS = [320, 640];

const sealPaths = {
  pngSrcset(id) {
    return SEAL_PNG_WIDTHS.map((w) => `assets/seals/png/${id}-${w}.png ${w}w`).join(', ');
  },
  pngFallback(id) {
    return `assets/seals/png/${id}-${SEAL_PNG_WIDTHS[0]}.png`;
  },
  color(id) {
    return `assets/seals/color/${id}.jpg`;
  },
  nameAudio(seal) {
    return `assets/audio/names/${seal.id}_${seal.romaji.toLowerCase()}.wav`;
  }
};

/** Sizes attribute for the click flash, matching the CSS width of `.seal-flash__img`. */
const SEAL_FLASH_SIZES = '(max-width: 640px) 62vw, 340px';

const CLICK_SOUND_COUNT = 10;

const clickSoundPaths = Array.from(
  { length: CLICK_SOUND_COUNT },
  (_, i) => `assets/audio/click/el_muhru_ses_${i + 1}.wav`
);

const JUTSU_SOUND_PATH = 'assets/audio/click/jutsu_aktivasyon_sesi.wav';
