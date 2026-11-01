// localStorageを直接触る場所をここにまとめ、壊れた保存データも初期値に戻します。
(function () {
  const key = 'nebula-core-save-v1';
  const defaults = {
    highScore: 0, highestStage: 1,
    settings: { bgm: 35, sfx: 60, difficulty: 'normal', sensitivity: 100, display: 'standard' },
  };
  let current = defaults;

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function clean(data) {
    const incoming = data && typeof data === 'object' ? data : {};
    const source = incoming.settings && typeof incoming.settings === 'object' ? incoming.settings : {};
    const difficulty = ['easy', 'normal', 'hard'].includes(source.difficulty) ? source.difficulty : defaults.settings.difficulty;
    const display = ['standard', 'wide'].includes(source.display) ? source.display : defaults.settings.display;
    return {
      highScore: Math.floor(clampNumber(incoming.highScore, 0, 999999999, defaults.highScore)),
      highestStage: Math.floor(clampNumber(incoming.highestStage, 1, 99, defaults.highestStage)),
      settings: {
        bgm: clampNumber(source.bgm, 0, 100, defaults.settings.bgm),
        sfx: clampNumber(source.sfx, 0, 100, defaults.settings.sfx),
        difficulty, display,
        sensitivity: clampNumber(source.sensitivity, 50, 150, defaults.settings.sensitivity),
      },
    };
  }

  function load() {
    try {
      const saved = window.localStorage.getItem(key);
      current = saved ? clean(JSON.parse(saved)) : clean(defaults);
    } catch (_) {
      current = clean(defaults);
    }
    return JSON.parse(JSON.stringify(current));
  }

  function save(patch) {
    current = clean({ ...current, ...patch, settings: { ...current.settings, ...(patch.settings || {}) } });
    try { window.localStorage.setItem(key, JSON.stringify(current)); } catch (_) { /* Private mode or full storage: keep this session playable. */ }
    return JSON.parse(JSON.stringify(current));
  }

  window.GAME_STORAGE = { defaults: clean(defaults), load, save };
})();
