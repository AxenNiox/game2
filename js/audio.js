// BGMと効果音をWeb Audioで合成します。最初のタップ/キー操作までは音声を開始しません。
(function () {
  let audioContext = null;
  let bgmGain = null;
  let sfxGain = null;
  let musicTimer = null;
  let musicTrack = 'title';
  let musicStep = 0;
  let bgmVolume = 0.35;
  let sfxVolume = 0.6;

  const melodies = {
    title: [523, 659, 784, 659, 587, 698, 880, 698, 523, 587, 698, 784],
    stage: [392, 494, 587, 494, 440, 523, 659, 523, 392, 440, 587, 494],
    boss: [330, 392, 494, 392, 349, 440, 523, 440, 294, 349, 440, 392],
    clear: [523, 659, 784, 1047, 784, 880, 1047, 1175],
  };

  function initialize() {
    if (audioContext) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      audioContext = new AudioContextClass();
      bgmGain = audioContext.createGain(); sfxGain = audioContext.createGain();
      bgmGain.connect(audioContext.destination); sfxGain.connect(audioContext.destination);
      setVolumes(bgmVolume, sfxVolume);
      return true;
    } catch (_) { audioContext = null; return false; }
  }

  function tone(frequency, duration, volume, type, bus, delay = 0) {
    if (!initialize() || !frequency) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = type || 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope); envelope.connect(bus === 'bgm' ? bgmGain : sfxGain);
    oscillator.start(start); oscillator.stop(start + duration + 0.03);
  }

  function tickMusic() {
    if (!audioContext || audioContext.state !== 'running' || musicTrack === 'none') return;
    const notes = melodies[musicTrack] || melodies.stage;
    const note = notes[musicStep % notes.length];
    tone(note, musicTrack === 'clear' ? 0.3 : 0.24, 0.11, 'sine', 'bgm');
    if (musicTrack !== 'title') tone(note / 2, 0.34, 0.035, 'triangle', 'bgm');
    musicStep++;
  }

  function startMusicTimer() {
    if (musicTimer) clearInterval(musicTimer);
    musicStep = 0;
    if (musicTrack !== 'none') { tickMusic(); musicTimer = setInterval(tickMusic, musicTrack === 'clear' ? 310 : 370); }
  }

  function unlock() {
    if (!initialize()) return;
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    startMusicTimer();
  }

  function setMusic(track) {
    if (!['title', 'stage', 'boss', 'clear', 'none'].includes(track)) return;
    if (musicTrack === track && musicTimer) return;
    musicTrack = track;
    if (track === 'none') { if (musicTimer) clearInterval(musicTimer); musicTimer = null; return; }
    if (audioContext && audioContext.state === 'running') startMusicTimer();
  }

  function setVolumes(bgm, sfx) {
    bgmVolume = Math.max(0, Math.min(1, Number(bgm) || 0));
    sfxVolume = Math.max(0, Math.min(1, Number(sfx) || 0));
    if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(bgmVolume, audioContext.currentTime, 0.04);
    if (sfxGain && audioContext) sfxGain.gain.setTargetAtTime(sfxVolume, audioContext.currentTime, 0.04);
  }

  function playEffect(name) {
    const sounds = {
      shot: [[880, .045, .025, 'sine']],
      enemy: [[660, .09, .07, 'triangle'], [990, .12, .035, 'sine']],
      hit: [[220, .2, .09, 'sawtooth'], [165, .25, .05, 'sine']],
      bomb: [[196, .45, .12, 'sine'], [392, .38, .07, 'triangle'], [587, .32, .04, 'sine']],
      boss: [[392, .25, .08, 'triangle'], [587, .35, .07, 'sine'], [784, .5, .06, 'sine']],
      pickup: [[659, .08, .07, 'sine'], [880, .12, .065, 'triangle'], [1175, .18, .05, 'sine']],
    };
    for (const [frequency, duration, volume, type] of sounds[name] || []) tone(frequency, duration, volume, type, 'sfx');
  }

  function applySettings(settings) {
    setVolumes((settings.bgm || 0) / 100, (settings.sfx || 0) / 100);
  }

  window.GAME_AUDIO = { unlock, setMusic, setVolumes, playEffect, applySettings };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
})();
