/* ==========================================================================
   STORMLINE - Procedural Web Audio API Sound System
   Zero assets, unlocked safely on first user input.
   ========================================================================== */

window.Stormline = window.Stormline || {};

window.Stormline.Audio = (function () {
  let ctx = null;
  let masterGain = null;
  let isMuted = false;
  let initialized = false;

  // Continuous rotor hum nodes
  let rotorOsc = null;
  let rotorSubOsc = null;
  let rotorFilter = null;
  let rotorGain = null;
  let rotorIsRunning = false;

  // Initialize Audio Context on first user gesture
  function initAudio() {
    if (initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      ctx = new AudioContextClass();

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.65, ctx.currentTime);
      masterGain.connect(ctx.destination);

      setupRotorHum();
      initialized = true;

      // Resume context if suspended by browser autoplay policy
      if (ctx.state === "suspended") {
        ctx.resume();
      }
    } catch (e) {
      console.warn("AudioContext failed to initialize:", e);
    }
  }

  // Ensure AudioContext is active
  function ensureActive() {
    if (!initialized) {
      initAudio();
    } else if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  }

  // Setup dual-oscillator continuous drone rotor hum
  function setupRotorHum() {
    if (!ctx || rotorIsRunning) return;

    try {
      rotorOsc = ctx.createOscillator();
      rotorSubOsc = ctx.createOscillator();
      rotorFilter = ctx.createBiquadFilter();
      rotorGain = ctx.createGain();

      // Main rotor tone: low triangle wave
      rotorOsc.type = "triangle";
      rotorOsc.frequency.setValueAtTime(68, ctx.currentTime);

      // Sub-rotor resonance: sawtooth wave for mechanical bite
      rotorSubOsc.type = "sawtooth";
      rotorSubOsc.frequency.setValueAtTime(34, ctx.currentTime);

      // Lowpass filter to muffle harsh harmonics
      rotorFilter.type = "lowpass";
      rotorFilter.frequency.setValueAtTime(220, ctx.currentTime);
      rotorFilter.Q.setValueAtTime(3.0, ctx.currentTime);

      // Rotor volume starts quiet (idle)
      rotorGain.gain.setValueAtTime(0.04, ctx.currentTime);

      rotorOsc.connect(rotorFilter);
      rotorSubOsc.connect(rotorFilter);
      rotorFilter.connect(rotorGain);
      rotorGain.connect(masterGain);

      rotorOsc.start();
      rotorSubOsc.start();
      rotorIsRunning = true;
    } catch (e) {
      console.warn("Rotor hum setup failed:", e);
    }
  }

  // Modulate rotor pitch and volume based on thrust intensity (0.0 idle to 1.0 full thrust)
  function updateRotor(thrustFactor) {
    if (!initialized || !rotorGain || !ctx || isMuted) return;

    const t = ctx.currentTime;
    const factor = Math.max(0, Math.min(1, thrustFactor));

    // Pitch rises with thrust (68 Hz idle -> 145 Hz full thrust)
    const targetFreq = 68 + factor * 77;
    rotorOsc.frequency.setTargetAtTime(targetFreq, t, 0.05);
    rotorSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, t, 0.05);

    // Filter opens up when accelerating
    const targetFilter = 220 + factor * 420;
    rotorFilter.frequency.setTargetAtTime(targetFilter, t, 0.06);

    // Gain increases with load
    const targetGain = 0.035 + factor * 0.085;
    rotorGain.gain.setTargetAtTime(targetGain, t, 0.05);
  }

  // Magnetic grapple lock click (crisp high-tech dual tone)
  function playGrappleLock() {
    ensureActive();
    if (!ctx || isMuted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(1180, t + 0.07);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.09);

    // Secondary metallic click overtone
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "triangle";
    click.frequency.setValueAtTime(1800, t + 0.04);
    click.frequency.exponentialRampToValueAtTime(3200, t + 0.08);

    clickGain.gain.setValueAtTime(0.2, t + 0.04);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    click.connect(clickGain);
    clickGain.connect(masterGain);

    click.start(t + 0.04);
    click.stop(t + 0.08);
  }

  // Magnetic release blip (downward frequency sweep)
  function playRelease() {
    ensureActive();
    if (!ctx || isMuted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(820, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.1);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Cargo delivery chime (rich harmonic arpeggio)
  function playDelivery() {
    ensureActive();
    if (!ctx || isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = t + idx * 0.07;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  // Impact thud (hull or crate collision)
  function playImpact(intensity = 1.0) {
    ensureActive();
    if (!ctx || isMuted) return;

    const t = ctx.currentTime;
    const clampedInt = Math.max(0.2, Math.min(2.0, intensity));

    // Low boom oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

    const volume = Math.min(0.5, 0.22 * clampedInt);
    oscGain.gain.setValueAtTime(volume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(oscGain);
    oscGain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.2);

    // Filtered noise burst for crash texture
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450 * clampedInt, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.7, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);

      noise.start(t);
      noise.stop(t + 0.12);
    } catch (e) {
      // Noise buffer fallback safely handled
    }
  }

  // Fragile core break / shatter sound
  function playFragileBreak() {
    ensureActive();
    if (!ctx || isMuted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.3);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.32);
    playImpact(1.8);
  }

  // Battery warning warning beep
  let lastBeepTime = 0;
  function playBatteryWarning() {
    const now = performance.now();
    if (now - lastBeepTime < 900) return; // Rate limit beeps
    lastBeepTime = now;

    ensureActive();
    if (!ctx || isMuted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Level Clear victory fanfare
  function playVictory() {
    ensureActive();
    if (!ctx || isMuted) return;

    const notes = [
      { f: 440, delay: 0 },
      { f: 554.37, delay: 0.1 },
      { f: 659.25, delay: 0.2 },
      { f: 880, delay: 0.32 }
    ];

    const t = ctx.currentTime;
    notes.forEach(item => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const st = t + item.delay;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(item.f, st);

      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.28, st + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.45);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(st);
      osc.stop(st + 0.45);
    });
  }

  // Game over tone
  function playGameOver() {
    ensureActive();
    if (!ctx || isMuted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.45);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Toggle audio mute
  function toggleMute() {
    isMuted = !isMuted;
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.65, ctx.currentTime);
    }
    return isMuted;
  }

  function getMuted() {
    return isMuted;
  }

  // Register unlock listeners
  function setupUserUnlock() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    const unlock = () => {
      ensureActive();
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("mousedown", unlock);
    };
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("mousedown", unlock, { once: true });
  }

  // Boot unlock
  if (typeof window !== "undefined") {
    setupUserUnlock();
  }

  return {
    init: initAudio,
    ensureActive,
    updateRotor,
    playGrappleLock,
    playRelease,
    playDelivery,
    playImpact,
    playFragileBreak,
    playBatteryWarning,
    playVictory,
    playGameOver,
    toggleMute,
    isMuted: getMuted
  };
})();
