/* ==========================================================================
   STORMLINE - Procedural Visual Renderer
   Layered mountain silhouettes, weather ribbons, drone particles, and top HUD.
   ========================================================================== */

window.Stormline = window.Stormline || {};

window.Stormline.Renderer = (function () {
  // Screen shake state
  let shakeIntensity = 0;
  let shakeOffset = { x: 0, y: 0 };

  // Visual particles
  const particles = [];
  const floatingTexts = [];

  // Weather simulation
  const RAIN_COUNT = 140;
  const raindrops = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    raindrops.push({
      x: Math.random() * 1280,
      y: Math.random() * 720,
      length: 12 + Math.random() * 16,
      speed: 550 + Math.random() * 350
    });
  }

  // Wind ribbons
  const ribbons = [];
  for (let i = 0; i < 24; i++) {
    ribbons.push({
      x: Math.random() * 1280,
      y: Math.random() * 720,
      length: 40 + Math.random() * 60,
      speed: 120 + Math.random() * 160,
      alpha: 0.15 + Math.random() * 0.25
    });
  }

  // Lightning effect state
  let lightningAlpha = 0;
  let lightningTimer = 0;

  // Rotor animation angle
  let rotorSpinAngle = 0;

  // Add screen shake
  function addScreenShake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
  }

  // Spawn spark particles
  function spawnSparks(x, y, count = 10, color = "#ffb700") {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 180;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        color,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.4
      });
    }
  }

  // Spawn shatter glass debris
  function spawnShatter(x, y, count = 25, color = "#c084fc") {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 3 + Math.random() * 5,
        color,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
        isDebris: true,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 15
      });
    }
  }

  // Spawn thruster exhaust particles
  function spawnThrusterParticles(x, y, dirX, dirY, color = "#00f0ff") {
    for (let i = 0; i < 2; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = 120 + Math.random() * 140;
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: dirX * speed + spread * 40,
        vy: dirY * speed + spread * 40,
        size: 2.5 + Math.random() * 3,
        color,
        life: 0,
        maxLife: 0.18 + Math.random() * 0.14
      });
    }
  }

  // Add floating score text
  function addFloatingText(x, y, text, color = "#00f0ff") {
    floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 1.4,
      vy: -45
    });
  }

  // Main Render Routine
  function render(ctx, Game) {
    const dt = 1 / 60; // Approximate animation delta
    const level = Game.getActiveLevel();
    if (!level) return;

    // --- Screen Shake Update ---
    if (shakeIntensity > 0) {
      shakeOffset.x = (Math.random() - 0.5) * shakeIntensity * 2;
      shakeOffset.y = (Math.random() - 0.5) * shakeIntensity * 2;
      shakeIntensity = Math.max(0, shakeIntensity - 24 * dt);
    } else {
      shakeOffset.x = 0;
      shakeOffset.y = 0;
    }

    ctx.save();
    ctx.translate(shakeOffset.x, shakeOffset.y);

    // 1. Draw Layered Sky & Mountains
    drawAtmosphere(ctx, level, dt);

    // 2. Draw Wind Ribbon Hazard Fields
    drawWindZones(ctx, Game.getWindZones(), dt);

    // 3. Draw Terrain Platforms & Drop Zones
    drawTerrainAndDropZones(ctx, Game);

    // 4. Draw Weather Rain
    drawWeather(ctx, level, Game.getWindZones(), dt);

    // 5. Draw Cargo Crates & Pickup Indicators
    drawCargo(ctx, Game);

    // 6. Draw Tether Cable
    drawTether(ctx, Game);

    // 7. Draw Player Drone
    drawDrone(ctx, Game, dt);

    // 8. Update & Draw Visual Particles
    drawParticles(ctx, dt);

    // 9. Floating Score Popups
    drawFloatingTexts(ctx, dt);

    ctx.restore();

    // 10. Draw Top HUD (Not affected by screen shake)
    drawHUD(ctx, Game);
  }

  // Atmospheric Sky & Mountain Silhouettes
  function drawAtmosphere(ctx, level, dt) {
    const weather = level.weather || {};
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 720);
    skyGrad.addColorStop(0, weather.skyTop || "#0c1322");
    skyGrad.addColorStop(1, weather.skyBottom || "#222030");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Lightning Flash in Level 3
    if (weather.lightning) {
      lightningTimer += dt;
      if (lightningTimer > 5.5 + Math.random() * 4) {
        lightningAlpha = 0.65;
        lightningTimer = 0;
      }
      if (lightningAlpha > 0) {
        ctx.fillStyle = `rgba(220, 240, 255, ${lightningAlpha})`;
        ctx.fillRect(0, 0, 1280, 720);
        lightningAlpha = Math.max(0, lightningAlpha - 3.5 * dt);
      }
    }

    // Far Mountain Silhouette
    ctx.fillStyle = weather.mountainFar || "#161b2b";
    ctx.beginPath();
    ctx.moveTo(0, 720);
    ctx.lineTo(0, 360);
    ctx.lineTo(180, 280);
    ctx.lineTo(340, 350);
    ctx.lineTo(520, 240);
    ctx.lineTo(690, 340);
    ctx.lineTo(880, 260);
    ctx.lineTo(1080, 330);
    ctx.lineTo(1280, 270);
    ctx.lineTo(1280, 720);
    ctx.closePath();
    ctx.fill();

    // Mid Mountain Silhouette with Ridge Glow
    ctx.fillStyle = weather.mountainMid || "#0f131f";
    ctx.beginPath();
    ctx.moveTo(0, 720);
    ctx.lineTo(0, 480);
    ctx.lineTo(140, 410);
    ctx.lineTo(300, 490);
    ctx.lineTo(460, 380);
    ctx.lineTo(650, 470);
    ctx.lineTo(820, 390);
    ctx.lineTo(1040, 480);
    ctx.lineTo(1280, 420);
    ctx.lineTo(1280, 720);
    ctx.closePath();
    ctx.fill();

    // Subtle Ridge Edge Highlight
    ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Distant valley fog
    const fogGrad = ctx.createLinearGradient(0, 450, 0, 720);
    fogGrad.addColorStop(0, "rgba(20, 30, 45, 0)");
    fogGrad.addColorStop(1, "rgba(10, 16, 26, 0.6)");
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 450, 1280, 270);
  }

  // Draw Wind Zone Hazard Fields
  function drawWindZones(ctx, windZones, dt) {
    if (!windZones || windZones.length === 0) return;

    windZones.forEach(wz => {
      // Wind bounding box highlight
      ctx.save();
      const fx = wz.currentForceX !== undefined ? wz.currentForceX : wz.forceX;
      const isTurbulent = wz.shifting || Math.abs(fx) > 60;

      const fillAlpha = isTurbulent ? 0.08 : 0.04;
      ctx.fillStyle = isTurbulent ? `rgba(255, 183, 0, ${fillAlpha})` : `rgba(0, 240, 255, ${fillAlpha})`;
      ctx.fillRect(wz.x, wz.y, wz.w, wz.h);

      // Border dashed indicators
      ctx.strokeStyle = isTurbulent ? "rgba(255, 183, 0, 0.25)" : "rgba(0, 240, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(wz.x, wz.y, wz.w, wz.h);
      ctx.setLineDash([]);

      // Wind Flow Ribbons inside the zone
      const speed = fx * 2.2;
      ribbons.forEach(rib => {
        if (rib.x < wz.x) rib.x = wz.x + wz.w;
        if (rib.x > wz.x + wz.w) rib.x = wz.x;
        if (rib.y < wz.y || rib.y > wz.y + wz.h) {
          rib.y = wz.y + Math.random() * wz.h;
        }

        rib.x += speed * dt;

        ctx.strokeStyle = isTurbulent
          ? `rgba(255, 200, 80, ${rib.alpha * 0.8})`
          : `rgba(0, 240, 255, ${rib.alpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rib.x, rib.y);
        ctx.lineTo(rib.x + (fx > 0 ? -rib.length : rib.length), rib.y + Math.sin(rib.x * 0.02) * 5);
        ctx.stroke();

        // Small directional arrowhead
        if (Math.abs(fx) > 20) {
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          const arrowDir = fx > 0 ? 1 : -1;
          ctx.moveTo(rib.x, rib.y);
          ctx.lineTo(rib.x - arrowDir * 6, rib.y - 3);
          ctx.lineTo(rib.x - arrowDir * 6, rib.y + 3);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Label at top left of wind zone
      ctx.fillStyle = isTurbulent ? "#ffb700" : "#00f0ff";
      ctx.font = "bold 10px Consolas, monospace";
      ctx.letterSpacing = "2px";
      const forceDisplay = `${Math.round(Math.abs(fx))} KTS`;
      ctx.fillText(`${wz.label} [${forceDisplay} ${fx > 0 ? "EAST" : "WEST"}]`, wz.x + 12, wz.y + 20);

      ctx.restore();
    });
  }

  // Draw Platforms, Pickup Pads, and Target Drop Zones
  function drawTerrainAndDropZones(ctx, Game) {
    const platforms = Game.getPlatforms();
    const dropZone = Game.getDropZone();
    const pickupPads = Game.getPickupPads();
    const drone = Game.getDrone();

    // 1. Draw Platforms
    platforms.forEach(plat => {
      ctx.save();

      // Platform body gradient
      const bodyGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
      bodyGrad.addColorStop(0, "#192231");
      bodyGrad.addColorStop(0.2, "#101622");
      bodyGrad.addColorStop(1, "#090d14");

      ctx.fillStyle = bodyGrad;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

      // Top edge landing surface
      ctx.fillStyle = "#27354a";
      ctx.fillRect(plat.x, plat.y, plat.w, 4);

      // Top glowing edge line
      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y);
      ctx.lineTo(plat.x + plat.w, plat.y);
      ctx.stroke();

      // Hazard chevrons on cliff bevel
      ctx.fillStyle = "rgba(255, 183, 0, 0.2)";
      for (let cx = plat.x + 10; cx < plat.x + plat.w - 15; cx += 28) {
        ctx.beginPath();
        ctx.moveTo(cx, plat.y + 5);
        ctx.lineTo(cx + 8, plat.y + 5);
        ctx.lineTo(cx + 14, plat.y + 11);
        ctx.lineTo(cx + 6, plat.y + 11);
        ctx.closePath();
        ctx.fill();
      }

      // Structural panel grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let px = plat.x + 40; px < plat.x + plat.w; px += 40) {
        ctx.beginPath();
        ctx.moveTo(px, plat.y + 12);
        ctx.lineTo(px, plat.y + plat.h);
        ctx.stroke();
      }

      // Platform label
      if (plat.label) {
        ctx.fillStyle = "rgba(139, 155, 180, 0.4)";
        ctx.font = "bold 9px Consolas, monospace";
        ctx.fillText(plat.label, plat.x + 12, plat.y + 24);
      }

      ctx.restore();
    });

    // 2. Draw Pickup Pads
    pickupPads.forEach(pad => {
      ctx.save();
      ctx.fillStyle = "rgba(0, 240, 255, 0.15)";
      ctx.fillRect(pad.x, pad.y - pad.h, pad.w, pad.h);

      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(pad.x, pad.y - pad.h, pad.w, pad.h);

      // Glowing corner brackets
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(pad.x - 2, pad.y - pad.h - 2, 6, 6);
      ctx.fillRect(pad.x + pad.w - 4, pad.y - pad.h - 2, 6, 6);

      ctx.restore();
    });

    // 3. Draw Target Drop Zone
    if (dropZone) {
      ctx.save();

      const isLocked = drone.isOverDropZone;
      const padColor = isLocked ? "#00ff88" : "#00f0ff";

      // Surface pad
      ctx.fillStyle = isLocked ? "rgba(0, 255, 136, 0.25)" : "rgba(0, 240, 255, 0.15)";
      ctx.fillRect(dropZone.x, dropZone.y - 6, dropZone.w, dropZone.h);

      ctx.strokeStyle = padColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = padColor;
      ctx.shadowBlur = isLocked ? 18 : 8;
      ctx.strokeRect(dropZone.x, dropZone.y - 6, dropZone.w, dropZone.h);
      ctx.shadowBlur = 0;

      // Animated Chevrons pointing downward
      const chevronTime = (Date.now() * 0.003) % 1;
      const chevronY = dropZone.y - 12 - chevronTime * 14;

      ctx.fillStyle = padColor;
      for (let i = 0; i < 3; i++) {
        const cx = dropZone.x + dropZone.w * (0.25 + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(cx - 7, chevronY);
        ctx.lineTo(cx, chevronY + 7);
        ctx.lineTo(cx + 7, chevronY);
        ctx.lineTo(cx + 4, chevronY - 2);
        ctx.lineTo(cx, chevronY + 3);
        ctx.lineTo(cx - 4, chevronY - 2);
        ctx.closePath();
        ctx.fill();
      }

      // Visual Lock-on Guide Beam when hovering with cargo
      if (isLocked && drone.tetheredCargo) {
        const carried = drone.tetheredCargo;

        // Upward laser guidance columns
        const beamGrad = ctx.createLinearGradient(0, dropZone.y, 0, carried.y);
        beamGrad.addColorStop(0, "rgba(0, 255, 136, 0.35)");
        beamGrad.addColorStop(1, "rgba(0, 255, 136, 0.02)");

        ctx.fillStyle = beamGrad;
        ctx.fillRect(dropZone.x + 8, carried.y, dropZone.w - 16, dropZone.y - carried.y);

        // Vertical guide line lasers
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(dropZone.x + 10, dropZone.y);
        ctx.lineTo(dropZone.x + 10, carried.y);
        ctx.moveTo(dropZone.x + dropZone.w - 10, dropZone.y);
        ctx.lineTo(dropZone.x + dropZone.w - 10, carried.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target HUD prompt
        ctx.fillStyle = "#00ff88";
        ctx.font = "bold 11px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText(">> DOCKING GUIDES LOCKED // LOWER CRATE <<", dropZone.x + dropZone.w / 2, dropZone.y + 34);
        ctx.textAlign = "left";
      }

      // Label below pad
      ctx.fillStyle = padColor;
      ctx.font = "bold 10px Consolas, monospace";
      ctx.fillText(dropZone.label || "TARGET LZ", dropZone.x + 14, dropZone.y + 26);

      ctx.restore();
    }
  }

  // Draw Weather Raindrops
  function drawWeather(ctx, level, windZones, dt) {
    const weather = level.weather || {};
    const intensity = weather.rainIntensity || 0.4;
    const globalWindX = weather.ambientWind ? weather.ambientWind.x : 20;

    ctx.save();
    ctx.strokeStyle = "rgba(180, 220, 255, 0.35)";
    ctx.lineWidth = 1.2;

    const activeDrops = Math.floor(RAIN_COUNT * intensity);
    for (let i = 0; i < activeDrops; i++) {
      const drop = raindrops[i];
      drop.y += drop.speed * dt;
      drop.x += globalWindX * 0.8 * dt;

      if (drop.y > 720) {
        drop.y = -20;
        drop.x = Math.random() * 1280;
      }
      if (drop.x > 1280) drop.x = 0;
      if (drop.x < 0) drop.x = 1280;

      const slant = (globalWindX / 100) * drop.length;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + slant, drop.y + drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Cargo Crates & Pickup HUD Brackets
  function drawCargo(ctx, Game) {
    const cargoList = Game.getCargoList();
    const drone = Game.getDrone();

    cargoList.forEach(crate => {
      if (crate.broken) return;

      ctx.save();
      ctx.translate(crate.x, crate.y);

      const halfW = crate.w / 2;
      const halfH = crate.h / 2;

      // Base Crate Box Styling according to Type
      if (crate.type === "standard") {
        // Standard Medical Box (Cyan & Clean White)
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-halfW, -halfH, crate.w, crate.h);

        ctx.strokeStyle = crate.delivered ? "#00ff88" : "#00f0ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfW, -halfH, crate.w, crate.h);

        // Medical Cross Symbol
        ctx.fillStyle = "#00f0ff";
        ctx.fillRect(-4, -8, 8, 16);
        ctx.fillRect(-8, -4, 16, 8);
      } else if (crate.type === "light") {
        // Light Medical Serum (Emerald & Compact)
        ctx.fillStyle = "#0f291e";
        ctx.fillRect(-halfW, -halfH, crate.w, crate.h);

        ctx.strokeStyle = crate.delivered ? "#00ff88" : "#4ade80";
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfW, -halfH, crate.w, crate.h);

        // Core light icon
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (crate.type === "heavy") {
        // Heavy Generator (Dark Metal + Hazard Amber Stripes)
        ctx.fillStyle = "#1c1917";
        ctx.fillRect(-halfW, -halfH, crate.w, crate.h);

        ctx.strokeStyle = crate.delivered ? "#00ff88" : "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-halfW, -halfH, crate.w, crate.h);

        // Diagonal hazard stripes inside
        ctx.fillStyle = "rgba(245, 158, 11, 0.4)";
        ctx.beginPath();
        ctx.moveTo(-halfW + 4, halfH);
        ctx.lineTo(-halfW + 12, -halfH);
        ctx.lineTo(-halfW + 18, -halfH);
        ctx.lineTo(-halfW + 10, halfH);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(halfW - 18, halfH);
        ctx.lineTo(halfW - 10, -halfH);
        ctx.lineTo(halfW - 4, -halfH);
        ctx.lineTo(halfW - 12, halfH);
        ctx.closePath();
        ctx.fill();

        // Central Power core
        ctx.fillStyle = "#ffb700";
        ctx.fillRect(-4, -4, 8, 8);
      } else if (crate.type === "fragile") {
        // Fragile Quantum Core (Glowing Glass & Violet Plasma)
        ctx.fillStyle = "rgba(76, 29, 149, 0.4)";
        ctx.fillRect(-halfW, -halfH, crate.w, crate.h);

        ctx.strokeStyle = crate.delivered ? "#00ff88" : "#c084fc";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#c084fc";
        ctx.shadowBlur = 8;
        ctx.strokeRect(-halfW, -halfH, crate.w, crate.h);
        ctx.shadowBlur = 0;

        // Pulsating quantum core
        const pulse = 0.8 + Math.sin(Date.now() * 0.008) * 0.2;
        ctx.fillStyle = "#e879f9";
        ctx.beginPath();
        ctx.arc(0, 0, 6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Caution fragile tick marks
        ctx.fillStyle = "#c084fc";
        ctx.fillRect(-halfW + 2, -halfH + 2, 3, 3);
        ctx.fillRect(halfW - 5, -halfH + 2, 3, 3);
      }

      // Top Magnetic Latch Eyelet
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(-5, -halfH - 4, 10, 4);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(-5, -halfH - 4, 10, 4);

      // Delivered status lock indicator
      if (crate.delivered) {
        ctx.fillStyle = "#00ff88";
        ctx.font = "bold 9px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText("SECURED", 0, halfH + 12);
      }

      ctx.restore();

      // On-Screen Pickup Prompt when Hovering in Range
      if (drone.pickupCandidate === crate && !drone.tetheredCargo && !crate.delivered) {
        ctx.save();
        ctx.translate(crate.x, crate.y);

        // Holographic Target Ring
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, crate.w + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Interactive HUD Prompt Banner
        ctx.fillStyle = "#00f0ff";
        ctx.font = "bold 11px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText("[SPACE / E] ENGAGE TETHER", 0, -crate.h / 2 - 20);

        ctx.restore();
      }
    });
  }

  // Draw Damped Magnetic Tether Cable
  function drawTether(ctx, Game) {
    const drone = Game.getDrone();
    if (!drone.tetheredCargo) return;

    const crate = drone.tetheredCargo;
    const droneAnchorX = drone.x;
    const droneAnchorY = drone.y + drone.h / 2;
    const crateAnchorX = crate.x;
    const crateAnchorY = crate.y - crate.h / 2;

    ctx.save();

    // Calculate distance and strain
    const dist = Math.hypot(crateAnchorX - droneAnchorX, crateAnchorY - droneAnchorY);
    const strain = Math.max(0, (dist - 52) / 28);
    const tetherColor = strain > 0.6 ? "#ffb700" : "#00f0ff";

    // Glowing core cable
    ctx.strokeStyle = tetherColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = tetherColor;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(droneAnchorX, droneAnchorY);

    // Subtle catenary curve or tension sag
    const midX = (droneAnchorX + crateAnchorX) / 2;
    const sag = (1 - Math.min(1, strain)) * 4;
    const midY = (droneAnchorY + crateAnchorY) / 2 + sag;
    ctx.quadraticCurveTo(midX, midY, crateAnchorX, crateAnchorY);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Magnetic Emitter node on drone
    ctx.fillStyle = tetherColor;
    ctx.beginPath();
    ctx.arc(droneAnchorX, droneAnchorY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Hook node on crate
    ctx.beginPath();
    ctx.arc(crateAnchorX, crateAnchorY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw Drone Aerodynamic Chassis, Rotors, Thrusters, Visor
  function drawDrone(ctx, Game, dt) {
    const drone = Game.getDrone();
    rotorSpinAngle += 28 * dt;

    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);

    const halfW = drone.w / 2;
    const halfH = drone.h / 2;

    // 1. Thruster Exhaust Particles Generation
    const thrust = drone.thrustInput;
    if (thrust.up) {
      spawnThrusterParticles(drone.x - 14, drone.y + halfH, 0, 1, "#00f0ff");
      spawnThrusterParticles(drone.x + 14, drone.y + halfH, 0, 1, "#00f0ff");
    }
    if (thrust.left) {
      spawnThrusterParticles(drone.x + halfW, drone.y, 1, 0, "#ffb700");
    }
    if (thrust.right) {
      spawnThrusterParticles(drone.x - halfW, drone.y, -1, 0, "#ffb700");
    }

    // 2. Central Fuselage Body
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(-halfW + 8, -halfH);
    ctx.lineTo(halfW - 8, -halfH);
    ctx.lineTo(halfW, 2);
    ctx.lineTo(halfW - 10, halfH);
    ctx.lineTo(-halfW + 10, halfH);
    ctx.lineTo(-halfW, 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Glowing Visor / Cockpit Sensor Eye
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, -3, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. Rotor Booms (Left & Right)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-halfW - 6, -6, 10, 4);
    ctx.fillRect(halfW - 4, -6, 10, 4);

    // 5. Animated Spinning Rotor Propeller Disks
    drawRotorPropeller(ctx, -halfW - 1, -6, rotorSpinAngle);
    drawRotorPropeller(ctx, halfW + 1, -6, -rotorSpinAngle);

    // 6. Bottom Magnetic Winch Housing
    ctx.fillStyle = "#334155";
    ctx.fillRect(-6, halfH - 2, 12, 4);
    ctx.fillStyle = drone.tetheredCargo ? "#00f0ff" : "#64748b";
    ctx.fillRect(-3, halfH + 2, 6, 2);

    ctx.restore();
  }

  // Draw Individual Rotor Blade Motion Blur
  function drawRotorPropeller(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);

    // Blurred rotor disk
    ctx.fillStyle = "rgba(0, 240, 255, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spinning Blade Tick Lines
    ctx.strokeStyle = "rgba(240, 246, 252, 0.6)";
    ctx.lineWidth = 1.5;
    const bladeOffset = Math.cos(angle) * 15;
    ctx.beginPath();
    ctx.moveTo(-bladeOffset, 0);
    ctx.lineTo(bladeOffset, 0);
    ctx.stroke();

    // Hub pin
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw Particles (Sparks, Debris, Exhaust)
  function drawParticles(ctx, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.isDebris) {
        p.vy += 320 * dt; // Gravity on shattered pieces
        p.rot += p.rotSpeed * dt;
      }

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;

      if (p.isDebris) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Draw Floating Score Popups
  function drawFloatingTexts(ctx, dt) {
    ctx.save();
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        floatingTexts.splice(i, 1);
        continue;
      }

      ft.y += ft.vy * dt;
      const alpha = Math.max(0, 1 - ft.life / ft.maxLife);

      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.font = "bold 13px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  // Draw Crisp Aviation Tactical HUD
  function drawHUD(ctx, Game) {
    const level = Game.getActiveLevel();
    if (!level) return;

    const battery = Game.getBattery();
    const hull = Game.getHull();
    const timeRemaining = Game.getTimeRemaining();
    const delivered = Game.getDeliveredCount();
    const totalCargo = level.requiredDeliveries;
    const score = Game.getCurrentScore();
    const windZones = Game.getWindZones();

    ctx.save();

    // Top HUD Bar Container
    ctx.fillStyle = "rgba(7, 10, 15, 0.82)";
    ctx.fillRect(0, 0, 1280, 52);

    ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(1280, 52);
    ctx.stroke();

    // 1. Mission / Level Badge (Left)
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 12px Consolas, monospace";
    ctx.fillText(`SECTOR 0${level.id + 1} // ${level.name.toUpperCase()}`, 24, 22);

    // Cargo Delivery Progress
    ctx.fillStyle = "#8b9bb4";
    ctx.font = "11px Consolas, monospace";
    ctx.fillText(`CARGO DELIVERED: ${delivered} / ${totalCargo}`, 24, 40);

    // Progress blocks
    for (let i = 0; i < totalCargo; i++) {
      ctx.fillStyle = i < delivered ? "#00ff88" : "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(160 + i * 14, 31, 10, 10);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.strokeRect(160 + i * 14, 31, 10, 10);
    }

    // 2. Center: Wind Vector Gauge & Countdown Timer
    let currentWindX = 0;
    if (windZones && windZones.length > 0) {
      currentWindX = windZones[0].currentForceX || windZones[0].forceX;
    }

    // Wind Speed Dial
    ctx.fillStyle = "#8b9bb4";
    ctx.font = "11px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("WIND SENSOR", 540, 22);

    ctx.fillStyle = Math.abs(currentWindX) > 60 ? "#ffb700" : "#00f0ff";
    ctx.font = "bold 13px Consolas, monospace";
    const windArrow = currentWindX > 0 ? "▶" : "◀";
    ctx.fillText(`${windArrow} ${Math.round(Math.abs(currentWindX))} KTS`, 540, 40);

    // Countdown Timer
    const mins = Math.floor(timeRemaining / 60);
    const secs = Math.floor(timeRemaining % 60);
    const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    ctx.fillStyle = "#8b9bb4";
    ctx.font = "11px Consolas, monospace";
    ctx.fillText("MISSION TIMER", 670, 22);

    ctx.fillStyle = timeRemaining < 20 ? "#ff3355" : "#ffffff";
    ctx.font = "bold 14px Consolas, monospace";
    ctx.fillText(timeStr, 670, 40);

    // 3. Right: Battery, Hull Gauges & Score
    // Battery Meter
    ctx.textAlign = "left";
    ctx.fillStyle = "#8b9bb4";
    ctx.font = "10px Consolas, monospace";
    ctx.fillText("BATTERY", 810, 20);

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(810, 26, 110, 12);

    const battPercent = Math.max(0, battery / 100);
    let battColor = "#00f0ff";
    if (battery < 20) battColor = "#ff3355";
    else if (battery < 50) battColor = "#ffb700";

    ctx.fillStyle = battColor;
    ctx.fillRect(810, 26, 110 * battPercent, 12);
    ctx.font = "bold 10px Consolas, monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${Math.round(battery)}%`, 928, 36);

    // Hull Integrity Meter
    ctx.fillStyle = "#8b9bb4";
    ctx.font = "10px Consolas, monospace";
    ctx.fillText("HULL INTEGRITY", 990, 20);

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(990, 26, 100, 12);

    const hullPercent = Math.max(0, hull / 100);
    let hullColor = "#00ff88";
    if (hull < 30) hullColor = "#ff3355";
    else if (hull < 65) hullColor = "#ffb700";

    ctx.fillStyle = hullColor;
    ctx.fillRect(990, 26, 100 * hullPercent, 12);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px Consolas, monospace";
    ctx.fillText(`${Math.round(hull)}%`, 1098, 36);

    // Score Counter
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffb700";
    ctx.font = "bold 18px Consolas, monospace";
    ctx.fillText(score.toLocaleString(), 1256, 35);

    ctx.fillStyle = "#8b9bb4";
    ctx.font = "10px Consolas, monospace";
    ctx.fillText("SCORE", 1256, 18);

    ctx.restore();
  }

  return {
    render,
    addScreenShake,
    spawnSparks,
    spawnShatter,
    addFloatingText
  };
})();
