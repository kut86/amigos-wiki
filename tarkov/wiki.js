import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

import {
  db,
  onAuthChange,
  ensureUser,
  getUserRole
} from "./firebase.js";

import { initMapEngine } from "./mapEngine.js";
import { MarkerEngine } from "./markerEngine.js";
import { initUIEngine } from "./uiEngine.js";

/* ─────────────────────────
   URL MAP
───────────────────────── */

const urlParams = new URLSearchParams(window.location.search);
const mapId = urlParams.get("map") || state.get("mapId") || "woods";

state.setMap(mapId);

/* ─────────────────────────
   DOM
───────────────────────── */

const mapImg = document.getElementById("mapImage");
const mapContainer = document.getElementById("map");
const filterSel = document.getElementById("filter");

/* ─────────────────────────
   AUTH + ROLE
───────────────────────── */

onAuthChange(async (user) => {
  if (!user) return;

  await ensureUser(user);

  const role = await getUserRole(user.uid);

  state.setUser(user, role);

  if (role === "admin") {
    document.body.classList.add("admin");

    const addBtn = document.getElementById("addModeBtn");
    if (addBtn) addBtn.style.display = "block";

    console.log("ADMIN MODE ENABLED (WIKI)");
  }
});

/* ─────────────────────────
   MAP ENGINE
───────────────────────── */

const mapEngine = initMapEngine({
  mapImg,
  mapContainer
});

mapEngine.switchMap(mapId, {
  imgUrl: `images/${mapId}.png`
});

/* ─────────────────────────
   MARKER ENGINE
───────────────────────── */

let markerEngine = new MarkerEngine(db, mapId);
let markersCache = {};

markerEngine.subscribe((markers) => {
  markersCache = markers;

  bus.emit("markers:update", markers);
});

/* ─────────────────────────
   UI ENGINE
───────────────────────── */

const ui = initUIEngine();

/* ─────────────────────────
   MAP SWITCH SYNC (map ↔ wiki)
───────────────────────── */

bus.on("map:change", (newMap) => {
  if (state.get("mapId") !== newMap) return;

  mapEngine.switchMap(newMap, {
    imgUrl: `images/${newMap}.png`
  });

  markerEngine = new MarkerEngine(db, newMap);
});
