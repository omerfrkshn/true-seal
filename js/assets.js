/**
 * Everything is fetched and decoded before the game becomes playable, so a
 * sequence never stalls mid-playback waiting on a file. The seal cut-outs ship
 * at full resolution, which is the bulk of the wait.
 */
const Preloader = (() => {
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Gorsel yuklenemedi: ${src}`));
      img.src = src;
    });
  }

  function tasks() {
    const list = [];

    SEALS.forEach((seal) => {
      list.push(() => loadImage(sealPaths.png(seal.id)));
      list.push(() => loadImage(sealPaths.color(seal.id)));
    });

    if (AudioBus.init()) {
      clickSoundPaths.forEach((path, i) => list.push(() => AudioBus.load(`click:${i}`, path)));
      list.push(() => AudioBus.load('jutsu', JUTSU_SOUND_PATH));
      list.push(() => AudioBus.load('countdown', COUNTDOWN_SOUND_PATH));
      SEALS.forEach((seal) => list.push(() => AudioBus.load(`name:${seal.id}`, sealPaths.nameAudio(seal))));
    }

    return list;
  }

  /**
   * Resolves once every asset settled. A single missing file degrades that one
   * effect rather than blocking the game, but the count comes back so the
   * caller can say something about it.
   */
  async function run(onProgress) {
    const list = tasks();
    let done = 0;
    let failed = 0;

    await Promise.all(
      list.map((task) =>
        task()
          .catch((err) => {
            failed += 1;
            console.warn(err);
          })
          .finally(() => {
            done += 1;
            onProgress(done / list.length);
          })
      )
    );

    return { total: list.length, failed };
  }

  /**
   * Backdrops are optional by design: until the artwork exists the panels fall
   * back to their procedural background, so a missing file is not a failure.
   */
  async function backgrounds() {
    const entries = await Promise.all(
      Object.entries(BACKGROUND_PATHS).map(([key, src]) =>
        loadImage(src).then(
          () => [key, src],
          () => [key, null]
        )
      )
    );
    return Object.fromEntries(entries);
  }

  return { run, backgrounds };
})();
