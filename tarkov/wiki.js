import { db } from "./firebase.js";

import { initMapEngine, switchMap, zoomIn, zoomOut, resetView } from "./mapEngine.js";
import { initMarkerEngine } from "./markerEngine.js";
import { initUIEngine } from "./uiEngine.js";

/* ─────────────────────────────
   DOM
───────────────────────────── */

const mapImg = document.getElementById("mapImage");
const mapContainer = document.getElementById("map");
const filterSel = document.getElementById("filter");

/* ─────────────────────────────
   UI ENGINE
───────────────────────────── */

const ui = initUIEngine();

ui.bindModalClose();

/* ─────────────────────────────
   MAP ENGINE
───────────────────────────── */

const mapEngine = initMapEngine({
  mapImg,
  mapContainer
});

/* кнопки зума */
document.getElementById("zoomIn").onclick = zoomIn;
document.getElementById("zoomOut").onclick = zoomOut;
document.getElementById("zoomReset").onclick = resetView;

/* ─────────────────────────────
   STATE
───────────────────────────── */

let currentMapId = "woods";

/* ─────────────────────────────
   MARKER ENGINE
───────────────────────────── */

const markerEngine = initMarkerEngine({
  db,
  mapId: currentMapId,
  container: mapContainer,
  isMobile: () =>
    window.matchMedia("(hover: none) and (pointer: coarse)").matches,

  filterFn: () => filterSel.value,

  onOpen: (id, marker) => {
    ui.openModal({
      title: marker.text,
      text: marker.text,
      imgUrl: marker.imgUrl,
      type: marker.type
    });
  },

  onRender: null
});

/* ─────────────────────────────
   MAP SWITCH (если нужно менять карту)
───────────────────────────── */

function loadMap(mapId) {
  currentMapId = mapId;

  mapEngine.switchMap(mapId, {
    imgUrl: `images/${mapId}.png`,
    fallbackUrl: "fallback.jpg"
  });

  /* важно: пересоздаём подписку маркеров */
  initMarkerEngine({
    db,
    mapId,
    container: mapContainer,
    isMobile: () =>
      window.matchMedia("(hover: none) and (pointer: coarse)").matches,

    filterFn: () => filterSel.value,

    onOpen: (id, marker) => {
      ui.openModal({
        title: marker.text,
        text: marker.text,
        imgUrl: marker.imgUrl,
        type: marker.type
      });
    }
  });
}

/* ─────────────────────────────
   FILTER
───────────────────────────── */

filterSel.addEventListener("change", () => {
  // markerEngine сам перерисует через onValue
});

/* ─────────────────────────────
   INIT
───────────────────────────── */

loadMap("woods");
