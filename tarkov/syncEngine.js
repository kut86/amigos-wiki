import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   SYNC ENGINE
   (центральный координатор)
───────────────────────── */

export function initSyncEngine({
  mapEngine,
  markerEngine,
  ui
}) {
  /* ─────────────────────────
     MAP → EVERYTHING
  ───────────────────────── */

  bus.on("map:change", (mapId) => {
    state.setMap(mapId);

    markerEngine.switchMap(mapId);

    console.log("[SYNC] map changed:", mapId);
  });

  /* ─────────────────────────
     STATE → MAP
  ───────────────────────── */

  state.on("mapId", (mapId) => {
    mapEngine.loadMap(mapId);
    markerEngine.switchMap(mapId);
  });

  /* ─────────────────────────
     MARKER EVENTS → FIREBASE
  ───────────────────────── */

  bus.on("marker:updateRequest", ({ id, data }) => {
    markerEngine.update(id, data);
  });

  bus.on("marker:deleteRequest", (id) => {
    markerEngine.delete(id);
  });

  bus.on("marker:addRequest", (data) => {
    markerEngine.add(data);
  });

  /* ─────────────────────────
     UI → STATE
  ───────────────────────── */

  bus.on("ui:addOpen", (pos) => {
    state.set("addMode", true);
  });

  bus.on("ui:addClose", () => {
    state.set("addMode", false);
  });

  bus.on("ui:editMode", () => {
    state.set("editMode", true);
  });

  bus.on("ui:editCancel", () => {
    state.set("editMode", false);
  });

  /* ─────────────────────────
     MARKER → UI
  ───────────────────────── */

  bus.on("marker:open", (marker) => {
    state.setCurrentMarker(marker);
  });

  console.log("[SYNC ENGINE] initialized");
}
