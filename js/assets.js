/**
 * Everything is fetched and decoded before the game becomes playable, so a
 * sequence never stalls mid-playback waiting on a file.
 */
const Preloader = (() => {
  function loadImage(configure) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Gorsel yuklenemedi: ${img.currentSrc || img.src}`));
      configure(img);
    });
  }

  function tasks() {
    const list = [];

    SEALS.forEach((seal) => {
      // Setting sizes before srcset lets the browser fetch the same candidate
      // the <img> in the DOM will end up using, so nothing is downloaded twice.
      list.push(() =>
        loadImage((img) => {
          img.sizes = SEAL_FLASH_SIZES;
          img.srcset = sealPaths.pngSrcset(seal.id);
          img.src = sealPaths.pngFallback(seal.id);
        })
      );
      list.push(() => loadImage((img) => { img.src = sealPaths.color(seal.id); }));
    });

    if (AudioBus.init()) {
      clickSoundPaths.forEach((path, i) => list.push(() => AudioBus.load(`click:${i}`, path)));
      list.push(() => AudioBus.load('jutsu', JUTSU_SOUND_PATH));
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

  return { run };
})();
