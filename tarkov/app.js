import { db } from "./firebase.js";

/* ─────────────────────────
   CORE
───────────────────────── */

import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   ENGINES
───────────────────────── */

import { initMapEngine } from "./mapEngine.js";
import { MarkerEngine } from "./markerEngine.js";
import { initUIEngine } from "./uiEngine.js";
import { initGraphRenderer } from "./graphRenderer.js";
import { initInteractionLayer } from "./interactionLayer.js";
import { initMarkerBuilder } from "./markerBuilder.js";
import { initTimeEngine } from "./timeEngine.js";

/* ─────────────────────────
   DOM
───────────────────────── */

const mapImg = document.getElementById("mapImage");
const mapContainer = document.getElementById("map");
const filterSel = document.getElementById("filter");

/* ─────────────────────────
   INIT STATE
───────────────────────── */

state.setMap("woods");

/* ─────────────────────────
   MAP ENGINE
───────────────────────── */

const mapEngine = initMapEngine({
  mapImg,
  mapContainer
});

/* ─────────────────────────
   TIME ENGINE
───────────────────────── */

const timeEngine = initTimeEngine();

/* ─────────────────────────
   MARKER ENGINE
───────────────────────── */

let markerEngine = new MarkerEngine(db, state.get("mapId"));
let markersCache = {};

markerEngine.subscribe((markers) => {
  markersCache = markers;

  bus.emit("markers:update", markers);
  bus.emit("graph:render");
});

/* ─────────────────────────
   UI ENGINE
───────────────────────── */

const ui = initUIEngine();

/* ─────────────────────────
   GRAPH RENDERER
───────────────────────── */

const graph = initGraphRenderer({
  mapContainer,
  getMarkers: () => markersCache
});

/* ─────────────────────────
   INTERACTION LAYER
───────────────────────── */

const interaction = initInteractionLayer({
  mapContainer,
  getMarkerElementById: (id) =>
    document.querySelector(`[data-id="${id}"]`)
});

/* ─────────────────────────
   BUILDER
───────────────────────── */

const builder = initMarkerBuilder();

/* ─────────────────────────
   ZOOM
───────────────────────── */

document.getElementById("zoomIn").onclick = () => mapEngine.zoomIn();
document.getElementById("zoomOut").onclick = () => mapEngine.zoomOut();
document.getElementById("zoomReset").onclick = () => mapEngine.reset();

/* ─────────────────────────
   MAP SWITCH
───────────────────────── */

bus.on("map:change", (mapId) => {
  state.setMap(mapId);

  markerEngine.switchMap(mapId);

  mapEngine.switchMap(mapId, {
    imgUrl: `images/${mapId}.png`
  });

  timeEngine.switchMap(mapId);
});

/* ─────────────────────────
   TIME → STATE
───────────────────────── */

bus.on("time:update", ({ time, isNight }) => {
  state.setTime(time);
  state.setNight(isNight);
});

/* ─────────────────────────
   CONNECT SYSTEM
───────────────────────── */

bus.on("marker:linkRequest", ({ from, to }) => {
  const marker = markersCache[from];
  if (!marker) return;

  const links = marker.links || [];

  links.push({
    targetId: to,
    type: "generic"
  });

  markerEngine.update(from, { links });
});

/* ─────────────────────────
   ADD MARKER
───────────────────────── */

bus.on("marker:addRequest", (data) => {
  markerEngine.add(data);
});

/* ─────────────────────────
   OPEN BUILDER
───────────────────────── */

bus.on("ui:addOpen", () => {
  builder.open();
});

/* ─────────────────────────
   INIT
───────────────────────── */

mapEngine.switchMap("woods", {
  imgUrl: "images/woods.png"
});
