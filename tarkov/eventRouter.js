import { bus } from "./eventBus.js";

/* ─────────────────────────
   UI → DOMAIN
───────────────────────── */

bus.on("ui:mapSelect", (mapId) => {
  bus.emit("domain:mapChangeRequest", mapId);
});

bus.on("ui:markerCreate", (data) => {
  bus.emit("domain:markerAddRequest", data);
});

bus.on("ui:markerUpdate", (data) => {
  bus.emit("domain:markerUpdateRequest", data);
});

bus.on("ui:markerDelete", (id) => {
  bus.emit("domain:markerDeleteRequest", id);
});
