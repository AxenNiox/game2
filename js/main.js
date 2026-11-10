const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');
const scoreElement = document.querySelector('#score-value');
const livesElement = document.querySelector('#lives-value');
const gameOverElement = document.querySelector('#game-over');
const finalScoreElement = document.querySelector('#final-score');
const restartButton = document.querySelector('#restart-button');
const bossHud = document.querySelector('#boss-hud');
const bossHpFill = document.querySelector('#boss-hp-fill');
const bossPhaseLabel = document.querySelector('#boss-phase-label');
const sceneLabelElement = document.querySelector('#stage-scene-label');
const bossArrival = document.querySelector('#boss-arrival');
const spellBanner = document.querySelector('#spell-banner');
const spellNameElement = document.querySelector('#spell-name');
const stageClearElement = document.querySelector('#stage-clear');
const assets = window.GAME_ASSETS || { get: () => null };
const bombButton = document.querySelector('#bomb-button');
const bombCountElement = document.querySelector('#bomb-count');
const hudBombCountElement = document.querySelector('#hud-bomb-count');
const pauseScreenElement = document.querySelector('#pause-screen');
const pauseButton = document.querySelector('#pause-button');
const storage = window.GAME_STORAGE || { load: () => ({ highScore: 0, highestStage: 1, settings: { bgm: 35, sfx: 60, difficulty: 'normal', sensitivity: 100, display: 'standard' } }), save: (value) => value };
const sound = window.GAME_AUDIO || { unlock() {}, setMusic() {}, applySettings() {}, playEffect() {} };
const savedData = storage.load();
const currentSettings = { ...savedData.settings };
const difficultySelects = [...document.querySelectorAll('[data-difficulty]')];
const DIFFICULTIES = {
  easy: { enemySpeed: 0.82, enemyBulletSpeed: 0.78, enemyBulletCount: 0.75, enemySpawnInterval: 1.35, enemyAttackInterval: 1.2, bossHp: 0.8, bossBulletSpeed: 0.82, bossBulletCount: 0.8, bossAttackInterval: 1.2 },
  normal: { enemySpeed: 1, enemyBulletSpeed: 1, enemyBulletCount: 1, enemySpawnInterval: 1, enemyAttackInterval: 1, bossHp: 1, bossBulletSpeed: 1, bossBulletCount: 1, bossAttackInterval: 1 },
  hard: { enemySpeed: 1.12, enemyBulletSpeed: 1.16, enemyBulletCount: 1.25, enemySpawnInterval: 0.78, enemyAttackInterval: 0.84, bossHp: 1.3, bossBulletSpeed: 1.12, bossBulletCount: 1.2, bossAttackInterval: 0.82 },
};

// 弾幕の調整値はここに集約。速度はpx/秒、間隔は秒、角度は度です。
const SETTINGS = {
  playerSpeed: 390, playerRadius: 14, playerHitRadius: 5,
  playerBulletSpeed: 560, playerBulletRadius: 4, playerFireInterval: 0.28,
  enemySpawnInterval: 1.15, enemySpeedMin: 95, enemySpeedMax: 155,
  enemyRadius: 15, scorePerEnemy: 100,
  scenery: { phaseSeconds: 15, scrollSpeed: 82, crossfadeSeconds: 1.25 },
  powerups: { dropChance: 0.24, fallSpeed: 82, radius: 13, multiDamage: 0.8, laserDamage: 3, laserWidth: 11, doubleOffset: 44, maxLevel: 3 },
  startingLives: 3, invulnerabilityDuration: 1.6,
  enemyBullet: { speed: 180, hitRadius: 5, drawRadius: 7, color: '#ff65c4', glow: '#ff39c6',
    colors: { pink: '#ff65c4', violet: '#a874ff', gold: '#ffc65f' } },
  boss: {
    startTime: 50, maxHp: 180, formCount: 3, formHpMultiplier: [1, 1.15, 1.3],
    formRadius: [38, 44, 50], entrySpeed: 135, phaseIntroDuration: 2.4, defeatDuration: 1.9,
    scoreBonus: 5000, hitScore: 10, movementSpeed: 0.48,
    phases: [
      { name: '星冠・宵桜', pattern: 'circle', threshold: 1, interval: 2.35, count: 10, speed: 112 },
      { name: '流星結界・花霞', pattern: 'fan', threshold: 0.66, interval: 2.0, count: 5, angle: 58, speed: 128 },
      { name: '月輪螺旋・千重桜', pattern: 'rotating', threshold: 0.33, interval: 1.8, count: 12, speed: 138, rotationSpeed: 0.48, direction: 1 },
    ],
    // 形態が上がるたび、同じ相でも弾幕の種類と密度を変えます。
    upgradedPhases: [
      [
        { name: '流星結界・花嵐', pattern: 'fan', threshold: 1, interval: 1.8, count: 8, angle: 86, speed: 145 },
        { name: '逆巻く月輪', pattern: 'rotating', threshold: 0.66, interval: 1.65, count: 16, speed: 152, rotationSpeed: 0.72, direction: -1 },
        { name: '狐火・八重連星', pattern: 'circle', threshold: 0.33, interval: 1.55, count: 20, speed: 158 },
      ],
      [
        { name: '終ノ結界・天弓', pattern: 'rotating', threshold: 1, interval: 1.55, count: 18, speed: 168, rotationSpeed: 0.9, direction: 1 },
        { name: '月狐乱舞・九尾扇', pattern: 'fan', threshold: 0.66, interval: 1.45, count: 9, angle: 112, speed: 180 },
        { name: '天蓋崩し・星屑', pattern: 'circle', threshold: 0.33, interval: 1.3, count: 24, speed: 188 },
      ],
    ],
  },
  patterns: {
    aimed: { interval: 1.55 },
    circle: { interval: 2.2, count: 12, speed: 145 },
    fan: { interval: 1.8, count: 5, angle: 54, speed: 175 },
  },
};

const STAGE_SCENES = [
  { asset: 'approach', label: '神社の参道' },
  { asset: 'forestPath', label: '幻想の森' },
  { asset: 'skyShrine', label: '天空の社' },
  { asset: 'yokaiRealm', label: '異界の結界' },
];

const player = { x: 0, y: 0, radius: SETTINGS.playerRadius, hitRadius: SETTINGS.playerHitRadius, movingTimer: 0 };
const playerBullets = [];
const enemies = [];
const enemyBullets = [];
const powerups = [];
const effects = [];
const pressedKeys = new Set();
let score = 0;
let lives = SETTINGS.startingLives;
let fireTimer = 0;
let weaponMode = 'normal';
// アイテムごとに強化段階を記録します。最大3段階です。
let doubleLevel = 0;
let sixWayLevel = 0;
let laserLevel = 0;
let laserPulse = false;
let laserPulseXs = [];
let enemySpawnTimer = 0;
let previousFrameTime = 0;
let visualTime = 0;
let pointerId = null;
let nextEnemyPattern = 0;
let invulnerabilityTimer = 0;
let hitFlashTimer = 0;
let nextEnemyId = 0;
let stageTime = 0;
let boss = null;
let backgroundSceneIndex = 0;
let previousBackgroundScene = 0;
let backgroundFade = 1;
let screenState = 'title';
let menuOrigin = 'title';
let bossDefeatTimer = 0;
let bombs = 2;
let bombSpriteTimer = 0;
let bombFlashTimer = 0;
const titleMenu = document.querySelector('#title-screen');
const menuPanels = [...document.querySelectorAll('[data-menu]')];
const installButton = document.querySelector('#install-button');
let deferredInstallPrompt = null;

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * pixelRatio);
  canvas.height = Math.round(bounds.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (player.x === 0) {
    player.x = bounds.width / 2;
    player.y = bounds.height - 48;
  } else {
    player.x = clamp(player.x, player.radius, bounds.width - player.radius);
    player.y = clamp(player.y, player.radius + 4, bounds.height - player.radius - 8);
  }
  drawScene(bounds.width, bounds.height, visualTime);
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function updateBackgroundScene(deltaTime) {
  const phaseLength = SETTINGS.scenery.phaseSeconds;
  const nextScene = boss ? 3 : Math.min(2, Math.floor(stageTime / phaseLength));
  if (nextScene !== backgroundSceneIndex) {
    previousBackgroundScene = backgroundSceneIndex;
    backgroundSceneIndex = nextScene;
    backgroundFade = 0;
    sceneLabelElement.textContent = STAGE_SCENES[nextScene].label;
  }
  backgroundFade = Math.min(1, backgroundFade + deltaTime / SETTINGS.scenery.crossfadeSeconds);
}

function backgroundElapsed(sceneIndex) {
  if (sceneIndex === 3) return boss ? boss.age : 0;
  const start = sceneIndex * SETTINGS.scenery.phaseSeconds;
  return clamp(stageTime - start, 0, SETTINGS.scenery.phaseSeconds);
}

function difficultyRules() { return DIFFICULTIES[currentSettings.difficulty] || DIFFICULTIES.normal; }

function setScreenState(nextState) {
  screenState = nextState;
  const showingMenu = ['title', 'settings', 'howto', 'credits'].includes(nextState);
  const activePage = nextState === 'title' ? 'home' : nextState;
  titleMenu.hidden = !showingMenu;
  pauseScreenElement.hidden = nextState !== 'paused';
  gameOverElement.hidden = nextState !== 'gameOver';
  stageClearElement.hidden = nextState !== 'stageClear';
  for (const panel of menuPanels) {
    panel.hidden = !showingMenu || panel.dataset.menu !== activePage;
  }
  pauseButton.hidden = !['playing', 'paused'].includes(nextState);
  bombButton.disabled = nextState !== 'playing' || bombs === 0;
}

function showMenuPage(page, origin = 'title') {
  menuOrigin = origin;
  if (page === 'home') {
    if (origin === 'pause') { setScreenState('paused'); return; }
    page = 'title';
  }
  setScreenState(page);
}

function applyDisplaySetting() {
  document.querySelector('#game-shell').classList.toggle('wide-playfield', currentSettings.display === 'wide');
}

function syncSettingsUI() {
  document.querySelector('#bgm-volume').value = currentSettings.bgm;
  document.querySelector('#sfx-volume').value = currentSettings.sfx;
  document.querySelector('#sensitivity').value = currentSettings.sensitivity;
  document.querySelector('#display-setting').value = currentSettings.display;
  for (const select of difficultySelects) select.value = currentSettings.difficulty;
  document.querySelector('#bgm-value').value = `${currentSettings.bgm}%`;
  document.querySelector('#sfx-value').value = `${currentSettings.sfx}%`;
  document.querySelector('#sensitivity-value').value = `${currentSettings.sensitivity}%`;
}

function saveSettings() {
  storage.save({ settings: currentSettings });
  sound.applySettings(currentSettings);
}

function updateRecord() {
  const record = storage.save({ highScore: Math.max(savedData.highScore, score), highestStage: Math.max(savedData.highestStage, 1) });
  savedData.highScore = record.highScore; savedData.highestStage = record.highestStage;
  document.querySelector('#best-score').textContent = String(record.highScore).padStart(6, '0');
  document.querySelector('#best-stage').textContent = String(record.highestStage).padStart(2, '0');
}

function initializeSettings() {
  syncSettingsUI();
  applyDisplaySetting();
  sound.applySettings(currentSettings);
  for (const select of difficultySelects) select.addEventListener('change', () => {
    currentSettings.difficulty = ['easy', 'normal', 'hard'].includes(select.value) ? select.value : 'normal';
    for (const other of difficultySelects) other.value = currentSettings.difficulty;
    saveSettings();
  });
  const ranges = [
    ['bgm-volume', 'bgm', 'bgm-value'], ['sfx-volume', 'sfx', 'sfx-value'], ['sensitivity', 'sensitivity', 'sensitivity-value'],
  ];
  for (const [id, key, outputId] of ranges) document.querySelector(`#${id}`).addEventListener('input', (event) => {
    currentSettings[key] = Number(event.target.value);
    document.querySelector(`#${outputId}`).value = `${currentSettings[key]}%`;
    saveSettings();
  });
  document.querySelector('#display-setting').addEventListener('change', (event) => {
    currentSettings.display = event.target.value === 'wide' ? 'wide' : 'standard';
    applyDisplaySetting(); saveSettings(); resizeCanvas();
  });
  updateRecord();
}

function setTitleScreen() {
  menuOrigin = 'title';
  setScreenState('title');
  sound.setMusic('title');
}

function pauseGame() {
  if (screenState !== 'playing') return;
  setScreenState('paused'); sound.setMusic('none');
}

function resumeGame() {
  if (screenState !== 'paused') return;
  setScreenState('playing'); sound.unlock(); sound.setMusic(boss ? 'boss' : 'stage');
}

function createMuzzle(x, y, color) {
  effects.push({ type: 'muzzle', x, y, color, life: 0.16, maxLife: 0.16, radius: 13 });
}

function createBurst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 2 * i / count + Math.random() * 0.25;
    const speed = 35 + Math.random() * 125;
    effects.push({ type: 'particle', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      color, life: 0.35 + Math.random() * 0.4, maxLife: 0.75, radius: 2 + Math.random() * 3, rotation: Math.random() * Math.PI });
  }
}

function updateEffects(deltaTime) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    effect.life -= deltaTime;
    if (effect.type === 'particle') {
      effect.x += effect.vx * deltaTime; effect.y += effect.vy * deltaTime;
      effect.vx *= 0.985; effect.vy *= 0.985; effect.rotation += deltaTime * 2;
    } else if (effect.type === 'bomb') {
      effect.radius = effect.maxRadius * (1 - effect.life / effect.maxLife);
    }
    if (effect.life <= 0) effects.splice(i, 1);
  }
  bombSpriteTimer = Math.max(0, bombSpriteTimer - deltaTime);
  bombFlashTimer = Math.max(0, bombFlashTimer - deltaTime);
}

function triggerBomb() {
  if (screenState !== 'playing' || bombs <= 0) return;
  sound.playEffect('bomb');
  bombs--;
  bombCountElement.textContent = String(bombs);
  hudBombCountElement.textContent = String(bombs);
  bombButton.disabled = bombs === 0;
  bombSpriteTimer = 0.9; bombFlashTimer = 0.5;
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  effects.push({ type: 'bomb', x: player.x, y: player.y, radius: 0, maxRadius: Math.hypot(width, height) * 0.7, life: 0.85, maxLife: 0.85 });
  createBurst(player.x, player.y, '#fff0bc', 36);
  enemyBullets.length = 0;
  for (const enemy of enemies) {
    createBurst(enemy.x, enemy.y, '#ffb2ce', 14);
    spawnPowerup(enemy.x, enemy.y);
    score += SETTINGS.scorePerEnemy;
  }
  enemies.length = 0;
  if (boss && boss.state !== 'entering' && boss.state !== 'defeated') {
    damageBoss({ x: boss.x, y: boss.y, hitRadius: boss.radius }, 24);
    if (boss.state === 'defeated') clearBossDefeatClutter();
  }
  scoreElement.textContent = String(score).padStart(6, '0');
}

function updatePlayer(deltaTime, width, height) {
  let horizontal = 0;
  let vertical = 0;
  if (pressedKeys.has('ArrowLeft') || pressedKeys.has('a')) horizontal -= 1;
  if (pressedKeys.has('ArrowRight') || pressedKeys.has('d')) horizontal += 1;
  if (pressedKeys.has('ArrowUp') || pressedKeys.has('w')) vertical -= 1;
  if (pressedKeys.has('ArrowDown') || pressedKeys.has('s')) vertical += 1;
  if (horizontal || vertical) {
    player.movingTimer = 0.18;
    const length = Math.hypot(horizontal, vertical) || 1;
    player.x += horizontal / length * SETTINGS.playerSpeed * deltaTime;
    player.y += vertical / length * SETTINGS.playerSpeed * deltaTime;
  }
  player.movingTimer = Math.max(0, player.movingTimer - deltaTime);
  player.x = clamp(player.x, player.radius + 3, width - player.radius - 3);
  player.y = clamp(player.y, player.radius + 4, height - player.radius - 10);
}

function getAttackSources(width) {
  const sources = [player.x];
  const cloneCount = doubleLevel * 2;
  if (cloneCount > 0) {
    const edge = player.radius + 8;
    // 分身が多くても画面内に並ぶよう、狭い画面では間隔を縮めます。
    const spacing = Math.min(SETTINGS.powerups.doubleOffset, (width - edge * 2) / (cloneCount + 1));
    const spread = spacing * Math.ceil(cloneCount / 2);
    const direction = player.x < edge + spread ? 1 : player.x > width - edge - spread ? -1 : 0;
    for (let i = 1; i <= cloneCount; i++) {
      const alternatingOffset = (i % 2 ? -1 : 1) * Math.ceil(i / 2) * spacing;
      const offset = direction === 0 ? alternatingOffset : direction * i * spacing;
      sources.push(clamp(player.x + offset, edge, width - edge));
    }
  }
  return sources;
}

function getLaserWidth() {
  return SETTINGS.powerups.laserWidth * (1 + Math.max(0, laserLevel - 1) * 0.8);
}

function updatePlayerFire(deltaTime, width) {
  laserPulse = false;
  laserPulseXs = [];
  fireTimer += deltaTime;
  while (fireTimer >= SETTINGS.playerFireInterval) {
    fireTimer -= SETTINGS.playerFireInterval;
    for (const sourceX of getAttackSources(width)) {
      if (weaponMode === 'laser') {
        laserPulse = true;
        laserPulseXs.push(sourceX);
        createMuzzle(sourceX, player.y - player.radius - 5, '#a4f4ff');
      } else if (weaponMode === 'sixWay') {
        // 6アイテム1個で6発、2個で10発、3個で14発になります。
        const shotCount = 6 + (sixWayLevel - 1) * 4;
        const spread = Math.PI / 2.6;
        for (let i = 0; i < shotCount; i++) {
          const angle = -spread / 2 + spread * i / (shotCount - 1);
          playerBullets.push({ x: sourceX, y: player.y - player.radius, vx: Math.sin(angle) * SETTINGS.playerBulletSpeed,
            vy: -Math.cos(angle) * SETTINGS.playerBulletSpeed, damage: SETTINGS.powerups.multiDamage,
            kind: 'sixWay', drawRadius: SETTINGS.playerBulletRadius + 1, hitRadius: SETTINGS.playerBulletRadius });
        }
        createMuzzle(sourceX, player.y - player.radius - 5, '#ffe29c');
      } else {
        playerBullets.push({ x: sourceX, y: player.y - player.radius, vx: 0, vy: -SETTINGS.playerBulletSpeed, damage: 1,
          kind: 'normal', drawRadius: SETTINGS.playerBulletRadius, hitRadius: SETTINGS.playerBulletRadius });
        createMuzzle(sourceX, player.y - player.radius - 5, '#c5f7ff');
      }
    }
    if (weaponMode !== 'laser') {
      sound.playEffect('shot');
    }
  }
}

function updatePlayerBullets(deltaTime, width, height) {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    bullet.x += bullet.vx * deltaTime;
    bullet.y += bullet.vy * deltaTime;
    const margin = bullet.drawRadius * 2;
    if (bullet.x + margin < 0 || bullet.x - margin > width || bullet.y + margin < 0 || bullet.y - margin > height) playerBullets.splice(i, 1);
  }
}

function spawnPowerup(x, y) {
  if (Math.random() >= SETTINGS.powerups.dropChance) return;
  const roll = Math.random();
  const kind = roll < 1 / 3 ? 'sixWay' : roll < 2 / 3 ? 'laser' : 'double';
  powerups.push({ kind, x, y, radius: SETTINGS.powerups.radius, speed: SETTINGS.powerups.fallSpeed, age: 0 });
}

function syncWeaponIndicator() {
  const indicator = document.querySelector('#weapon-indicator');
  const labels = { normal: '通常弾', sixWay: '6方向ショット', laser: 'レーザー' };
  const weaponLabel = labels[weaponMode] || labels.normal;
  indicator.textContent = `${weaponLabel}　D:${doubleLevel} 6:${sixWayLevel} L:${laserLevel}`;
  indicator.dataset.weapon = doubleLevel > 0 && weaponMode === 'normal' ? 'double' : weaponMode;
}

function updatePowerups(deltaTime, height) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const item = powerups[i];
    item.y += item.speed * deltaTime;
    item.age += deltaTime;
    if (item.y - item.radius > height) {
      powerups.splice(i, 1);
      continue;
    }
    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const hitDistance = player.hitRadius + item.radius;
    if (dx * dx + dy * dy <= hitDistance * hitDistance) {
      if (item.kind === 'double') doubleLevel = Math.min(SETTINGS.powerups.maxLevel, doubleLevel + 1);
      if (item.kind === 'sixWay') {
        sixWayLevel = Math.min(SETTINGS.powerups.maxLevel, sixWayLevel + 1);
        weaponMode = item.kind;
      }
      if (item.kind === 'laser') {
        laserLevel = Math.min(SETTINGS.powerups.maxLevel, laserLevel + 1);
        weaponMode = item.kind;
      }
      powerups.splice(i, 1);
      syncWeaponIndicator();
      const color = item.kind === 'sixWay' ? '#ffe29c' : item.kind === 'double' ? '#ff9edc' : '#9ff4ff';
      createBurst(player.x, player.y, color, 24);
      sound.playEffect('pickup');
    }
  }
}

function drawPowerup(item) {
  const color = item.kind === 'sixWay' ? '#ffd879' : item.kind === 'double' ? '#ff9edc' : '#8ceeff';
  const pulse = 1 + Math.sin(item.age * 6) * 0.12;
  context.save();
  context.translate(item.x, item.y);
  context.scale(pulse, pulse);
  context.shadowColor = color;
  context.shadowBlur = 18;
  context.fillStyle = 'rgba(20, 23, 48, 0.9)';
  context.strokeStyle = color;
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(0, 0, item.radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#fff';
  context.font = 'bold 11px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const icon = item.kind === 'sixWay' ? '6' : item.kind === 'double' ? 'D' : 'L';
  context.fillText(icon, 0, 0);
  context.restore();
}

function drawLaser(canvasWidth) {
  if (weaponMode !== 'laser') return;
  const width = getLaserWidth();
  context.save();
  context.globalAlpha = 0.72 + Math.sin(visualTime * 18) * 0.12;
  context.shadowColor = '#83eaff';
  context.shadowBlur = 17;
  for (const sourceX of getAttackSources(canvasWidth)) {
    const beam = context.createLinearGradient(sourceX - width, 0, sourceX + width, 0);
    beam.addColorStop(0, 'rgba(80, 203, 255, 0)');
    beam.addColorStop(0.35, 'rgba(104, 218, 255, 0.4)');
    beam.addColorStop(0.5, 'rgba(255, 255, 255, 0.96)');
    beam.addColorStop(0.65, 'rgba(104, 218, 255, 0.4)');
    beam.addColorStop(1, 'rgba(80, 203, 255, 0)');
    context.fillStyle = beam;
    context.fillRect(sourceX - width, 0, width * 2, player.y - player.radius);
  }
  context.restore();
}

function spawnEnemy(width) {
  const radius = SETTINGS.enemyRadius;
  const difficulty = difficultyRules();
  const patternNames = Object.keys(SETTINGS.patterns);
  const pattern = patternNames[nextEnemyPattern % patternNames.length];
  nextEnemyPattern++;
  enemies.push({
    id: nextEnemyId++, x: radius + Math.random() * Math.max(1, width - radius * 2), y: -radius,
    radius, speed: (SETTINGS.enemySpeedMin + Math.random() * (SETTINGS.enemySpeedMax - SETTINGS.enemySpeedMin)) * difficulty.enemySpeed,
    rotation: Math.random() * Math.PI * 2, pattern, attackTimer: Math.random() * 0.45,
  });
}

function updateEnemies(deltaTime, width, height) {
  const difficulty = difficultyRules();
  if (!boss) {
    enemySpawnTimer += deltaTime;
    const spawnInterval = SETTINGS.enemySpawnInterval * difficulty.enemySpawnInterval;
    while (enemySpawnTimer >= spawnInterval) {
      enemySpawnTimer -= spawnInterval;
      spawnEnemy(width);
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * deltaTime;
    enemy.rotation += deltaTime * 0.8;
    enemy.attackTimer += deltaTime;
    const attackInterval = SETTINGS.patterns[enemy.pattern].interval * difficulty.enemyAttackInterval;
    if (enemy.attackTimer >= attackInterval) {
      enemy.attackTimer -= attackInterval;
      fireEnemyPattern(enemy);
    }
    if (enemy.y - enemy.radius > height) enemies.splice(i, 1);
  }
}

function spawnBoss(width, height, form = 1) {
  enemies.length = 0;
  enemyBullets.length = 0;
  const formIndex = form - 1;
  const maxHp = Math.round(SETTINGS.boss.maxHp * SETTINGS.boss.formHpMultiplier[formIndex] * difficultyRules().bossHp);
  boss = {
    x: width / 2, y: -58, targetY: Math.max(62, height * 0.17), radius: SETTINGS.boss.formRadius[formIndex],
    hp: maxHp, maxHp, form, phase: 1,
    state: 'entering', stateTimer: 0, attackTimer: 0, age: 0, rotation: 0,
  };
  bossDefeatTimer = 0;
  bossHud.hidden = false;
  bossArrival.hidden = false;
  const formNames = ['第一', '第二', '第三'];
  bossArrival.textContent = form === 1 ? '月狐の神霊、降臨' : `月狐の神霊、${formNames[formIndex]}形態へ`;
  createBurst(boss.x, 42, '#ffd9ed', 30);
  bossPhaseLabel.textContent = `${formNames[formIndex]}形態`;
  updateBossHpBar();
  sound.setMusic('boss');
}

function updateBossHpBar() {
  if (!boss) return;
  bossHpFill.style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`;
}

function getBossSpells(form) {
  return form === 1 ? SETTINGS.boss.phases : SETTINGS.boss.upgradedPhases[form - 2];
}

function getBossPhase(hpRatio) {
  const phases = getBossSpells(boss.form);
  if (hpRatio <= phases[2].threshold) return 3;
  if (hpRatio <= phases[1].threshold) return 2;
  return 1;
}

function beginBossPhase(phaseNumber) {
  const formNames = ['第一', '第二', '第三'];
  const phaseNames = ['第一相', '第二相', '第三相'];
  const spell = getBossSpells(boss.form)[phaseNumber - 1];
  boss.phase = phaseNumber;
  boss.state = 'phaseTransition';
  boss.stateTimer = SETTINGS.boss.phaseIntroDuration;
  boss.attackTimer = 0;
  bossPhaseLabel.textContent = `${formNames[boss.form - 1]}形態・${phaseNames[phaseNumber - 1]}`;
  spellNameElement.textContent = spell.name;
  spellBanner.hidden = false;
}

function fireBossPattern(width) {
  const pattern = getBossSpells(boss.form)[boss.phase - 1];
  const difficulty = difficultyRules();
  const count = Math.max(3, Math.round(pattern.count * difficulty.bossBulletCount));
  const speed = pattern.speed * difficulty.bossBulletSpeed;
  const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
  if (pattern.pattern === 'circle' || pattern.pattern === 'rotating') {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count + boss.rotation;
      addEnemyBullet(boss.x, boss.y + boss.radius * 0.45, angle, speed,
        pattern.pattern === 'rotating' ? 'pink' : 'gold');
    }
    if (pattern.pattern === 'rotating') boss.rotation += pattern.rotationSpeed * pattern.direction;
  } else if (pattern.pattern === 'fan') {
    const spread = pattern.angle * Math.PI / 180;
    const step = count > 1 ? spread / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + step * i;
      addEnemyBullet(boss.x, boss.y + boss.radius * 0.45, angle, speed, 'violet');
    }
  }
}

function damageBoss(bullet, damage = 1) {
  // 戦闘開始前とスペル演出中は無敵にして、開始前撃破による進行停止を防ぎます。
  if (!boss || boss.state !== 'attack') return false;
  const dx = bullet.x - boss.x;
  const dy = bullet.y - boss.y;
  const hitDistance = bullet.hitRadius + boss.radius;
  if (dx * dx + dy * dy > hitDistance * hitDistance) return false;
  boss.hp = Math.max(0, boss.hp - damage);
  score += SETTINGS.boss.hitScore * damage;
  scoreElement.textContent = String(score).padStart(6, '0');
  updateBossHpBar();
  if (boss.hp === 0) {
    boss.state = 'defeated';
    bossDefeatTimer = SETTINGS.boss.defeatDuration;
    enemyBullets.length = 0;
    score += SETTINGS.boss.scoreBonus;
    scoreElement.textContent = String(score).padStart(6, '0');
    spellBanner.hidden = true;
    createBurst(boss.x, boss.y, '#ffe5ad', 64);
    sound.playEffect('boss');
  } else {
    const nextPhase = getBossPhase(boss.hp / boss.maxHp);
    if (nextPhase > boss.phase) beginBossPhase(nextPhase);
  }
  return true;
}

function resolvePlayerBossCollisions() {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    if (damageBoss(bullet, bullet.damage || 1)) {
      playerBullets.splice(i, 1);
      // 撃破後は配列の後片付けをループの外で行います。
      if (boss.state === 'defeated') break;
    }
  }
  if (laserPulse && boss && boss.y < player.y) {
    for (const sourceX of laserPulseXs) {
      if (Math.abs(boss.x - sourceX) <= getLaserWidth() + boss.radius) {
        damageBoss({ x: sourceX, y: boss.y, hitRadius: getLaserWidth() }, SETTINGS.powerups.laserDamage);
        if (boss.state === 'defeated') break;
      }
    }
  }
  // 撃破後に弾やアイテムが停止したまま残らないように片付けます。
  if (boss && boss.state === 'defeated') clearBossDefeatClutter();
}

function clearBossDefeatClutter() {
  playerBullets.length = 0;
  powerups.length = 0;
}

function updateBoss(deltaTime, width, height) {
  if (!boss) {
    stageTime += deltaTime;
    if (stageTime >= SETTINGS.boss.startTime) spawnBoss(width, height);
    return;
  }
  if (boss.state === 'defeated') {
    bossDefeatTimer -= deltaTime;
    if (bossDefeatTimer <= 0) {
      if (boss.form < SETTINGS.boss.formCount) {
        const nextForm = boss.form + 1;
        createBurst(boss.x, boss.y, nextForm === 2 ? '#ff83d1' : '#ffd66f', 48);
        spawnBoss(width, height, nextForm);
      } else {
        showStageClear();
      }
    }
    return;
  }
  boss.age += deltaTime;
  if (boss.state === 'entering') {
    boss.y = Math.min(boss.targetY, boss.y + SETTINGS.boss.entrySpeed * deltaTime);
    if (boss.y >= boss.targetY) { boss.state = 'waiting'; boss.stateTimer = 0.65; bossArrival.hidden = true; }
    return;
  }
  const formSpeed = SETTINGS.boss.movementSpeed * (1 + (boss.form - 1) * 0.18);
  boss.x = width / 2 + Math.sin(boss.age * formSpeed) * width * 0.2;
  if (boss.state === 'waiting') {
    boss.stateTimer -= deltaTime;
    if (boss.stateTimer <= 0) beginBossPhase(boss.phase);
    return;
  }
  if (boss.state === 'phaseTransition') {
    boss.stateTimer -= deltaTime;
    if (boss.stateTimer <= 0) {
      boss.state = 'attack';
      spellBanner.hidden = true;
    }
    return;
  }
  if (boss.state === 'attack') {
    const pattern = getBossSpells(boss.form)[boss.phase - 1];
    const attackInterval = pattern.interval * difficultyRules().bossAttackInterval;
    boss.attackTimer += deltaTime;
    if (boss.attackTimer >= attackInterval) {
      boss.attackTimer -= attackInterval;
      fireBossPattern(width);
    }
  }
}

function showStageClear() {
  setScreenState('stageClear');
  updateRecord(); sound.setMusic('clear');
  document.querySelector('#clear-score').textContent = String(score).padStart(6, '0');
  document.querySelector('#clear-lives').textContent = String(lives);
}

function showTitle() {
  updateRecord();
  setTitleScreen();
}

function addEnemyBullet(x, y, angle, speed, kind = 'pink') {
  enemyBullets.push({
    x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    hitRadius: SETTINGS.enemyBullet.hitRadius, drawRadius: SETTINGS.enemyBullet.drawRadius, kind,
  });
  createMuzzle(x, y, SETTINGS.enemyBullet.colors[kind]);
}

// enemy.patternに応じて狙い撃ち・円形・扇状を切り替えます。
function fireEnemyPattern(enemy) {
  const pattern = SETTINGS.patterns[enemy.pattern];
  const difficulty = difficultyRules();
  const count = Math.max(3, Math.round((pattern.count || 1) * difficulty.enemyBulletCount));
  const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  if (enemy.pattern === 'aimed') {
    addEnemyBullet(enemy.x, enemy.y, baseAngle, SETTINGS.enemyBullet.speed * difficulty.enemyBulletSpeed, 'pink');
  } else if (enemy.pattern === 'circle') {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      addEnemyBullet(enemy.x, enemy.y, angle, pattern.speed * difficulty.enemyBulletSpeed, 'gold');
    }
  } else if (enemy.pattern === 'fan') {
    const spread = pattern.angle * Math.PI / 180;
    const step = count > 1 ? spread / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + step * i;
      addEnemyBullet(enemy.x, enemy.y, angle, pattern.speed * difficulty.enemyBulletSpeed, 'violet');
    }
  }
}

function updateEnemyBullets(deltaTime, width, height) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.x += bullet.vx * deltaTime;
    bullet.y += bullet.vy * deltaTime;
    const margin = bullet.drawRadius + 2;
    if (bullet.x < -margin || bullet.x > width + margin || bullet.y < -margin || bullet.y > height + margin) {
      enemyBullets.splice(i, 1);
    }
  }
}

function updatePlayerCollisions() {
  if (invulnerabilityTimer > 0) return;

  // 敵の弾だけでなく、敵本体に触れたときも被弾にします。
  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const hitDistance = player.hitRadius + enemy.radius;
    if (dx * dx + dy * dy <= hitDistance * hitDistance) {
      damagePlayer();
      return;
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const hitDistance = player.hitRadius + bullet.hitRadius;
    if (dx * dx + dy * dy <= hitDistance * hitDistance) {
      enemyBullets.splice(i, 1);
      damagePlayer();
      break;
    }
  }
}

function damagePlayer() {
  lives--;
  if (weaponMode !== 'normal' || doubleLevel > 0) {
    weaponMode = 'normal';
    doubleLevel = 0;
    sixWayLevel = 0;
    laserLevel = 0;
    laserPulse = false;
    laserPulseXs = [];
    syncWeaponIndicator();
  }
  livesElement.textContent = String(lives);
  sound.playEffect('hit');
  invulnerabilityTimer = SETTINGS.invulnerabilityDuration;
  hitFlashTimer = 0.28;
  createBurst(player.x, player.y, '#fff0b5', 24);
  if (lives <= 0) endGame();
}

function resolvePlayerBulletCollisions() {
  for (let bulletIndex = playerBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = playerBullets[bulletIndex];
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
      const enemy = enemies[enemyIndex];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const hitDistance = bullet.hitRadius + enemy.radius;
      if (dx * dx + dy * dy <= hitDistance * hitDistance) {
        playerBullets.splice(bulletIndex, 1);
        enemies.splice(enemyIndex, 1);
        createBurst(enemy.x, enemy.y, '#ffb2ce', 14);
        sound.playEffect('enemy');
        spawnPowerup(enemy.x, enemy.y);
        score += SETTINGS.scorePerEnemy;
        scoreElement.textContent = String(score).padStart(6, '0');
        break;
      }
    }
  }

  if (laserPulse) {
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
      const enemy = enemies[enemyIndex];
      if (enemy.y < player.y && laserPulseXs.some((sourceX) => Math.abs(enemy.x - sourceX) <= getLaserWidth() + enemy.radius)) {
        enemies.splice(enemyIndex, 1);
        createBurst(enemy.x, enemy.y, '#b2f4ff', 16);
        sound.playEffect('enemy');
        spawnPowerup(enemy.x, enemy.y);
        score += SETTINGS.scorePerEnemy;
        scoreElement.textContent = String(score).padStart(6, '0');
      }
    }
  }
}

function endGame() {
  setScreenState('gameOver');
  updateRecord(); sound.setMusic('none');
  finalScoreElement.textContent = String(score).padStart(6, '0');
  document.querySelector('#gameover-lives').textContent = String(lives);
}

function resetGame() {
  playerBullets.length = 0;
  enemies.length = 0;
  enemyBullets.length = 0;
  powerups.length = 0;
  effects.length = 0;
  const bounds = canvas.getBoundingClientRect();
  player.x = bounds.width / 2;
  player.y = bounds.height - 48;
  player.movingTimer = 0;
  score = 0; lives = SETTINGS.startingLives; fireTimer = 0; laserPulse = false; laserPulseXs = []; weaponMode = 'normal'; doubleLevel = 0; sixWayLevel = 0; laserLevel = 0; enemySpawnTimer = 0;
  nextEnemyPattern = 0; nextEnemyId = 0; invulnerabilityTimer = 0; hitFlashTimer = 0;
  stageTime = 0; boss = null; bossDefeatTimer = 0;
  backgroundSceneIndex = 0; previousBackgroundScene = 0; backgroundFade = 1;
  sceneLabelElement.textContent = STAGE_SCENES[0].label;
  bombs = 2; bombSpriteTimer = 0; bombFlashTimer = 0;
  scoreElement.textContent = '000000';
  livesElement.textContent = String(lives);
  const weaponIndicator = document.querySelector('#weapon-indicator');
  weaponIndicator.textContent = '通常弾'; weaponIndicator.dataset.weapon = 'normal';
  bombCountElement.textContent = String(bombs);
  hudBombCountElement.textContent = String(bombs);
  bossHud.hidden = true;
  bossArrival.hidden = true;
  spellBanner.hidden = true;
  bombCountElement.textContent = String(bombs);
  hudBombCountElement.textContent = String(bombs);
  setScreenState('playing');
  sound.unlock(); sound.setMusic('stage');
  if (screen.orientation && screen.orientation.lock) {
    try { const orientationRequest = screen.orientation.lock('portrait'); if (orientationRequest?.catch) orientationRequest.catch(() => {}); } catch (_) { /* Rotation locking is optional in browsers. */ }
  }
  storage.save({ highestStage: Math.max(savedData.highestStage, 1) });
}

function updateGame(deltaTime, width, height) {
  if (screenState !== 'playing') return;
  if (boss && boss.state === 'defeated') { updateBoss(deltaTime, width, height); updateEffects(deltaTime); return; }
  updatePlayer(deltaTime, width, height);
  updatePowerups(deltaTime, height);
  updatePlayerFire(deltaTime, width);
  updatePlayerBullets(deltaTime, width, height);
  updateEnemies(deltaTime, width, height);
  updateBoss(deltaTime, width, height);
  updateBackgroundScene(deltaTime);
  resolvePlayerBulletCollisions();
  resolvePlayerBossCollisions();
  updateEnemyBullets(deltaTime, width, height);
  if (invulnerabilityTimer > 0) invulnerabilityTimer = Math.max(0, invulnerabilityTimer - deltaTime);
  if (hitFlashTimer > 0) hitFlashTimer = Math.max(0, hitFlashTimer - deltaTime);
  updateEffects(deltaTime);
  updatePlayerCollisions();
}

function drawNebula(width, height, time) {
  const clouds = [
    { x: 0.2, y: 0.24, color: '82, 78, 220', phase: 0, strength: 0.25 },
    { x: 0.78, y: 0.42, color: '41, 143, 205', phase: 2, strength: 0.2 },
    { x: 0.42, y: 0.76, color: '132, 57, 190', phase: 4, strength: 0.18 },
  ];
  context.save(); context.globalCompositeOperation = 'screen';
  for (const cloud of clouds) {
    const x = width * cloud.x + Math.sin(time * 0.12 + cloud.phase) * width * 0.02;
    const y = height * cloud.y + Math.cos(time * 0.1 + cloud.phase) * height * 0.015;
    const haze = context.createRadialGradient(x, y, 0, x, y, Math.min(width, height) * 0.55);
    haze.addColorStop(0, `rgba(${cloud.color}, ${cloud.strength})`);
    haze.addColorStop(0.45, `rgba(${cloud.color}, ${cloud.strength * 0.4})`);
    haze.addColorStop(1, `rgba(${cloud.color}, 0)`);
    context.fillStyle = haze; context.fillRect(0, 0, width, height);
  }
  context.restore();
}

function drawAsset(name, ...coordinates) {
  const image = assets.get(name);
  if (!image) return false;
  context.drawImage(image, ...coordinates);
  return true;
}

function drawParallaxLayer(name, width, height, speed, time) {
  const image = assets.get(name);
  if (!image) return false;
  const tileHeight = Math.max(height, width * image.naturalHeight / image.naturalWidth);
  const tileWidth = tileHeight * image.naturalWidth / image.naturalHeight;
  const left = (width - tileWidth) / 2;
  const offset = (time * speed) % tileHeight;
  context.drawImage(image, left, offset - tileHeight, tileWidth, tileHeight);
  context.drawImage(image, left, offset, tileWidth, tileHeight);
  return true;
}

function drawAmbientPetals(width, height, time) {
  context.save();
  for (let i = 0; i < 24; i++) {
    const fallSpeed = 13 + (i % 5) * 5;
    const y = (i * 113 + time * fallSpeed) % (height + 24) - 12;
    const x = (i * 79 + Math.sin(time * 0.7 + i * 2.1) * 28 + width * 0.11) % width;
    context.save(); context.translate(x, y); context.rotate(time * 0.8 + i);
    context.fillStyle = i % 4 === 0 ? '#ffe4afbb' : '#ffc0d4bb';
    context.beginPath(); context.ellipse(0, 0, 2.3 + i % 3, 1.6, 0, 0, Math.PI * 2); context.fill();
    context.restore();
  }
  context.restore();
}

function drawScenicFallback(sceneIndex, width, height) {
  const palettes = [
    ['#10214a', '#5f79b2'], ['#102c2b', '#648b56'], ['#1878c4', '#d8efff'], ['#230f45', '#a24b9d'],
  ];
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palettes[sceneIndex][0]); gradient.addColorStop(1, palettes[sceneIndex][1]);
  context.fillStyle = gradient; context.fillRect(0, 0, width, height);
  if (sceneIndex === 2) {
    context.fillStyle = '#526989'; context.beginPath(); context.moveTo(0, height * .58); context.lineTo(width * .3, height * .2); context.lineTo(width * .48, height * .5); context.lineTo(width * .72, height * .16); context.lineTo(width, height * .56); context.lineTo(width, height); context.lineTo(0, height); context.fill();
  }
  if (sceneIndex === 3) {
    context.fillStyle = '#ffd2e9'; context.shadowColor = '#f596ff'; context.shadowBlur = 30;
    context.beginPath(); context.arc(width * .52, height * .2, Math.min(width, height) * .16, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
    context.strokeStyle = '#eaa3ff'; context.lineWidth = 2; context.beginPath(); context.ellipse(width / 2, height * .73, width * .42, height * .13, 0, 0, Math.PI * 2); context.stroke();
  }
  if (sceneIndex === 0 || sceneIndex === 1 || sceneIndex === 3) {
    context.fillStyle = sceneIndex === 1 ? '#142b24' : '#182035';
    context.fillRect(0, 0, width * .12, height); context.fillRect(width * .88, 0, width * .12, height);
  }
  context.fillStyle = sceneIndex === 1 ? '#69705d' : sceneIndex === 2 ? '#718297' : '#514454';
  context.beginPath(); context.moveTo(width * .5, height * .32); context.lineTo(width * .08, height); context.lineTo(width * .92, height); context.closePath(); context.fill();
  if (sceneIndex !== 2) {
    context.strokeStyle = sceneIndex === 3 ? '#f093ff' : '#ce9b68'; context.lineWidth = 3;
    context.beginPath(); context.moveTo(width * .28, height * .43); context.lineTo(width * .72, height * .43); context.moveTo(width * .35, height * .46); context.lineTo(width * .35, height * .56); context.moveTo(width * .65, height * .46); context.lineTo(width * .65, height * .56); context.stroke();
  }
}

function drawScenicBackground(sceneIndex, width, height, alpha) {
  const image = assets.get(STAGE_SCENES[sceneIndex].asset);
  context.save(); context.globalAlpha = alpha;
  if (image) {
    const scale = Math.max(width / 512, height / 3072);
    const imageWidth = 512 * scale, imageHeight = 3072 * scale;
    const scroll = Math.min(backgroundElapsed(sceneIndex) * SETTINGS.scenery.scrollSpeed, imageHeight - height);
    context.drawImage(image, (width - imageWidth) / 2, -scroll, imageWidth, imageHeight);
  } else {
    drawScenicFallback(sceneIndex, width, height);
  }
  context.restore();
}

function drawBackground(width, height, time) {
  context.fillStyle = '#15213a'; context.fillRect(0, 0, width, height);
  if (backgroundFade < 1 && previousBackgroundScene !== backgroundSceneIndex) {
    drawScenicBackground(previousBackgroundScene, width, height, 1 - backgroundFade);
  }
  drawScenicBackground(backgroundSceneIndex, width, height, backgroundFade);
  drawAmbientPetals(width, height, time);
}

function drawPlayer(width) {
  if (invulnerabilityTimer > 0 && Math.floor(visualTime * 14) % 2 === 0) return;
  const frame = bombSpriteTimer > 0 ? 3 : hitFlashTimer > 0 ? 2 : player.movingTimer > 0 ? 1 : 0;
  const bob = Math.sin(visualTime * 5) * 2;
  const sprite = assets.get('hanamori');
  if (doubleLevel > 0) {
    for (const cloneX of getAttackSources(width).slice(1)) {
      context.save(); context.globalAlpha = 0.78;
      if (sprite) {
        context.shadowColor = '#ffb5e6'; context.shadowBlur = 15;
        context.drawImage(sprite, frame * 128, 0, 128, 176, cloneX - 22, player.y - 31 + bob, 44, 61);
      } else {
        context.translate(cloneX, player.y + bob); context.scale(.72, .72);
        context.shadowColor = '#ffb5e6'; context.shadowBlur = 13; context.fillStyle = '#c94363';
        context.beginPath(); context.moveTo(0, -18); context.lineTo(15, 13); context.lineTo(0, 8); context.lineTo(-15, 13); context.closePath(); context.fill();
        context.fillStyle = '#fff4e6'; context.beginPath(); context.ellipse(0, -7, 7, 8, 0, 0, Math.PI * 2); context.fill();
      }
      context.restore();
    }
  }
  if (sprite) {
    context.drawImage(sprite, frame * 128, 0, 128, 176, player.x - 30, player.y - 40 + bob, 60, 82);
    return;
  }
  context.save(); context.translate(player.x, player.y);
  context.shadowColor = '#ff9dbd'; context.shadowBlur = 15; context.fillStyle = '#c94363';
  context.beginPath(); context.moveTo(0, -18); context.lineTo(15, 13); context.lineTo(0, 8); context.lineTo(-15, 13); context.closePath(); context.fill();
  context.fillStyle = '#fff4e6'; context.beginPath(); context.ellipse(0, -7, 7, 8, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#34233d'; context.beginPath(); context.arc(0, -10, 8, Math.PI, 0); context.fill();
  context.fillStyle = '#ffe4ef'; context.fillRect(-20, 0, 10, 7); context.fillRect(10, 0, 10, 7);
  context.restore();
}

function drawPlayerBullet(bullet) {
  if (bullet.kind === 'sixWay') {
    context.save();
    context.translate(bullet.x, bullet.y);
    context.rotate(visualTime * 2);
    context.shadowColor = '#ffd879'; context.shadowBlur = 12;
    context.fillStyle = '#fff0bd';
    context.beginPath(); context.moveTo(0, -9); context.lineTo(4, 0); context.lineTo(0, 9); context.lineTo(-4, 0); context.closePath(); context.fill();
    context.restore();
    return;
  }
  const size = bullet.drawRadius * 5;
  if (drawAsset('playerShot', bullet.x - size / 2, bullet.y - size * 0.7, size, size * 1.4)) return;
  context.save(); context.shadowColor = '#a4edff'; context.shadowBlur = 12;
  const glow = context.createRadialGradient(bullet.x, bullet.y, 1, bullet.x, bullet.y, size * 0.8);
  glow.addColorStop(0, '#fff'); glow.addColorStop(.35, '#d7fbff'); glow.addColorStop(1, '#70caff00');
  context.fillStyle = glow; context.beginPath(); context.ellipse(bullet.x, bullet.y, bullet.drawRadius * 2, bullet.drawRadius * 4, 0, 0, Math.PI * 2); context.fill(); context.restore();
}

function drawEnemyBullet(bullet) {
  const style = SETTINGS.enemyBullet;
  const assetName = bullet.kind === 'gold' ? 'bulletGold' : bullet.kind === 'violet' ? 'bulletViolet' : 'bulletPink';
  const size = bullet.drawRadius * 3.2;
  if (drawAsset(assetName, bullet.x - size / 2, bullet.y - size / 2, size, size)) return;
  context.save(); context.shadowColor = style.glow; context.shadowBlur = 16;
  const gradient = context.createRadialGradient(bullet.x - 2, bullet.y - 2, 1, bullet.x, bullet.y, bullet.drawRadius * 1.7);
  gradient.addColorStop(0, '#fff4ff'); gradient.addColorStop(0.38, style.colors[bullet.kind] || style.color); gradient.addColorStop(1, '#9b35ff');
  context.fillStyle = gradient; context.beginPath(); context.arc(bullet.x, bullet.y, bullet.drawRadius, 0, Math.PI * 2); context.fill(); context.restore();
}

function drawEnemy(enemy) {
  context.save(); context.translate(enemy.x, enemy.y); context.rotate(enemy.rotation);
  const fox = assets.get('fox');
  if (fox) {
    const size = enemy.radius * 3.2 + Math.sin(visualTime * 7 + enemy.id) * 2;
    context.shadowColor = '#ffb0cd'; context.shadowBlur = 12;
    context.drawImage(fox, -size / 2, -size / 2, size, size);
    context.restore();
    return;
  }
  context.shadowColor = '#ff536f'; context.shadowBlur = 13;
  const color = context.createRadialGradient(-3, -3, 1, 0, 0, enemy.radius * 1.5);
  color.addColorStop(0, '#fff0cd'); color.addColorStop(0.35, '#ff8066'); color.addColorStop(1, '#e52b65');
  context.fillStyle = color; context.beginPath(); context.moveTo(0, -enemy.radius);
  context.lineTo(enemy.radius * 0.8, -enemy.radius * 0.4); context.lineTo(enemy.radius * 0.8, enemy.radius * 0.4);
  context.lineTo(0, enemy.radius); context.lineTo(-enemy.radius * 0.8, enemy.radius * 0.4);
  context.lineTo(-enemy.radius * 0.8, -enemy.radius * 0.4); context.closePath(); context.fill(); context.restore();
}

function drawBoss() {
  if (!boss) return;
  const defeatProgress = boss.state === 'defeated'
    ? clamp(1 - bossDefeatTimer / SETTINGS.boss.defeatDuration, 0, 1)
    : 0;
  context.save();
  context.translate(boss.x, boss.y);
  if (boss.state === 'defeated') {
    context.globalAlpha = Math.max(0, 1 - defeatProgress);
    context.strokeStyle = '#f5caff'; context.lineWidth = 3;
    context.shadowColor = '#e77dff'; context.shadowBlur = 24;
    context.beginPath(); context.arc(0, 0, boss.radius + defeatProgress * 95, 0, Math.PI * 2); context.stroke();
  }
  context.rotate(Math.sin(boss.age) * 0.08);
  // 形態が上がるほど光輪と周回する狐火を増やし、強化を見た目でも示します。
  const auraColors = ['#d89aff', '#ff72c8', '#ffd66f'];
  const auraColor = auraColors[boss.form - 1] || auraColors[0];
  context.save();
  context.globalAlpha = 0.48 + boss.form * 0.12;
  context.strokeStyle = auraColor;
  context.fillStyle = auraColor;
  context.shadowColor = auraColor;
  context.shadowBlur = 14 + boss.form * 8;
  for (let ring = 0; ring < boss.form; ring++) {
    const radiusX = boss.radius * (1.3 + ring * 0.24);
    const radiusY = boss.radius * (0.66 + ring * 0.18);
    context.lineWidth = 1.2 + boss.form * 0.45;
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, boss.age * (ring % 2 ? -0.35 : 0.35), 0, Math.PI * 2);
    context.stroke();
  }
  const flameCount = boss.form * 4;
  for (let i = 0; i < flameCount; i++) {
    const angle = boss.age * (0.55 + boss.form * 0.12) + i * Math.PI * 2 / flameCount;
    const orbit = boss.radius * (1.55 + (i % 2) * 0.2);
    context.beginPath();
    context.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit * 0.72, 2 + boss.form, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  const portrait = assets.get('boss');
  if (portrait) {
    const size = boss.radius * 3.2;
    context.shadowColor = auraColor; context.shadowBlur = 21 + boss.form * 9;
    context.drawImage(portrait, -size / 2, -size / 2, size, size);
    context.restore();
    return;
  }
  context.shadowColor = '#c777ff'; context.shadowBlur = 25;
  const core = context.createRadialGradient(-9, -10, 2, 0, 0, boss.radius * 1.25);
  core.addColorStop(0, '#fff7ff'); core.addColorStop(0.2, '#ffc8ff');
  core.addColorStop(0.56, '#bd69ff'); core.addColorStop(1, '#4423a1');
  context.fillStyle = core; context.beginPath(); context.arc(0, 0, boss.radius, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#f1c9ff'; context.lineWidth = 2;
  context.beginPath(); context.ellipse(0, 0, boss.radius * 1.38, boss.radius * 0.52, boss.age * 0.22, 0, Math.PI * 2); context.stroke();
  context.restore();
}

function drawMagicCircle() {
  if (!boss || boss.state !== 'phaseTransition') return;
  context.save(); context.translate(boss.x, boss.y);
  context.strokeStyle = '#d5a2ff'; context.fillStyle = '#efd9ff'; context.lineWidth = 1.2;
  context.shadowColor = '#bf62ff'; context.shadowBlur = 15;
  const radius = boss.radius + 22;
  context.rotate(visualTime * 0.42);
  context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.stroke();
  context.beginPath(); context.arc(0, 0, radius * 0.73, 0, Math.PI * 2); context.stroke();
  context.beginPath(); context.arc(0, 0, radius * 0.9, 0, Math.PI * 2); context.stroke();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    context.save(); context.rotate(angle);
    context.beginPath(); context.moveTo(radius * 0.72, 0); context.lineTo(radius, 0); context.stroke();
    context.beginPath(); context.arc(radius, 0, 2.3, 0, Math.PI * 2); context.fill();
    context.restore();
  }
  context.beginPath(); context.moveTo(0, -radius * 0.66); context.lineTo(radius * 0.66, 0);
  context.lineTo(0, radius * 0.66); context.lineTo(-radius * 0.66, 0); context.closePath(); context.stroke();
  context.restore();
}

function drawEffects() {
  for (const effect of effects) {
    const alpha = Math.max(0, effect.life / effect.maxLife);
    context.save(); context.globalAlpha = alpha;
    if (effect.type === 'particle') {
      const burst = assets.get('burst');
      if (burst) {
        const size = effect.radius * 7;
        context.drawImage(burst, effect.x - size / 2, effect.y - size / 2, size, size);
      } else {
        context.translate(effect.x, effect.y); context.rotate(effect.rotation);
        context.fillStyle = effect.color; context.shadowColor = effect.color; context.shadowBlur = 7;
        context.beginPath(); context.ellipse(0, 0, effect.radius * 1.7, effect.radius, 0, 0, Math.PI * 2); context.fill();
      }
    } else if (effect.type === 'muzzle') {
      const size = effect.radius * 2.3;
      if (!drawAsset('muzzle', effect.x - size / 2, effect.y - size / 2, size, size)) {
        context.fillStyle = effect.color; context.shadowColor = effect.color; context.shadowBlur = 11;
        context.beginPath(); context.arc(effect.x, effect.y, effect.radius * alpha, 0, Math.PI * 2); context.fill();
      }
    } else if (effect.type === 'bomb') {
      const size = effect.radius * 2;
      if (!drawAsset('ring', effect.x - size / 2, effect.y - size / 2, size, size)) {
        context.strokeStyle = '#ffeab1'; context.shadowColor = '#ff9ecb'; context.shadowBlur = 18;
        context.lineWidth = 5; context.beginPath(); context.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2); context.stroke();
      }
    }
    context.restore();
  }
}

function drawScene(width, height, time) {
  context.clearRect(0, 0, width, height); drawBackground(width, height, time);
  drawLaser(width);
  for (const bullet of playerBullets) drawPlayerBullet(bullet);
  for (const item of powerups) drawPowerup(item);
  for (const bullet of enemyBullets) drawEnemyBullet(bullet);
  for (const enemy of enemies) drawEnemy(enemy);
  drawBoss();
  drawEffects();
  drawPlayer(width);
  if (boss && boss.state === 'phaseTransition') {
    context.fillStyle = 'rgba(5, 5, 19, 0.58)'; context.fillRect(0, 0, width, height);
    drawMagicCircle();
  }
  if (hitFlashTimer > 0) {
    context.fillStyle = `rgba(255, 75, 120, ${hitFlashTimer * 0.42})`;
    context.fillRect(0, 0, width, height);
  }
  if (bombFlashTimer > 0) {
    context.fillStyle = `rgba(255, 218, 173, ${bombFlashTimer * 0.34})`;
    context.fillRect(0, 0, width, height);
  }
}

function gameLoop(frameTime) {
  const deltaTime = previousFrameTime === 0 ? 0 : Math.min((frameTime - previousFrameTime) / 1000, 0.05);
  previousFrameTime = frameTime; visualTime += deltaTime;
  const bounds = canvas.getBoundingClientRect();
  updateGame(deltaTime, bounds.width, bounds.height); drawScene(bounds.width, bounds.height, visualTime);
  window.requestAnimationFrame(gameLoop);
}

function movePlayerToPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const targetX = event.clientX - bounds.left;
  const targetY = event.clientY - bounds.top;
  const sensitivity = currentSettings.sensitivity / 100;
  player.x = clamp(player.x + (targetX - player.x) * sensitivity, player.radius + 3, bounds.width - player.radius - 3);
  player.y = clamp(player.y + (targetY - player.y) * sensitivity, player.radius + 4, bounds.height - player.radius - 10);
  player.movingTimer = 0.18;
}

canvas.addEventListener('pointerdown', (event) => {
  pointerId = event.pointerId;
  if (canvas.setPointerCapture) canvas.setPointerCapture(pointerId);
  const bounds = canvas.getBoundingClientRect();
  player.x = clamp(event.clientX - bounds.left, player.radius + 3, bounds.width - player.radius - 3);
  player.y = clamp(event.clientY - bounds.top, player.radius + 4, bounds.height - player.radius - 10);
  player.movingTimer = 0.18;
});
canvas.addEventListener('pointermove', (event) => { if (event.pointerId === pointerId) movePlayerToPointer(event); });
canvas.addEventListener('pointerup', (event) => { if (event.pointerId === pointerId) pointerId = null; });
canvas.addEventListener('pointercancel', () => { pointerId = null; });
window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const focusedControl = event.target && ['INPUT', 'SELECT', 'BUTTON'].includes(event.target.tagName);
  if (focusedControl && key !== 'Escape') return;
  if (key === 'Escape' || key === 'p') {
    if (screenState === 'playing') pauseGame(); else if (screenState === 'paused') resumeGame();
    event.preventDefault();
  }
  if (key === 'x') triggerBomb();
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(key)) { pressedKeys.add(key); event.preventDefault(); }
});
window.addEventListener('keyup', (event) => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; pressedKeys.delete(key); });
window.addEventListener('blur', () => pressedKeys.clear());
window.addEventListener('resize', resizeCanvas);
document.addEventListener('visibilitychange', () => { if (document.hidden && screenState === 'playing') pauseGame(); });
restartButton.addEventListener('click', resetGame);
bombButton.addEventListener('click', triggerBomb);
pauseButton.addEventListener('click', () => screenState === 'playing' ? pauseGame() : resumeGame());
document.querySelector('#resume-button').addEventListener('click', resumeGame);
document.querySelector('#pause-settings-button').addEventListener('click', () => showMenuPage('settings', 'pause'));
document.querySelector('#pause-title-button').addEventListener('click', showTitle);
document.querySelector('#gameover-title-button').addEventListener('click', showTitle);
document.querySelector('#clear-retry-button').addEventListener('click', resetGame);
document.querySelector('#clear-title-button').addEventListener('click', showTitle);
document.querySelector('#start-button').addEventListener('click', resetGame);
for (const button of document.querySelectorAll('[data-open-menu]')) button.addEventListener('click', () => {
  const origin = screenState === 'paused' ? 'pause' : menuOrigin;
  showMenuPage(button.dataset.openMenu, origin);
});

installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null; installButton.hidden = true;
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); deferredInstallPrompt = event; installButton.hidden = false;
});
window.addEventListener('appinstalled', () => { installButton.hidden = true; });

initializeSettings();
setScreenState('title');
sound.setMusic('title');
resizeCanvas();
window.requestAnimationFrame(gameLoop);
