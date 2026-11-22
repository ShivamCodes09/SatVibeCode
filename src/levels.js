/* ==========================================================================
   STORMLINE - Level Definitions
   Handcrafted terrain, cargo, wind zones, and mission budgets.
   ========================================================================== */

window.Stormline = window.Stormline || {};

window.Stormline.Levels = [
  // ------------------------------------------------------------------------
  // LEVEL 1: Ridge Outpost
  // Calm dusk, 2 standard medical crates, simple terrain gap to teach pickup,
  // tether feel, and landing.
  // ------------------------------------------------------------------------
  {
    id: 0,
    name: "Ridge Outpost",
    subtitle: "Calm Dusk // Training Sector",
    briefing: "Airlift 2 Standard Medical crates across the mountain gap to Landing Pad Alpha.",
    droneSpawn: { x: 160, y: 310 },
    budget: { time: 90, battery: 100 },
    requiredDeliveries: 2,
    weather: {
      theme: "dusk",
      skyTop: "#121b2d",
      skyBottom: "#3d2b38",
      mountainFar: "#1c2233",
      mountainMid: "#181a24",
      rainIntensity: 0.25,
      lightning: false,
      ambientWind: { x: 15, y: 0 }
    },
    // Platforms: { x, y, w, h, label }
    platforms: [
      // Starting outpost cliff (left)
      { x: 40, y: 380, w: 260, h: 300, label: "DEPOT ALPHA" },
      // Central gorge floor
      { x: 300, y: 640, w: 580, h: 80, label: "VALLEY BASIN" },
      // Central mid ridge tower (obstacle to fly over)
      { x: 560, y: 470, w: 80, h: 180, label: "RELAY MAST" },
      // Destination base cliff (right)
      { x: 880, y: 460, w: 360, h: 260, label: "BASE OUTPOST" }
    ],
    pickupPads: [
      { x: 80, y: 380, w: 180, h: 8, label: "CARGO BAY 1" }
    ],
    dropZone: {
      x: 940, y: 460, w: 180, h: 12, label: "TARGET LZ-1"
    },
    windZones: [
      { x: 340, y: 180, w: 500, h: 420, forceX: 28, forceY: -6, label: "VALLEY GALE" }
    ],
    cargo: [
      {
        id: "c1",
        type: "standard",
        name: "Medical Rations Alpha",
        x: 140,
        y: 360,
        w: 32,
        h: 28,
        mass: 1.0,
        safeSpeed: 260
      },
      {
        id: "c2",
        type: "standard",
        name: "Plasma Kit Beta",
        x: 210,
        y: 360,
        w: 32,
        h: 28,
        mass: 1.0,
        safeSpeed: 260
      }
    ]
  },

  // ------------------------------------------------------------------------
  // LEVEL 2: Crosswind Valley
  // Active crosswind zone between cliffs, 1 light crate + 1 heavy generator crate
  // (noticeably heavier lift).
  // ------------------------------------------------------------------------
  {
    id: 1,
    name: "Crosswind Valley",
    subtitle: "Gale Front // Heavy Lift Operations",
    briefing: "Crosswind gusts buffeting the gorge. Deliver 1 Light Medical crate and 1 Heavy Field Generator.",
    droneSpawn: { x: 140, y: 220 },
    budget: { time: 100, battery: 100 },
    requiredDeliveries: 2,
    weather: {
      theme: "twilight",
      skyTop: "#0d1829",
      skyBottom: "#243245",
      mountainFar: "#15202d",
      mountainMid: "#0e1520",
      rainIntensity: 0.6,
      lightning: false,
      ambientWind: { x: 45, y: -5 }
    },
    platforms: [
      // Starting high bluff (left)
      { x: 40, y: 280, w: 250, h: 440, label: "NORTH RIDGE" },
      // Overhead hanging rock formation / cavern ceiling
      { x: 500, y: 0, w: 160, h: 220, label: "HIGH ARCH" },
      // Central crag spire rising from canyon
      { x: 540, y: 440, w: 110, h: 280, label: "CLIFF PINNACLE" },
      // Canyon bottom hazard
      { x: 290, y: 660, w: 660, h: 60, label: "RAVINE" },
      // Destination station (right)
      { x: 950, y: 390, w: 290, h: 330, label: "STATION BRAVO" }
    ],
    pickupPads: [
      { x: 80, y: 280, w: 180, h: 8, label: "CARGO BAY 2" }
    ],
    dropZone: {
      x: 1000, y: 390, w: 190, h: 12, label: "TARGET LZ-2"
    },
    windZones: [
      {
        x: 290,
        y: 60,
        w: 660,
        h: 580,
        forceX: 95,
        forceY: -12,
        turbulence: 25,
        label: "CROSSWIND JET"
      }
    ],
    cargo: [
      {
        id: "c2_1",
        type: "light",
        name: "Critical Serum (Light)",
        x: 130,
        y: 260,
        w: 28,
        h: 26,
        mass: 0.6,
        safeSpeed: 260
      },
      {
        id: "c2_2",
        type: "heavy",
        name: "Field Dynamo (Heavy)",
        x: 200,
        y: 260,
        w: 38,
        h: 32,
        mass: 2.2,
        safeSpeed: 230
      }
    ]
  },

  // ------------------------------------------------------------------------
  // LEVEL 3: Eye of the Storm
  // Heavy rain, shifting wind gusts, tighter obstacle corridor,
  // 1 heavy crate + 1 fragile core + 1 standard crate.
  // ------------------------------------------------------------------------
  {
    id: 2,
    name: "Eye of the Storm",
    subtitle: "Severe Tempest // Critical Extraction",
    briefing: "Violent shifting storm winds. Transport 1 Heavy Generator, 1 Fragile Quantum Core, and 1 Standard Supply.",
    droneSpawn: { x: 130, y: 170 },
    budget: { time: 115, battery: 100 },
    requiredDeliveries: 3,
    weather: {
      theme: "storm",
      skyTop: "#080b12",
      skyBottom: "#161b26",
      mountainFar: "#0b1018",
      mountainMid: "#06080e",
      rainIntensity: 0.95,
      lightning: true,
      shiftingWinds: true,
      ambientWind: { x: 30, y: 0 }
    },
    platforms: [
      // Starting cliff (left)
      { x: 30, y: 230, w: 250, h: 490, label: "WEST BUNKER" },
      // Overhead canyon ceiling blocks
      { x: 340, y: 0, w: 260, h: 170, label: "CAVERN ROOF A" },
      { x: 680, y: 0, w: 260, h: 140, label: "CAVERN ROOF B" },
      // Mid obstacle spires and corridor
      { x: 420, y: 370, w: 90, h: 320, label: "SPIRE ALPHA" },
      { x: 620, y: 250, w: 120, h: 190, label: "SUSPENDED ARCH" },
      { x: 830, y: 440, w: 90, h: 250, label: "SPIRE BETA" },
      // Abyss floor
      { x: 280, y: 670, w: 710, h: 50, label: "ABYSS" },
      // Target extraction bunker (right)
      { x: 990, y: 440, w: 260, h: 280, label: "SHELTER CHARLIE" }
    ],
    pickupPads: [
      { x: 60, y: 230, w: 200, h: 8, label: "EXTRACTION PAD" }
    ],
    dropZone: {
      x: 1030, y: 440, w: 180, h: 12, label: "TARGET LZ-3"
    },
    windZones: [
      {
        x: 280,
        y: 40,
        w: 710,
        h: 620,
        forceX: 70,
        forceY: -15,
        shifting: true,
        shiftPeriod: 4.5,
        label: "TEMPEST GUST"
      }
    ],
    cargo: [
      {
        id: "c3_1",
        type: "heavy",
        name: "Substation Cell (Heavy)",
        x: 80,
        y: 210,
        w: 38,
        h: 32,
        mass: 2.1,
        safeSpeed: 230
      },
      {
        id: "c3_2",
        type: "fragile",
        name: "Quantum Matrix (Fragile)",
        x: 140,
        y: 210,
        w: 30,
        h: 28,
        mass: 1.1,
        safeSpeed: 140 // Shatters if collision impact speed > 140!
      },
      {
        id: "c3_3",
        type: "standard",
        name: "Cryo Pod (Standard)",
        x: 200,
        y: 210,
        w: 32,
        h: 28,
        mass: 1.0,
        safeSpeed: 260
      }
    ]
  }
];
