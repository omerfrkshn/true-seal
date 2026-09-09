/**
 * Difficulty curve, time limits and scoring — everything that decides how hard
 * a level is and what clearing it is worth.
 *
 * Levels come in blocks of seven. The sequence grows by one seal per block, and
 * inside a block the playback accelerates along an eased curve: five roughly
 * comfortable levels, a tighter sixth, and a seventh that is meant to hurt.
 * Each new block hands back some of that speed, because the sequence just got
 * longer.
 */
const Rules = (() => {
  const BLOCK_SIZE = 7;
  const BASE_LENGTH = 3;
  const MAX_LENGTH = 12;

  const BLOCK_START_MS = 900; // first level of the first block
  const BLOCK_START_GAIN = 50; // each block starts this much faster
  const BLOCK_START_FLOOR = 560;
  const BLOCK_END_MS = 340; // last level of the first block
  const BLOCK_END_GAIN = 15;
  const BLOCK_END_FLOOR = 260;
  const ACCEL_EXPONENT = 1.9; // >1 keeps the early levels calm and bites late
  const GAP_RATIO = 0.28;

  const REPLAY_ALLOWANCE = 3;
  const REPLAY_PENALTY = 0.25; // share of the base score per replay used
  const SPEED_BONUS = 0.6; // share of the base score at instant completion
  const COMBO_STEP = 0.1;
  const COMBO_CAP = 10;

  const TIME_PER_SEAL_MS = 1000;
  const TIME_GRACE_MS = 1200;
  const TIME_SQUEEZE = 0.15; // the last level of a block gets this much less

  const blockOf = (level) => Math.floor((level - 1) / BLOCK_SIZE);
  const stepIn = (level) => (level - 1) % BLOCK_SIZE;
  const progressIn = (level) => stepIn(level) / (BLOCK_SIZE - 1);

  function lengthFor(level) {
    return Math.min(MAX_LENGTH, BASE_LENGTH + blockOf(level));
  }

  function timingFor(level) {
    const block = blockOf(level);
    const start = Math.max(BLOCK_START_FLOOR, BLOCK_START_MS - block * BLOCK_START_GAIN);
    const end = Math.max(BLOCK_END_FLOOR, BLOCK_END_MS - block * BLOCK_END_GAIN);
    const eased = Math.pow(progressIn(level), ACCEL_EXPONENT);
    const showMs = Math.round(start + (end - start) * eased);
    const gapMs = Math.min(250, Math.max(90, Math.round(showMs * GAP_RATIO)));
    return { showMs, gapMs };
  }

  /** How long the player has to enter the sequence before the combo breaks. */
  function timeLimitMs(level) {
    const budget = lengthFor(level) * TIME_PER_SEAL_MS + TIME_GRACE_MS;
    return Math.round(budget * (1 - TIME_SQUEEZE * progressIn(level)));
  }

  /**
   * `combo` is the streak *including* this level, so a first in-time clear
   * already pays 1.1x.
   */
  function levelScore({ level, elapsedMs, replaysUsed, combo }) {
    const base = 100 * lengthFor(level) + 25 * level;
    const limit = timeLimitMs(level);
    const speedRatio = Math.max(0, Math.min(1, 1 - elapsedMs / limit));
    const speedBonus = Math.round(base * SPEED_BONUS * speedRatio);
    const penalty = Math.round(base * REPLAY_PENALTY * replaysUsed);
    const multiplier = 1 + Math.min(combo, COMBO_CAP) * COMBO_STEP;
    const total = Math.max(0, Math.round((base + speedBonus - penalty) * multiplier));
    return { base, speedBonus, penalty, multiplier, total };
  }

  return {
    BLOCK_SIZE,
    REPLAY_ALLOWANCE,
    COMBO_CAP,
    blockOf,
    stepIn,
    lengthFor,
    timingFor,
    timeLimitMs,
    levelScore
  };
})();
