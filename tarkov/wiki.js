import { db } from "./firebase.js";

import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

import { initMapEngine, zoomIn, zoomOut, resetView } from "./mapEngine.js";
import { MarkerEngine } from "./markerEngine.js";
import { initUIEngine } from "./uiEngine.js";

/* ─────────────────────────
   DOM
───────────────────────── */

const mapImg = document.getElementById("mapImage");
const mapContainer = document.getElementById("map");
const filterSel = document.getElementById("filter");

/* ─────────────────────────
   STATE INIT
───────────────────────── */

state.setMap("woods");

/* ─────────────────────────
   UI ENGINE
───────────────────────── */

const ui = initUIEngine();

/* ─────────────────────────
   MAP ENGINE
───────────────────────── */

const mapEngine = initMapEngine({
  mapImg,
  mapContainer
});

/* подключаем глобальные кнопки */
document.getElementById("zoomIn").onclick = zoomIn;
document.getElementById("zoomOut").onclick = zoomOut;
document.getElementById("zoomReset").onclick = resetView;

/* ─────────────────────────
   MARKER ENGINE
───────────────────────── */

const markerEngine = new MarkerEngine({
  db,
  container: mapContainer,

  isMobile: () =>
    window.matchMedia("(hover: none) and (pointer: coarse)").matches,

  filterFn: () => filterSel.value
});

/* ─────────────────────────
   EVENT BUS CONNECTIONS
───────────────────────── */

/* OPEN MARKER → UI */
bus.on("marker:open", (marker) => {
  ui.openModal(marker);
});

/* DELETE MARKER */
bus.on("marker:delete", (id) => {
  markerEngine.delete(id);
});

/* UPDATE MARKER */
bus.on("marker:update", ({ id, data }) => {
  markerEngine.update(id, data);
});

/* MAP SWITCH */
bus.on("map:change", (mapId) => {
  markerEngine.switchMap(mapId, {
    imgUrl: `images/${mapId}.png`,
    fallbackUrl: "fallback.jpg"
  });
});

/* FILTER RE-RENDER */
filterSel.addEventListener("change", () => {
  markerEngine.render();
});

/* ─────────────────────────
   INIT
───────────────────────── */

mapEngine.switchMap("woods", {
  imgUrl: "images/woods.png",
  fallbackUrl: "fallback.jpg"
});

markerEngine.init("woods");
