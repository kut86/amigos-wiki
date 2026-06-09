import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { initMapEngine } from "./mapEngine.js";

/* ─────────────────────────
   DOM
───────────────────────── */

const mapImg = document.getElementById("mapImage");
const mapContainer = document.getElementById("map");
const filterSel = document.getElementById("filter");
const mapSelect = document.getElementById("mapSelect");

/* ─────────────────────────
   ENGINE (только карта)
───────────────────────── */

const mapEngine = initMapEngine({
  mapImg,
  mapContainer
});

/* ─────────────────────────
   INIT PAGE (вызывается из app.js)
───────────────────────── */

export function initMapPage() {
  console.log("[MAP] init");

  const currentMap = state.get("mapId") || "woods";

  loadMap(currentMap);

  bindUI();

  bindEvents();
}

/* ─────────────────────────
   LOAD MAP
───────────────────────── */

function loadMap(mapId) {
  state.setMap(mapId);

  mapEngine.switchMap(mapId, {
    imgUrl: `images/${mapId}.png`,
    fallbackUrl: "fallback.jpg"
  });

  if (mapSelect) {
    mapSelect.value = mapId;
  }
}

/* ─────────────────────────
   UI EVENTS
───────────────────────── */

function bindUI() {
  document.getElementById("zoomIn")?.addEventListener("click", () => {
    mapEngine.zoomIn();
  });

  document.getElementById("zoomOut")?.addEventListener("click", () => {
    mapEngine.zoomOut();
  });

  document.getElementById("zoomReset")?.addEventListener("click", () => {
    mapEngine.reset();
  });

  mapSelect?.addEventListener("change", (e) => {
    const newMap = e.target.value;
    bus.emit("map:change", newMap);
  });

  filterSel?.addEventListener("change", () => {
    bus.emit("filter:change", filterSel.value);
  });
}

/* ─────────────────────────
   EVENTS FROM SYSTEM
───────────────────────── */

function bindEvents() {
  bus.on("map:sync", (mapId) => {
    loadMap(mapId);
  });

  bus.on("filter:sync", (filter) => {
    if (filterSel) filterSel.value = filter;
  });
    }
