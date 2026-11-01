// ゲームで使う画像を一か所で管理します。読込失敗時もゲーム本体は動作を続けます。
(function () {
  const files = {
    hanamori: 'assets/images/characters/hanamori-sheet.svg',
    fox: 'assets/images/enemies/fox-spirit.svg',
    boss: 'assets/images/enemies/moon-kitsune-boss.svg',
    far: 'assets/images/backgrounds/stage1-far.svg',
    middle: 'assets/images/backgrounds/stage1-middle.svg',
    foreground: 'assets/images/backgrounds/stage1-foreground.svg',
    playerShot: 'assets/images/bullets/player-spirit-shot.svg',
    bulletPink: 'assets/images/bullets/enemy-pink-orb.svg',
    bulletViolet: 'assets/images/bullets/enemy-violet-orb.svg',
    bulletGold: 'assets/images/bullets/enemy-gold-orb.svg',
    burst: 'assets/images/effects/sakura-burst.svg',
    ring: 'assets/images/effects/mystic-ring.svg',
    muzzle: 'assets/images/effects/muzzle-glow.svg',
  };
  const images = {};
  const states = {};
  const ready = Promise.all(Object.entries(files).map(([name, path]) => new Promise((resolve) => {
    const image = new Image();
    images[name] = image;
    states[name] = 'loading';
    image.onload = () => { states[name] = 'loaded'; resolve(true); };
    image.onerror = () => { states[name] = 'failed'; resolve(false); };
    image.src = path;
  })));

  window.GAME_ASSETS = {
    files,
    images,
    states,
    ready,
    get(name) {
      const image = images[name];
      return image && image.complete && image.naturalWidth > 0 ? image : null;
    },
  };
})();
