import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   INTERACTION LAYER (CLEAN VERSION)
───────────────────────── */

export function initInteractionLayer({
  mapContainer,
  getMarkerElementById
}) {
  let isActive = false;

  let startMarker = null;
  let isDragging = false;

  /* ─────────────────────────
     ENABLE / DISABLE
  ───────────────────────── */

  function enable() {
    isActive = true;

    state.setConnectMode(true);

    mapContainer.classList.add("connect-mode");

    bindEvents();
  }

  function disable() {
    isActive = false;

    state.setConnectMode(false);

    startMarker = null;
    isDragging = false;

    unbindEvents();

    clearTempLine();

    mapContainer.classList.remove("connect-mode");
  }

  /* ─────────────────────────
     EVENTS BINDING
  ───────────────────────── */

  function bindEvents() {
    mapContainer.addEventListener("mousemove", onMouseMove);
    mapContainer.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseup", onMouseUp);
  }

  function unbindEvents() {
    mapContainer.removeEventListener("mousemove", onMouseMove);
    mapContainer.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mouseup", onMouseUp);
  }

  /* ─────────────────────────
     START DRAG
  ───────────────────────── */

  function onMarkerMouseDown(markerId, e) {
    if (!state.get("connectMode")) return;

    isDragging = true;
    startMarker = markerId;

    bus.emit("connect:start", {
      id: markerId,
      event: e
    });

    e.preventDefault();
  }

  /* ─────────────────────────
     MOVE (TEMP LINE)
  ───────────────────────── */

  function onMouseMove(e) {
    if (!isActive || !isDragging || !startMarker) return;

    const rect = mapContainer.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    bus.emit("connect:update", {
      from: startMarker,
      to: { x, y }
    });
  }

  /* ─────────────────────────
     DROP → CREATE LINK
  ───────────────────────── */

  function onMouseUp(e) {
    if (!isActive || !isDragging) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);

    const targetId = target?.dataset?.id || null;

    if (
      targetId &&
      startMarker &&
      targetId !== startMarker
    ) {
      bus.emit("marker:linkRequest", {
        from: startMarker,
        to: targetId,
        type: "generic"
      });
    }

    reset();
  }

  /* ─────────────────────────
     RESET STATE
  ───────────────────────── */

  function reset() {
    isDragging = false;
    startMarker = null;

    clearTempLine();
  }

  /* ─────────────────────────
     TEMP VISUALS
  ───────────────────────── */

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
