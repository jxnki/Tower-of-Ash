// ═══════════════════════════════════════════════════════
//  TOWER OF ASH — audio.js
//  Procedural Web Audio API — no external files needed.
//  Dark fantasy: metallic hits, ghostly drones, low rumbles.
// ═══════════════════════════════════════════════════════

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let bgNode = null;    // current ambient loop nodes
  let bgGain = null;
  let _muted = false;

  // Floor ambient colours: [baseHz, modHz, modDepth, filterHz, filterQ]
  const FLOOR_AMBIENT = [
    { base: 55,  mod: 0.12, depth: 8,  filter: 400,  q: 1.2, label: 'gate'     }, // Floor 1 – low rumble
    { base: 46,  mod: 0.08, depth: 6,  filter: 280,  q: 1.8, label: 'grave'    }, // Floor 2 – haunted drone
    { base: 60,  mod: 0.18, depth: 12, filter: 600,  q: 1.0, label: 'forge'    }, // Floor 3 – forge heat
    { base: 36,  mod: 0.06, depth: 5,  filter: 200,  q: 2.5, label: 'abyss'    }, // Floor 4 – deep void
    { base: 50,  mod: 0.10, depth: 9,  filter: 500,  q: 1.5, label: 'throne'   }, // Floor 5 – ominous
  ];

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── Utility ─────────────────────────────────────────
  function osc(type, freq, dur, gainVal, dest, startOffset = 0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
    g.gain.setValueAtTime(gainVal, ctx.currentTime + startOffset);
    o.connect(g); g.connect(dest);
    o.start(ctx.currentTime + startOffset);
    o.stop(ctx.currentTime + startOffset + dur);
    return { o, g };
  }

  function envelope(gainNode, attack, decay, sustain, release, peakVal, startOffset = 0) {
    const t = ctx.currentTime + startOffset;
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(peakVal, t + attack);
    gainNode.gain.linearRampToValueAtTime(peakVal * sustain, t + attack + decay);
    gainNode.gain.setValueAtTime(peakVal * sustain, t + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, t + attack + decay + release);
  }

  function noise(dur, gainVal, filterHz, dest) {
    const bufLen = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = filterHz;
    bpf.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    src.connect(bpf); bpf.connect(g); g.connect(dest);
    src.start();
    return src;
  }

  // ── SOUND FX ────────────────────────────────────────

  // Sword swing — metallic swoosh + short ring
  function playSwordSwing() {
    if (!ctx || _muted) return;
    const d = ctx.destination;

    // Swoosh: noise sweep
    const bufLen = Math.ceil(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(800, ctx.currentTime);
    hpf.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
    src.connect(hpf); hpf.connect(g); g.connect(masterGain);
    src.start();

    // Short metallic ting
    const { g: tg } = osc('sine', 1200, 0.12, 0.09, masterGain);
    tg.gain.setValueAtTime(0.09, ctx.currentTime);
    tg.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
  }

  // Blade throw — high whizz
  function playThrow() {
    if (!ctx || _muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(900, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.22);
    g.gain.setValueAtTime(0.13, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 600;
    o.connect(hpf); hpf.connect(g); g.connect(masterGain);
    o.start(); o.stop(ctx.currentTime + 0.22);
  }

  // Jump — light upward chirp
  function playJump() {
    if (!ctx || _muted) return;
    const { o, g } = osc('sine', 220, 0.14, 0.11, masterGain);
    o.frequency.linearRampToValueAtTime(360, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.11, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.14);
  }

  // Coin pickup — bright tinkle
  function playCoin() {
    if (!ctx || _muted) return;
    [0, 0.04].forEach((offset, i) => {
      const freq = i === 0 ? 1047 : 1319;
      const { g } = osc('sine', freq, 0.18, 0.1, masterGain, offset);
      envelope(g, 0.005, 0.02, 0.6, 0.14, 0.1, offset);
    });
  }

  // Key pickup — clean triumphant major chord swell, no harsh high note
  function playKeyPickup() {
    if (!ctx || _muted) return;
    const notes = [
      { freq: 392, offset: 0,    dur: 0.7 },
      { freq: 494, offset: 0.06, dur: 0.65 },
      { freq: 587, offset: 0.12, dur: 0.6 },
    ];
    notes.forEach(({ freq, offset, dur }) => {
      const { g } = osc('sine', freq, dur, 0.18, masterGain, offset);
      envelope(g, 0.015, 0.06, 0.65, 0.5, 0.18, offset);
    });
    // Soft shimmer overtone
    const { g: sg } = osc('triangle', 784, 0.5, 0.06, masterGain, 0.1);
    envelope(sg, 0.02, 0.05, 0.4, 0.4, 0.06, 0.1);
  }

  // Player hurt — low thud + distorted crunch
  function playPlayerHurt() {
    if (!ctx || _muted) return;
    // Thud
    const { o, g } = osc('sine', 80, 0.18, 0.3, masterGain);
    o.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
    // Noise layer
    noise(0.12, 0.15, 300, masterGain);
  }

  // Enemy hit — short crack
  function playEnemyHit() {
    if (!ctx || _muted) return;
    noise(0.07, 0.12, 1200, masterGain);
    const { g } = osc('square', 220, 0.07, 0.06, masterGain);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.07);
  }

  // Enemy death — satisfying crunch + burst
  function playEnemyDeath() {
    if (!ctx || _muted) return;
    noise(0.22, 0.2, 500, masterGain);
    const { o, g } = osc('sawtooth', 150, 0.22, 0.14, masterGain);
    o.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.22);
    g.gain.setValueAtTime(0.14, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
  }

  // Mini-boss / boss phase change — dramatic low boom + overtone ring
  function playPhaseChange() {
    if (!ctx || _muted) return;
    // Sub boom
    const { o, g } = osc('sine', 55, 1.0, 0.6, masterGain);
    o.frequency.linearRampToValueAtTime(22, ctx.currentTime + 0.6);
    g.gain.setValueAtTime(0.6, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    // Overtone ring
    const { o: o2, g: g2 } = osc('sine', 440, 1.2, 0.2, masterGain);
    o2.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.8);
    g2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    g2.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    noise(0.5, 0.25, 200, masterGain);
  }

  // Door open — heavy grind
  function playDoorOpen() {
    if (!ctx || _muted) return;
    noise(0.6, 0.22, 150, masterGain);
    const { o, g } = osc('sawtooth', 90, 0.6, 0.12, masterGain);
    o.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  }

  // Draught use — warm bubbling restore
  function playDraughtUse() {
    if (!ctx || _muted) return;
    [0, 0.06, 0.12, 0.18].forEach((offset, i) => {
      const freq = 330 + i * 55;
      const { g } = osc('sine', freq, 0.25, 0.1, masterGain, offset);
      envelope(g, 0.01, 0.05, 0.5, 0.18, 0.1, offset);
    });
    // Soft noise whoosh
    noise(0.35, 0.08, 400, masterGain);
  }

  // Draught buy at shrine — short chime
  function playDraughtBuy() {
    if (!ctx || _muted) return;
    [523, 659].forEach((freq, i) => {
      const { g } = osc('sine', freq, 0.2, 0.1, masterGain, i * 0.05);
      envelope(g, 0.005, 0.03, 0.5, 0.15, 0.1, i * 0.05);
    });
  }

  // Floor clear — ascending fanfare, brief
  function playFloorClear() {
    if (!ctx || _muted) return;
    const notes = [523, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      const { g } = osc('sine', freq, 0.5, 0.18, masterGain, i * 0.1);
      envelope(g, 0.01, 0.05, 0.6, 0.3, 0.18, i * 0.1);
    });
    // Low chord under it
    [130, 196].forEach((freq, i) => {
      const { g } = osc('triangle', freq, 0.8, 0.12, masterGain, i * 0.05);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    });
  }

  // Player death — descending toll
  function playDeath() {
    if (!ctx || _muted) return;
    noise(0.4, 0.3, 200, masterGain);
    const notes = [220, 196, 175, 155];
    notes.forEach((freq, i) => {
      const { g } = osc('sine', freq, 0.6, 0.2, masterGain, i * 0.15);
      envelope(g, 0.01, 0.08, 0.5, 0.45, 0.2, i * 0.15);
    });
  }

  // Victory — full chord bloom
  function playVictory() {
    if (!ctx || _muted) return;
    const chord = [261, 329, 392, 523, 659];
    chord.forEach((freq, i) => {
      const { g } = osc('sine', freq, 2.0, 0.14, masterGain, i * 0.05);
      envelope(g, 0.02, 0.1, 0.7, 1.5, 0.14, i * 0.05);
    });
    noise(0.5, 0.18, 300, masterGain);
  }

  // Stagger — zap-thud
  function playStagger() {
    if (!ctx || _muted) return;
    const { o, g } = osc('square', 440, 0.14, 0.1, masterGain);
    o.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.14);
  }

  // Lava damage — sizzle
  function playLavaBurn() {
    if (!ctx || _muted) return;
    noise(0.1, 0.12, 2000, masterGain);
  }

  // ── AMBIENT BACKGROUND MUSIC ─────────────────────────
  // Layered drones: root oscillator + modulation + filtered noise bed
  function startAmbient(floorIndex) {
    if (!ctx || _muted) return;
    stopAmbient();

    const a = FLOOR_AMBIENT[Math.min(floorIndex, FLOOR_AMBIENT.length - 1)];

    bgGain = ctx.createGain();
    bgGain.gain.setValueAtTime(0, ctx.currentTime);
    bgGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2.5); // fade in
    bgGain.connect(masterGain);

    // --- Root drone (sine, filtered) ---
    const rootOsc = ctx.createOscillator();
    rootOsc.type = 'sine';
    rootOsc.frequency.value = a.base;

    // LFO for subtle pitch wobble
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = a.mod;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = a.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(rootOsc.frequency);

    // Low-pass filter on drone
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = a.filter;
    lpf.Q.value = a.q;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.55;

    rootOsc.connect(lpf);
    lpf.connect(droneGain);
    droneGain.connect(bgGain);

    // --- Fifth harmonic overtone ---
    const fifth = ctx.createOscillator();
    fifth.type = 'sine';
    fifth.frequency.value = a.base * 1.5;
    const fifthLfo = ctx.createOscillator();
    fifthLfo.type = 'sine';
    fifthLfo.frequency.value = a.mod * 1.3;
    const fifthLfoG = ctx.createGain();
    fifthLfoG.gain.value = a.depth * 0.6;
    fifthLfo.connect(fifthLfoG);
    fifthLfoG.connect(fifth.frequency);
    const fifthGain = ctx.createGain();
    fifthGain.gain.value = 0.2;
    fifth.connect(fifthGain);
    fifthGain.connect(bgGain);

    // --- Noise texture bed ---
    const bufLen = ctx.sampleRate * 4; // 4-second looping noise
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    const nbpf = ctx.createBiquadFilter();
    nbpf.type = 'bandpass';
    nbpf.frequency.value = a.filter * 0.5;
    nbpf.Q.value = 3.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.12;
    noiseSrc.connect(nbpf);
    nbpf.connect(noiseGain);
    noiseGain.connect(bgGain);

    // Start all
    rootOsc.start();
    lfo.start();
    fifth.start();
    fifthLfo.start();
    noiseSrc.start();

    bgNode = { rootOsc, lfo, fifth, fifthLfo, noiseSrc };
  }

  function stopAmbient(fadeDur = 1.2) {
    if (!bgGain) return;
    bgGain.gain.setValueAtTime(bgGain.gain.value, ctx.currentTime);
    bgGain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeDur);
    const old = bgNode;
    const oldGain = bgGain;
    bgNode = null;
    bgGain = null;
    setTimeout(() => {
      try {
        if (old) {
          old.rootOsc.stop(); old.lfo.stop();
          old.fifth.stop(); old.fifthLfo.stop();
          old.noiseSrc.stop();
        }
      } catch(e) {}
    }, (fadeDur + 0.2) * 1000);
  }

  function stopAmbientImmediate() { stopAmbient(0.05); }

  // ── MUTE TOGGLE ─────────────────────────────────────
  function toggleMute() {
    _muted = !_muted;
    if (masterGain) {
      masterGain.gain.setValueAtTime(_muted ? 0 : 0.7, ctx.currentTime);
    }
    return _muted;
  }

  function isMuted() { return _muted; }

  return {
    init, resume,
    // SFX
    swordSwing: playSwordSwing,
    throw: playThrow,
    jump: playJump,
    coin: playCoin,
    keyPickup: playKeyPickup,
    playerHurt: playPlayerHurt,
    enemyHit: playEnemyHit,
    enemyDeath: playEnemyDeath,
    phaseChange: playPhaseChange,
    doorOpen: playDoorOpen,
    draughtUse: playDraughtUse,
    draughtBuy: playDraughtBuy,
    floorClear: playFloorClear,
    death: playDeath,
    victory: playVictory,
    stagger: playStagger,
    lavaBurn: playLavaBurn,
    // Ambient
    startAmbient, stopAmbient, stopAmbientImmediate,
    toggleMute, isMuted,
  };
})();
