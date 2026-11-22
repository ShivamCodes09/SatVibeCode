/* ==========================================================================
   STORMLINE - Main Bootstrap & UI Controller
   Canvas scaling, event listeners, fixed-timestep game loop, UI button hooks.
   ========================================================================== */

window.Stormline = window.Stormline || {};

window.Stormline.Main = (function () {
  const Game = window.Stormline.Game;
  const Renderer = window.Stormline.Renderer;
  const Audio = window.Stormline.Audio;

  let canvas = null;
  let ctx = null;

  // DOM Overlay Elements
  let overlayTitle = null;
  let overlayPause = null;
  let overlayLevelClear = null;
  let overlayVictory = null;
  let overlayGameOver = null;

  let selectedStartLevel = 0;

  // Bootstraps everything when DOM is loaded
  function init() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) return;

    ctx = canvas.getContext("2d");

    // Cache Overlay Elements
    overlayTitle = document.getElementById("overlay-title");
    overlayPause = document.getElementById("overlay-pause");
    overlayLevelClear = document.getElementById("overlay-level-clear");
    overlayVictory = document.getElementById("overlay-victory");
    overlayGameOver = document.getElementById("overlay-game-over");

    setupKeyboard();
    setupUIButtons();

    // Register State Change Callback
    Game.registerStateChangeCallback(onGameStateChanged);

    // Initial render in Title mode
    Game.loadLevel(0);
    Game.setState(Game.STATES.TITLE);

    // Start Fixed-Timestep Animation Loop
    startLoop();
  }

  // Keyboard Event Listeners
  function setupKeyboard() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    const preventKeys = [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space", "KeyW", "KeyA", "KeyS", "KeyD"
    ];

    window.addEventListener("keydown", (e) => {
      Audio.ensureActive();

      if (preventKeys.includes(e.code)) {
        e.preventDefault();
      }

      Game.setKeyState(e.code, true);
    });

    window.addEventListener("keyup", (e) => {
      if (preventKeys.includes(e.code)) {
        e.preventDefault();
      }
      Game.setKeyState(e.code, false);
    });
  }

  // Hook UI Overlay Buttons
  function setupUIButtons() {
    // 1. Title Menu Buttons
    const btnStart = document.getElementById("btn-start");
    if (btnStart) {
      btnStart.addEventListener("click", () => {
        Audio.ensureActive();
        Game.loadLevel(selectedStartLevel);
      });
    }

    // Level select buttons on title screen
    const levelBtns = document.querySelectorAll(".btn-level");
    levelBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        Audio.ensureActive();
        levelBtns.forEach(b => b.classList.replace("btn-primary", "btn-secondary"));
        btn.classList.replace("btn-secondary", "btn-primary");
        selectedStartLevel = parseInt(btn.dataset.level || "0", 10);
      });
    });
    if (levelBtns.length > 0) {
      levelBtns[0].classList.replace("btn-secondary", "btn-primary");
    }

    // 2. Pause Menu Buttons
    const btnResume = document.getElementById("btn-resume");
    if (btnResume) {
      btnResume.addEventListener("click", () => {
        Audio.ensureActive();
        Game.setState(Game.STATES.PLAYING);
      });
    }

    const btnPauseRestart = document.getElementById("btn-pause-restart");
    if (btnPauseRestart) {
      btnPauseRestart.addEventListener("click", () => {
        Audio.ensureActive();
        Game.restartCurrentLevel();
      });
    }

    const btnPauseMute = document.getElementById("btn-pause-mute");
    if (btnPauseMute) {
      btnPauseMute.addEventListener("click", () => {
        const muted = Audio.toggleMute();
        btnPauseMute.textContent = muted ? "AUDIO: MUTED" : "AUDIO: ON";
      });
    }

    const btnPauseTitle = document.getElementById("btn-pause-title");
    if (btnPauseTitle) {
      btnPauseTitle.addEventListener("click", () => {
        Audio.ensureActive();
        Game.setState(Game.STATES.TITLE);
      });
    }

    // 3. Level Clear Buttons
    const btnNextLevel = document.getElementById("btn-next-level");
    if (btnNextLevel) {
      btnNextLevel.addEventListener("click", () => {
        Audio.ensureActive();
        Game.advanceToNextLevel();
      });
    }

    const btnLevelReplay = document.getElementById("btn-level-replay");
    if (btnLevelReplay) {
      btnLevelReplay.addEventListener("click", () => {
        Audio.ensureActive();
        Game.restartCurrentLevel();
      });
    }

    // 4. Victory Buttons
    const btnVicReplay = document.getElementById("btn-victory-replay");
    if (btnVicReplay) {
      btnVicReplay.addEventListener("click", () => {
        Audio.ensureActive();
        Game.loadLevel(0);
      });
    }

    const btnVicTitle = document.getElementById("btn-victory-title");
    if (btnVicTitle) {
      btnVicTitle.addEventListener("click", () => {
        Audio.ensureActive();
        Game.setState(Game.STATES.TITLE);
      });
    }

    // 5. Game Over Buttons
    const btnRetry = document.getElementById("btn-game-over-retry");
    if (btnRetry) {
      btnRetry.addEventListener("click", () => {
        Audio.ensureActive();
        Game.restartCurrentLevel();
      });
    }

    const btnGameOverTitle = document.getElementById("btn-game-over-title");
    if (btnGameOverTitle) {
      btnGameOverTitle.addEventListener("click", () => {
        Audio.ensureActive();
        Game.setState(Game.STATES.TITLE);
      });
    }
  }

  // Synchronously hide all overlays before activating the target state overlay
  function hideAllOverlays() {
    const overlays = [
      overlayTitle,
      overlayPause,
      overlayLevelClear,
      overlayVictory,
      overlayGameOver
    ];
    overlays.forEach(el => {
      if (el) el.classList.add("hidden");
    });
  }

  // Handle Game State Transitions and Overlay Visibilities
  function onGameStateChanged(state) {
    const STATES = Game.STATES;

    // Synchronously hide all overlays first to guarantee no overlapping or flashing screens
    hideAllOverlays();

    if (state === STATES.TITLE) {
      if (overlayTitle) overlayTitle.classList.remove("hidden");
    } else if (state === STATES.PAUSED) {
      if (overlayPause) overlayPause.classList.remove("hidden");
    } else if (state === STATES.LEVEL_CLEAR) {
      if (overlayLevelClear) {
        overlayLevelClear.classList.remove("hidden");
        const activeLevel = Game.getActiveLevel();
        const breakdown = Game.getLastScoreBreakdown();

        const titleEl = document.getElementById("lc-level-title");
        const cratesEl = document.getElementById("lc-crates-score");
        const precEl = document.getElementById("lc-precision-score");
        const battEl = document.getElementById("lc-battery-score");
        const timeEl = document.getElementById("lc-time-score");
        const totalEl = document.getElementById("lc-total-score");

        if (titleEl && activeLevel) titleEl.textContent = activeLevel.name;
        if (cratesEl) cratesEl.textContent = `+${breakdown.cratesScore.toLocaleString()}`;
        if (precEl) precEl.textContent = `+${breakdown.precisionScore.toLocaleString()}`;
        if (battEl) battEl.textContent = `+${breakdown.batteryBonus.toLocaleString()}`;
        if (timeEl) timeEl.textContent = `+${breakdown.timeBonus.toLocaleString()}`;
        if (totalEl) totalEl.textContent = breakdown.totalLevelScore.toLocaleString();
      }
    } else if (state === STATES.VICTORY) {
      if (overlayVictory) {
        overlayVictory.classList.remove("hidden");
        const grandScore = Game.getGrandTotalScore();
        const scoreEl = document.getElementById("vic-total-score");
        const rankEl = document.getElementById("vic-rank");

        if (scoreEl) scoreEl.textContent = grandScore.toLocaleString();

        let rank = "C-RANK PILOT";
        if (grandScore >= 14000) rank = "S-RANK ACE PILOT";
        else if (grandScore >= 11000) rank = "A-RANK FLIGHT LEAD";
        else if (grandScore >= 8000) rank = "B-RANK VETERAN";

        if (rankEl) rankEl.textContent = rank;
      }
    } else if (state === STATES.GAME_OVER) {
      if (overlayGameOver) {
        overlayGameOver.classList.remove("hidden");
        const reasonEl = document.getElementById("game-over-reason");
        if (reasonEl) reasonEl.textContent = Game.getGameOverReason();
      }
    }
  }

  // Fixed Timestep Game Loop
  let lastTime = 0;
  let accumulator = 0;
  const FIXED_STEP = 1 / 60; // 60 updates per second

  function loop(currentTime) {
    if (!lastTime) lastTime = currentTime;
    let frameTime = (currentTime - lastTime) / 1000;
    if (frameTime > 0.25) frameTime = 0.25; // Prevent spiral of death on tab unfocus
    lastTime = currentTime;

    accumulator += frameTime;
    while (accumulator >= FIXED_STEP) {
      Game.update(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }

    // Render frame
    if (ctx) {
      Renderer.render(ctx, Game);
    }

    requestAnimationFrame(loop);
  }

  function startLoop() {
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  // Auto-init on script execution
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    init
  };
})();
