/* ==========================================================================
   STORMLINE - Game Engine & Physics State Machine
   Fixed-timestep integration, drone aerodynamics, magnetic tether physics.
   ========================================================================== */

window.Stormline = window.Stormline || {};

window.Stormline.Game = (function () {
  const Levels = window.Stormline.Levels;
  const Audio = window.Stormline.Audio;

  // Game States
  const STATES = {
    TITLE: "TITLE",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    LEVEL_CLEAR: "LEVEL_CLEAR",
    VICTORY: "VICTORY",
    GAME_OVER: "GAME_OVER"
  };

  let currentState = STATES.TITLE;
  let currentLevelIndex = 0;
  let grandTotalScore = 0;

  // Level instance data
  let activeLevel = null;
  let platforms = [];
  let windZones = [];
  let cargoList = [];
  let dropZone = null;
  let pickupPads = [];

  // Mission counters
  let battery = 100;
  let hull = 100;
  let timeRemaining = 90;
  let deliveredCount = 0;
  let currentLevelScore = 0;
  let gameOverReason = "";

  // Level Clear Score breakdown
  let lastScoreBreakdown = {
    cratesScore: 0,
    precisionScore: 0,
    batteryBonus: 0,
    timeBonus: 0,
    totalLevelScore: 0
  };

  // Drone State
  const drone = {
    x: 160,
    y: 310,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    w: 48,
    h: 22,
    mass: 1.5,
    angle: 0,
    thrustInput: { up: false, down: false, left: false, right: false },
    isThrusting: false,
    tetheredCargo: null,
    pickupCandidate: null,
    isOverDropZone: false
  };

  // Tether physics constants
  const TETHER = {
    REST_LENGTH: 52,
    MAX_LENGTH: 80,
    SPRING_K: 210,
    DAMPER_C: 14
  };

  // Physics constants
  const GRAVITY = 290;
  const LIFT_ACCEL = -720;
  const HORIZ_ACCEL = 480;
  const DOWN_ACCEL = 340;
  const DRAG_X = 0.984;
  const DRAG_Y = 0.989;

  // Weather / Wind dynamics timer
  let weatherTimer = 0;

  // UI callbacks registered by main
  let onStateChangeCallback = null;

  // Input tracking
  const keys = {};
  const justPressed = {};

  function setKeyState(code, isDown) {
    if (isDown && !keys[code]) {
      justPressed[code] = true;
    }
    keys[code] = isDown;
  }

  function isKeyDown(codes) {
    return codes.some(c => keys[c]);
  }

  function wasJustPressed(codes) {
    return codes.some(c => justPressed[c]);
  }

  function clearJustPressed() {
    for (let k in justPressed) {
      delete justPressed[k];
    }
  }

  // Initialize or reload level
  function loadLevel(index) {
    currentLevelIndex = Math.max(0, Math.min(Levels.length - 1, index));
    const def = Levels[currentLevelIndex];

    activeLevel = JSON.parse(JSON.stringify(def));
    platforms = activeLevel.platforms;
    windZones = activeLevel.windZones || [];
    dropZone = activeLevel.dropZone;
    pickupPads = activeLevel.pickupPads || [];

    // Initialize Cargo objects
    cargoList = activeLevel.cargo.map(c => ({
      ...c,
      vx: 0,
      vy: 0,
      delivered: false,
      broken: false,
      isResting: true,
      settleTimer: 0
    }));

    // Reset Drone
    drone.x = activeLevel.droneSpawn.x;
    drone.y = activeLevel.droneSpawn.y;
    drone.vx = 0;
    drone.vy = 0;
    drone.ax = 0;
    drone.ay = 0;
    drone.angle = 0;
    drone.tetheredCargo = null;
    drone.pickupCandidate = null;
    drone.isOverDropZone = false;

    // Reset Mission stats
    battery = activeLevel.budget.battery;
    hull = 100;
    timeRemaining = activeLevel.budget.time;
    deliveredCount = 0;
    currentLevelScore = 0;
    weatherTimer = 0;
    gameOverReason = "";

    setState(STATES.PLAYING);
  }

  function setState(newState) {
    currentState = newState;
    if (onStateChangeCallback) {
      onStateChangeCallback(currentState);
    }
  }

  // Update Game Physics (Called at fixed delta time, e.g. 1/60s)
  function update(dt) {
    // Process Global input shortcuts
    if (wasJustPressed(["KeyP", "Escape"])) {
      if (currentState === STATES.PLAYING) {
        setState(STATES.PAUSED);
      } else if (currentState === STATES.PAUSED) {
        setState(STATES.PLAYING);
      }
    }

    if (wasJustPressed(["KeyM"])) {
      Audio.toggleMute();
    }

    if (wasJustPressed(["KeyR"])) {
      if (currentState === STATES.PLAYING || currentState === STATES.PAUSED || currentState === STATES.GAME_OVER) {
        loadLevel(currentLevelIndex);
      }
    }

    if (currentState !== STATES.PLAYING) {
      // In non-playing states, still keep rotor audio quiet
      Audio.updateRotor(0);
      clearJustPressed();
      return;
    }

    // --- Weather & Shifting Wind Update ---
    weatherTimer += dt;
    windZones.forEach(wz => {
      if (wz.shifting) {
        // Shift gusts cyclically with turbulence
        const period = wz.shiftPeriod || 4.5;
        const phase = (weatherTimer % period) / period;
        const wave = Math.sin(phase * Math.PI * 2);
        wz.currentForceX = wz.forceX + wave * 45;
        wz.currentForceY = wz.forceY + Math.cos(phase * Math.PI * 2) * 15;
      } else {
        wz.currentForceX = wz.forceX;
        wz.currentForceY = wz.forceY;
      }
    });

    // --- Timer Countdown ---
    timeRemaining -= dt;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      triggerGameOver("MISSION TIME EXPIRED // SUPPLY WINDOW CLOSED");
      clearJustPressed();
      return;
    }

    // --- Drone Input & Thrust ---
    const up = isKeyDown(["KeyW", "ArrowUp"]);
    const down = isKeyDown(["KeyS", "ArrowDown"]);
    const left = isKeyDown(["KeyA", "ArrowLeft"]);
    const right = isKeyDown(["KeyD", "ArrowRight"]);
    const toggleTether = wasJustPressed(["Space", "KeyE"]);

    drone.thrustInput = { up, down, left, right };
    drone.isThrusting = up || down || left || right;

    // Throttle calculation for audio rotor modulation
    let throttleFactor = 0;
    if (up) throttleFactor += 0.7;
    if (left || right) throttleFactor += 0.3;
    if (down) throttleFactor += 0.2;
    Audio.updateRotor(throttleFactor);

    // Battery Drain System
    let batteryDrainRate = 0.28; // Passive baseline drain (%/s)
    if (drone.isThrusting) batteryDrainRate += 1.45;
    if (up) batteryDrainRate += 0.45;
    if (drone.tetheredCargo) {
      // Lifting weight drains extra battery
      batteryDrainRate += 0.55 * drone.tetheredCargo.mass;
    }

    battery = Math.max(0, battery - batteryDrainRate * dt);
    if (battery < 20) {
      Audio.playBatteryWarning();
    }
    if (battery <= 0) {
      triggerGameOver("BATTERY DEPLETED // POWER SYSTEMS SHUTDOWN");
      clearJustPressed();
      return;
    }

    // --- Drone Aerodynamics & Acceleration ---
    let droneAx = 0;
    let droneAy = GRAVITY;

    if (up) droneAy += LIFT_ACCEL;
    if (down) droneAy += DOWN_ACCEL;
    if (left) droneAx -= HORIZ_ACCEL;
    if (right) droneAx += HORIZ_ACCEL;

    // Apply wind forces inside wind zones
    windZones.forEach(wz => {
      if (
        drone.x >= wz.x &&
        drone.x <= wz.x + wz.w &&
        drone.y >= wz.y &&
        drone.y <= wz.y + wz.h
      ) {
        droneAx += wz.currentForceX * 0.75;
        droneAy += wz.currentForceY * 0.75;
      }
    });

    drone.vx += droneAx * dt;
    drone.vy += droneAy * dt;

    drone.vx *= Math.pow(DRAG_X, dt * 60);
    drone.vy *= Math.pow(DRAG_Y, dt * 60);

    // Drone tilt angle smoothing tied to horizontal velocity
    const targetTilt = Math.max(-0.42, Math.min(0.42, drone.vx * 0.0016));
    drone.angle += (targetTilt - drone.angle) * 0.16;

    // Integrate Drone Position
    drone.x += drone.vx * dt;
    drone.y += drone.vy * dt;

    // Drone World Bounds
    const halfW = drone.w / 2;
    const halfH = drone.h / 2;

    if (drone.x < halfW) {
      drone.x = halfW;
      drone.vx = Math.abs(drone.vx) * 0.3;
    } else if (drone.x > 1280 - halfW) {
      drone.x = 1280 - halfW;
      drone.vx = -Math.abs(drone.vx) * 0.3;
    }

    if (drone.y < halfH) {
      drone.y = halfH;
      drone.vy = Math.abs(drone.vy) * 0.3;
    } else if (drone.y > 720 - halfH) {
      drone.y = 720 - halfH;
      drone.vy = -Math.abs(drone.vy) * 0.3;
    }

    // Drone Platform Collisions
    platforms.forEach(plat => {
      resolveBoxCollision(drone, plat, (impactSpeed) => {
        if (impactSpeed > 115) {
          const dmg = Math.floor((impactSpeed - 115) * 0.22) + 2;
          hull = Math.max(0, hull - dmg);
          Audio.playImpact(impactSpeed / 160);
          window.Stormline.Renderer.addScreenShake(Math.min(16, dmg * 0.9));
          window.Stormline.Renderer.spawnSparks(drone.x, drone.y + halfH, 8);

          if (hull <= 0) {
            triggerGameOver("HULL INTEGRITY COMPROMISED // STRUCTURAL FAILURE");
          }
        }
      });
    });

    // --- Tether Pickup Range & Toggle ---
    const droneAnchorX = drone.x;
    const droneAnchorY = drone.y + halfH;

    drone.pickupCandidate = null;

    if (!drone.tetheredCargo) {
      let closestDist = Infinity;
      cargoList.forEach(crate => {
        if (crate.delivered || crate.broken) return;

        const crateAnchorX = crate.x;
        const crateAnchorY = crate.y - crate.h / 2;
        const dx = crateAnchorX - droneAnchorX;
        const dy = crateAnchorY - droneAnchorY;
        const dist = Math.hypot(dx, dy);

        // Pickup range: directly above/near the crate within 68px
        if (dist < 68 && Math.abs(dx) < 45 && dy > -15 && dist < closestDist) {
          closestDist = dist;
          drone.pickupCandidate = crate;
        }
      });

      if (toggleTether && drone.pickupCandidate) {
        drone.tetheredCargo = drone.pickupCandidate;
        drone.tetheredCargo.isResting = false;
        Audio.playGrappleLock();
        window.Stormline.Renderer.spawnSparks(droneAnchorX, droneAnchorY, 6, "#00f0ff");
      }
    } else {
      if (toggleTether) {
        // Disengage tether
        drone.tetheredCargo = null;
        Audio.playRelease();
      }
    }

    // --- Tether Physics Simulation ---
    if (drone.tetheredCargo) {
      const crate = drone.tetheredCargo;
      const crateAnchorX = crate.x;
      const crateAnchorY = crate.y - crate.h / 2;

      const dx = crateAnchorX - droneAnchorX;
      const dy = crateAnchorY - droneAnchorY;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        const nx = dx / dist;
        const ny = dy / dist;

        if (dist > TETHER.REST_LENGTH) {
          const stretch = dist - TETHER.REST_LENGTH;
          const relVx = crate.vx - drone.vx;
          const relVy = crate.vy - drone.vy;
          const damp = (relVx * nx + relVy * ny) * TETHER.DAMPER_C;
          const springForce = Math.max(0, stretch * TETHER.SPRING_K + damp);

          // Force on crate (directed towards drone)
          crate.vx -= (springForce * nx / crate.mass) * dt;
          crate.vy -= (springForce * ny / crate.mass) * dt;

          // Reaction force on drone (directed towards crate)
          drone.vx += (springForce * nx / drone.mass) * dt;
          drone.vy += (springForce * ny / drone.mass) * dt;
        }

        // Hard distance constraint clamp to prevent slingshot instability
        if (dist > TETHER.MAX_LENGTH) {
          const excess = dist - TETHER.MAX_LENGTH;
          crate.x -= nx * excess * 0.65;
          crate.y -= ny * excess * 0.65;
          drone.x += nx * excess * 0.35;
          drone.y += ny * excess * 0.35;
        }
      }
    }

    // --- Drop Zone Alignment Detection ---
    drone.isOverDropZone = false;
    if (dropZone && drone.tetheredCargo) {
      const carried = drone.tetheredCargo;
      if (
        carried.x >= dropZone.x &&
        carried.x <= dropZone.x + dropZone.w &&
        carried.y < dropZone.y + 10
      ) {
        drone.isOverDropZone = true;
      }
    }

    // --- Cargo Crates Physics & Delivery Checks ---
    cargoList.forEach(crate => {
      if (crate.delivered || crate.broken) return;

      // Gravity & Drag
      crate.vy += GRAVITY * dt;
      crate.vx *= Math.pow(0.985, dt * 60);
      crate.vy *= Math.pow(0.992, dt * 60);

      // Wind effects on cargo
      windZones.forEach(wz => {
        if (
          crate.x >= wz.x &&
          crate.x <= wz.x + wz.w &&
          crate.y >= wz.y &&
          crate.y <= wz.y + wz.h
        ) {
          crate.vx += (wz.currentForceX * (1.1 / crate.mass)) * dt;
          crate.vy += (wz.currentForceY * (1.1 / crate.mass)) * dt;
        }
      });

      // Integrate Position
      crate.x += crate.vx * dt;
      crate.y += crate.vy * dt;

      // Screen boundary clamp
      const cHalfW = crate.w / 2;
      const cHalfH = crate.h / 2;
      if (crate.x < cHalfW) {
        crate.x = cHalfW;
        crate.vx = 0;
      } else if (crate.x > 1280 - cHalfW) {
        crate.x = 1280 - cHalfW;
        crate.vx = 0;
      }
      if (crate.y > 720 - cHalfH) {
        crate.y = 720 - cHalfH;
        crate.vy = 0;
      }

      // Terrain Collisions for Cargo
      platforms.forEach(plat => {
        resolveBoxCollision(crate, plat, (impactSpeed) => {
          if (impactSpeed > 60) {
            Audio.playImpact(impactSpeed / 180);
          }

          // Fragile Core breakage condition
          if (crate.type === "fragile" && impactSpeed > crate.safeSpeed) {
            crate.broken = true;
            if (drone.tetheredCargo === crate) {
              drone.tetheredCargo = null;
            }
            Audio.playFragileBreak();
            window.Stormline.Renderer.spawnShatter(crate.x, crate.y, 25, "#c084fc");
            window.Stormline.Renderer.addScreenShake(14);
            triggerGameOver("CRITICAL QUANTUM CORE SHATTERED ON IMPACT");
          }
        });
      });

      // Delivery Zone Detection
      if (dropZone && !crate.delivered && !crate.broken) {
        const bottomY = crate.y + crate.h / 2;
        const onPadY = Math.abs(bottomY - dropZone.y) < 14;
        const withinPadX = crate.x >= dropZone.x + 8 && crate.x <= dropZone.x + dropZone.w - 8;
        const speedLow = Math.hypot(crate.vx, crate.vy) < 70;

        if (onPadY && withinPadX && speedLow) {
          // Soft landing detected on target drop zone
          crate.delivered = true;
          crate.vx = 0;
          crate.vy = 0;
          crate.y = dropZone.y - crate.h / 2;

          // Detach tether if it was attached
          if (drone.tetheredCargo === crate) {
            drone.tetheredCargo = null;
          }

          // Calculate Delivery Scores
          const baseScore = 1000;
          let precisionBonus = 0;
          const landingSpeed = Math.hypot(crate.vx, crate.vy);

          if (landingSpeed < 25) {
            precisionBonus += 350;
            window.Stormline.Renderer.addFloatingText(crate.x, crate.y - 20, "+350 PERFECT SOFT DROP", "#00ff88");
          } else {
            precisionBonus += 150;
            window.Stormline.Renderer.addFloatingText(crate.x, crate.y - 20, "+150 SMOOTH TOUCHDOWN", "#00f0ff");
          }

          const padCenter = dropZone.x + dropZone.w / 2;
          if (Math.abs(crate.x - padCenter) < 25) {
            precisionBonus += 250;
            window.Stormline.Renderer.addFloatingText(crate.x, crate.y - 40, "+250 BULLSEYE CENTER", "#ffb700");
          }

          window.Stormline.Renderer.addFloatingText(crate.x, crate.y - 60, `+${baseScore} CARGO SECURED`, "#ffffff");

          currentLevelScore += baseScore + precisionBonus;
          deliveredCount++;

          Audio.playDelivery();
          window.Stormline.Renderer.spawnSparks(crate.x, crate.y, 20, "#00ff88");

          // Check if all required cargo is delivered
          if (deliveredCount >= activeLevel.requiredDeliveries) {
            completeLevel();
          }
        }
      }
    });

    clearJustPressed();
  }

  // Resolve AABB penetration and collision impulse
  function resolveBoxCollision(entity, box, onImpactCallback) {
    const eHalfW = entity.w / 2;
    const eHalfH = entity.h / 2;

    const bLeft = box.x;
    const bRight = box.x + box.w;
    const bTop = box.y;
    const bBottom = box.y + box.h;

    const eLeft = entity.x - eHalfW;
    const eRight = entity.x + eHalfW;
    const eTop = entity.y - eHalfH;
    const eBottom = entity.y + eHalfH;

    // Check intersection
    if (eRight > bLeft && eLeft < bRight && eBottom > bTop && eTop < bBottom) {
      // Penetration distances
      const penLeft = eRight - bLeft;
      const penRight = bRight - eLeft;
      const penTop = eBottom - bTop;
      const penBottom = bBottom - eTop;

      const minPen = Math.min(penLeft, penRight, penTop, penBottom);

      if (minPen === penTop) {
        // Landed on top surface
        entity.y = bTop - eHalfH;
        if (entity.vy > 0) {
          if (onImpactCallback) onImpactCallback(entity.vy);
          entity.vy = -entity.vy * 0.2;
          if (Math.abs(entity.vy) < 18) entity.vy = 0;
        }
        entity.vx *= 0.85; // Ground friction
      } else if (minPen === penBottom) {
        // Hit bottom ceiling
        entity.y = bBottom + eHalfH;
        if (entity.vy < 0) {
          if (onImpactCallback) onImpactCallback(-entity.vy);
          entity.vy = -entity.vy * 0.2;
        }
      } else if (minPen === penLeft) {
        // Hit left wall
        entity.x = bLeft - eHalfW;
        if (entity.vx > 0) {
          if (onImpactCallback) onImpactCallback(entity.vx);
          entity.vx = -entity.vx * 0.25;
        }
      } else if (minPen === penRight) {
        // Hit right wall
        entity.x = bRight + eHalfW;
        if (entity.vx < 0) {
          if (onImpactCallback) onImpactCallback(-entity.vx);
          entity.vx = -entity.vx * 0.25;
        }
      }
    }
  }

  // Trigger Mission Failure
  function triggerGameOver(reason) {
    gameOverReason = reason;
    Audio.playGameOver();
    setState(STATES.GAME_OVER);
  }

  // Level Clear calculation and progression
  function completeLevel() {
    Audio.playVictory();

    const cratesScore = deliveredCount * 1000;
    const precisionScore = Math.max(0, currentLevelScore - cratesScore);
    const batteryBonus = Math.floor(battery * 22);
    const timeBonus = Math.floor(timeRemaining * 18);
    const totalLevelScore = cratesScore + precisionScore + batteryBonus + timeBonus;

    grandTotalScore += totalLevelScore;

    lastScoreBreakdown = {
      cratesScore,
      precisionScore,
      batteryBonus,
      timeBonus,
      totalLevelScore
    };

    setTimeout(() => {
      if (currentLevelIndex >= Levels.length - 1) {
        setState(STATES.VICTORY);
      } else {
        setState(STATES.LEVEL_CLEAR);
      }
    }, 900);
  }

  function advanceToNextLevel() {
    if (currentLevelIndex < Levels.length - 1) {
      loadLevel(currentLevelIndex + 1);
    } else {
      setState(STATES.VICTORY);
    }
  }

  function restartCurrentLevel() {
    loadLevel(currentLevelIndex);
  }

  return {
    STATES,
    getState: () => currentState,
    setState,
    getCurrentLevelIndex: () => currentLevelIndex,
    getActiveLevel: () => activeLevel,
    getPlatforms: () => platforms,
    getWindZones: () => windZones,
    getCargoList: () => cargoList,
    getDropZone: () => dropZone,
    getPickupPads: () => pickupPads,
    getDrone: () => drone,
    getBattery: () => battery,
    getHull: () => hull,
    getTimeRemaining: () => timeRemaining,
    getDeliveredCount: () => deliveredCount,
    getCurrentScore: () => currentLevelScore,
    getGrandTotalScore: () => grandTotalScore,
    getGameOverReason: () => gameOverReason,
    getLastScoreBreakdown: () => lastScoreBreakdown,
    setKeyState,
    loadLevel,
    update,
    advanceToNextLevel,
    restartCurrentLevel,
    registerStateChangeCallback: (cb) => { onStateChangeCallback = cb; }
  };
})();
