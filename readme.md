# STORMLINE // Adverse Weather Emergency Rescue Drone

> **Live Demo:** [https://droneparcelgame.vercel.app/](https://droneparcelgame.vercel.app/) *(Deploy via GitHub on Vercel)*

**STORMLINE** is an original 2D side-view browser game where you pilot a high-lift emergency rescue drone through severe storm fronts to transport essential cargo to designated drop pads.

Built with **pure HTML5 Canvas, CSS, and vanilla JavaScript** with zero external dependencies, zero build steps, and universal browser compatibility.

---

## Quick Start (Two One-Step Ways to Play)

### Option 1: Direct File Opening
Double-click `index.html` or open it directly in any modern web browser (`file:///.../index.html`).

### Option 2: Local HTTP Server
Run the built-in Python web server in the project root:
```bash
python3 -m http.server 8000
```
Then navigate to:
```
http://localhost:8000
```

---

## Controls

| Key | Action |
| :--- | :--- |
| **W / Up Arrow** | Fire Main Upward Thrusters (Lift) |
| **A / Left Arrow** | Lateral Left Thruster |
| **D / Right Arrow** | Lateral Right Thruster |
| **S / Down Arrow** | Descent Assist Thruster |
| **Space / E** | Toggle Magnetic Grapple Tether (Engage / Disengage) |
| **P / ESC** | Pause / Resume Mission |
| **R** | Quick Restart Current Level |
| **M** | Toggle Audio Mute |

---

## Gameplay Mechanics

### 1. Drone Aerodynamics & Inertia
- **Responsive Physics:** Realistic acceleration, gravity, aerodynamic drag, and lateral banking tilt smoothly tied to velocity.
- **Rotor & Thruster Dynamics:** Active thruster exhaust particles and a procedural audio engine that dynamically modulates rotor hum pitch and volume based on throttle intensity.

### 2. Pick & Drop Loop & Damped Spring Tether
- **Hover & Target Bracket:** When hovering within grapple range of a cargo crate, a holographic target ring appears with an on-screen prompt (`[SPACE / E] ENGAGE TETHER`).
- **Spring-Damper Physics:** Connected cargo hangs from a realistic damped spring/pendulum cable. Lifting heavy cargo adds noticeable inertia and drains additional battery power.
- **Target Docking Guides:** Hovering above the target drop pad with carried cargo projects upward laser alignment guides and activates a green lock-on reticle.
- **Precision Deliveries:** Softly lowering or releasing cargo within pad bounds locks it in, triggering delivery chimes and awarding base points plus soft-drop and center bullseye bonuses.

### 3. Cargo Types
- **Standard Medical Supplies:** Balanced mass (1.0), resilient chassis.
- **Light Medical Serum:** Ultra-light mass (0.6), high agility.
- **Heavy Field Generator:** Heavy mass (2.1–2.2), pulls drone downward, demands heavy upward thrust, and drains battery faster.
- **Fragile Quantum Core:** Sensitive cargo (mass 1.1) that shatters into debris and fails the mission if impacted against terrain above safe speed thresholds (140 px/s).

### 4. Environmental Hazards & Budgets
- **Wind Zones:** Active crosswind fields that push both the drone and carried cargo. Visible wind ribbons display current wind vectors and turbulence.
- **Shifting Gusts:** In storm sectors, wind direction and intensity periodically oscillate and surge.
- **Battery Reserve:** Drains continuously during flight, accelerating during heavy thruster burns and heavy cargo airlifts. A low-battery alarm triggers below 20%.
- **Hull Integrity:** Collisions with terrain or cavern roofs above 115 px/s deal structural damage, accompanied by impact thuds and screen shake. A 1.0-second spawn grace period ensures every mission reliably commences at 100% hull integrity.
- **Mission Timer:** Complete all required deliveries before the countdown timer expires.

---

## Sectors / Levels

1. **Sector 01: Ridge Outpost**
   - *Atmosphere:* Calm dusk drizzle.
   - *Cargo:* 2 Standard Medical crates.
   - *Challenge:* Learn grapple pickup, tether pendulum momentum, and soft drop mechanics across a valley gap.
2. **Sector 02: Crosswind Valley**
   - *Atmosphere:* Twilight gale front.
   - *Cargo:* 1 Light Serum crate + 1 Heavy Field Generator.
   - *Challenge:* Counteract strong gorge crosswinds between rock pillars with contrasting cargo weights.
3. **Sector 03: Eye of the Storm**
   - *Atmosphere:* Heavy tempest with shifting wind gusts and lightning flashes.
   - *Cargo:* 1 Heavy Generator + 1 Fragile Quantum Core + 1 Standard Supply crate.
   - *Challenge:* Navigate narrow cavern corridors and variable winds while protecting the fragile core from hard impacts.

---

## File Structure

```
SatVibeCode/
├── index.html        # 1280x720 canvas viewport & clean responsive UI modal overlays
├── styles.css        # Dark atmospheric tactical UI styling (no external font dependencies)
├── README.md         # Documentation, controls, mechanics, and instructions
└── src/
    ├── levels.js     # 3 handcrafted levels with terrain, wind zones, cargo & budgets
    ├── audio.js      # Procedural Web Audio API sound effects & rotor hum modulation
    ├── game.js       # Fixed-timestep physics, drone flight, tether loop & state machine
    ├── renderer.js   # Procedural canvas visuals, mountain silhouettes, weather & HUD
    └── main.js       # Canvas scaling, event listeners, game loop, UI button hooks
```

---

## License

Built for adverse weather rescue simulations. All code and audio are 100% procedural with zero external dependencies.
