import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   DOM
───────────────────────── */

const mapContainer = document.getElementById("map");
const mapImage = document.getElementById("mapImage");

const mapSelect = document.getElementById("mapSelect");
const filterSel = document.getElementById("filter");

/* ─────────────────────────
   MAP DATA
───────────────────────── */

const MAPS = {
  woods: {
    title: "Лес",
    img: "images/woods.png",
    fallback: "fallback.jpg"
  },
  customs: {
    title: "Таможня",
    img: "images/customs.png",
    fallback: "fallback.jpg"
  },
  interchange: {
    title: "Развязка",
    img: "images/interchange.png",
    fallback: "fallback.jpg"
  }
};

/* ─────────────────────────
   STATE INIT
───────────────────────── */

state.hydrate();

/* ─────────────────────────
   LOAD MAP
───────────────────────── */

function loadMap(mapId, silent = false) {
  const map = MAPS[mapId];
  if (!map) return;

  state.setMap(mapId);

  mapImage.src = map.img;

  mapImage.onerror = () => {
    mapImage.src = map.fallback;
  };

  if (!silent) {
    bus.emit("map:change", mapId);
  }

  mapSelect.value = mapId;
}

/* ─────────────────────────
   SWITCH MAP (UI)
───────────────────────── */

mapSelect.addEventListener("change", (e) => {
  const newMap = e.target.value;

  bus.emit("map:requestChange", newMap);
});

/* ─────────────────────────
   CONFIRM SWITCH (логика)
───────────────────────── */

bus.on("map:requestChange", (mapId) => {
  const current = state.get("mapId");

  if (current === mapId) return;

  const confirmSwitch = confirm(
    `Перейти на карту: ${MAPS[mapId].title}?`
  );

  if (!confirmSwitch) {
    mapSelect.value = current;
    return;
  }

  loadMap(mapId);
});

/* ─────────────────────────
   SYNC FROM STATE
───────────────────────── */

state.on("mapId", (mapId) => {
  loadMap(mapId, true);
});

/* ─────────────────────────
   GLOBAL EVENTS (для wiki.js и других)
───────────────────────── */

bus.on("map:change", (mapId) => {
  console.log("Map changed globally:", mapId);
});

/* ─────────────────────────
   INIT
───────────────────────── */

loadMap(state.get("mapId"));
