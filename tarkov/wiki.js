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
   URL MAP ID
───────────────────────── */

const urlParams = new URLSearchParams(window.location.search);
const mapId = urlParams.get("map") || state.get("mapId") || "woods";

/* ─────────────────────────
   DOM
───────────────────────── */

const mapImg = document.getElementById("mapImage");
const mapContainer = document.getElementById("map");

const mapSelect = document.getElementById("mapSelect");
const filterSel = document.getElementById("filter");

const addBtn = document.getElementById("addModeBtn");

/* ─────────────────────────
   STATE INIT
───────────────────────── */

state.setMap(mapId);

/* ─────────────────────────
   AUTH + ROLE SYSTEM
───────────────────────── */

onAuthChange(async (user) => {
  if (!user) return;

  await ensureUser(user);

  const role = await getUserRole(user.uid);

  state.setUser(user, role);

  if (role === "admin") {
    document.body.classList.add("admin");

    if (addBtn) addBtn.style.display = "block";

    console.log("ADMIN MODE ENABLED (WIKI)");
  }
});

/* ─────────────────────────
   MAP ENGINE INIT
───────────────────────── */

const mapEngine = initMapEngine({
  mapImg,
  mapContainer
});

/* загрузка карты */
mapEngine.switchMap(mapId, {
  imgUrl: `images/${mapId}.png`
});

/* ─────────────────────────
   UI ENGINE
───────────────────────── */

const ui = initUIEngine();

/* ─────────────────────────
   MARKER ENGINE
───────────────────────── */

let markerEngine = new MarkerEngine(db, mapId);
let markersCache = {};

/* подписка на маркеры */
function bindMarkers(engine) {
  engine.subscribe((markers) => {
    markersCache = markers;

    bus.emit("markers:update", markers);
  });
}

bindMarkers(markerEngine);

/* ─────────────────────────
   MAP SELECT SWITCH
───────────────────────── */

mapSelect.value = mapId;

mapSelect.addEventListener("change", (e) => {
  const newMap = e.target.value;

  bus.emit("map:requestChange", newMap);
});

/* ─────────────────────────
   CONFIRM MAP CHANGE
───────────────────────── */

bus.on("map:requestChange", (newMap) => {
  if (state.get("mapId") === newMap) return;

  const ok = confirm(`Перейти на карту: ${newMap}?`);

  if (!ok) {
    mapSelect.value = state.get("mapId");
    return;
  }

  changeMap(newMap);
});

/* ─────────────────────────
   CHANGE MAP FUNCTION
───────────────────────── */

function changeMap(newMap) {
  state.setMap(newMap);

  mapEngine.switchMap(newMap, {
    imgUrl: `images/${newMap}.png`
  });

  markerEngine = new MarkerEngine(db, newMap);
  bindMarkers(markerEngine);

  bus.emit("map:change", newMap);
}

/* ─────────────────────────
   FILTER (заготовка)
───────────────────────── */

filterSel.addEventListener("change", () => {
  bus.emit("filter:change", filterSel.value);
});

/* ─────────────────────────
   ADD MARKER MODE
───────────────────────── */

if (addBtn) {
  addBtn.addEventListener("click", () => {
    bus.emit("ui:addOpen");
  });
}

/* ─────────────────────────
   MARKER EVENTS (backend hook)
───────────────────────── */

bus.on("marker:addRequest", (data) => {
  markerEngine.add(data);
});

/* ─────────────────────────
   OPEN MARKER
───────────────────────── */

bus.on("marker:open", (id) => {
  const marker = markersCache[id];
  if (!marker) return;

  ui.openModal({
    title: marker.text || "Marker",
    text: marker.text || "",
    imgUrl: marker.imgUrl || "",
    type: marker.type || "info"
  });
});

/* ─────────────────────────
   INIT COMPLETE
───────────────────────── */

console.log("WIKI LOADED:", mapId);
