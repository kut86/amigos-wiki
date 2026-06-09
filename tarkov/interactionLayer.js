import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   INTERACTION LAYER
   (drag & connect system)
───────────────────────── */

export function initInteractionLayer({
  mapContainer,
  getMarkerElementById
}) {
  let isActive = false;

  let startMarker = null;
  let tempLine = null;

  /* ─────────────────────────
     INIT
  ───────────────────────── */

  function enable() {
    isActive = true;
    state.set("connectMode", true);

    mapContainer.classList.add("connect-mode");
  }

  function disable() {
    isActive = false;
    state.set("connectMode", false);

    startMarker = null;
    clearTempLine();

    mapContainer.classList.remove("connect-mode");
  }

  /* ─────────────────────────
     START CONNECTION
  ───────────────────────── */

  function onMarkerMouseDown(markerId, e) {
    if (!state.get("connectMode")) return;

    startMarker = markerId;

    bus.emit("connect:start", {
      id: markerId,
      event: e
    });
  }

  /* ─────────────────────────
     DRAG MOVE (PREVIEW LINE)
  ───────────────────────── */

  function onMouseMove(e) {
    if (!startMarker || !state.get("connectMode")) return;

    const rect = mapContainer.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    bus.emit("connect:update", {
      from: startMarker,
      to: { x, y }
    });

    drawTempLine(startMarker, { x, y });
  }

  /* ─────────────────────────
     DROP → CREATE LINK
  ───────────────────────── */

  function onMouseUp(targetMarkerId) {
    if (!startMarker || !state.get("connectMode")) return;

    if (targetMarkerId && targetMarkerId !== startMarker) {
      bus.emit("marker:linkRequest", {
        from: startMarker,
        to: targetMarkerId,
        type: "generic"
      });
    }

    clearTempLine();
    startMarker = null;
  }

  /* ─────────────────────────
     TEMP LINE (VISUAL)
  ───────────────────────── */

  function drawTempLine(fromId, toCoords) {
    bus.emit("graph:tempLine", {
      from: fromId,
      to: toCoords
    });
  }

  function clearTempLine() {
    bus.emit("graph:clearTemp");
  }

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────── */

  return {
    enable,
    disable,
    onMarkerMouseDown,
    onMouseMove,
    onMouseUp
  };
      }
