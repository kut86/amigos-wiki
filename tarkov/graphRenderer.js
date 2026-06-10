import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   GRAPH RENDERER (CLEAN VERSION)
───────────────────────── */

export function initGraphRenderer({
  mapContainer,
  getMarkers
}) {
  const canvas = document.getElementById("graphLayer");
  const ctx = canvas.getContext("2d");

  let markers = {};
  let dirty = true;
  let raf = null;

  /* ─────────────────────────
     RESIZE
  ───────────────────────── */

  function resize() {
    const rect = mapContainer.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    requestRender();
  }

  window.addEventListener("resize", resize);

  /* ─────────────────────────
     REQUEST RENDER (optimized)
  ───────────────────────── */

  function requestRender() {
    if (dirty) return;

    dirty = true;

    raf = requestAnimationFrame(render);
  }

  /* ─────────────────────────
     MAIN RENDER
  ───────────────────────── */

  function render() {
    dirty = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    markers = getMarkers?.() || {};

    const rect = mapContainer.getBoundingClientRect();

    const scaleX = rect.width / 100;
    const scaleY = rect.height / 100;

    for (const m of Object.values(markers)) {
      if (!m.links?.length) continue;

      for (const link of m.links) {
        const target = markers[link.targetId];
        if (!target) continue;

        drawLine(m, target, link.type, scaleX, scaleY);
      }
    }
  }

  /* ─────────────────────────
     DRAW LINE
  ───────────────────────── */

  function drawLine(from, to, type, scaleX, scaleY) {
    const x1 = from.x * scaleX;
    const y1 = from.y * scaleY;

    const x2 = to.x * scaleX;
    const y2 = to.y * scaleY;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    switch (type) {
      case "key":
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        break;

      case "unlock":
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 2;
        break;

      case "quest":
        ctx.strokeStyle = "#4aa3ff";
        ctx.lineWidth = 2;
        break;

      default:
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
    }

    ctx.stroke();
  }

  /* ─────────────────────────
     SYNC EVENTS
  ───────────────────────── */

  bus.on("markers:sync", (m) => {
    markers = m;
    requestRender();
  });

  bus.on("graph:render", () => {
    requestRender();
  });

  bus.on("map:change", () => {
    requestRender();
  });

  bus.on("filter:change", () => {
    requestRender();
  });

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────── */

  function update(newMarkers) {
    markers = newMarkers;
    requestRender();
  }

  function forceRender() {
    render();
  }

  /* ─────────────────────────
     INIT
  ───────────────────────── */

  resize();
  requestRender();

  return {
    update,
    render: requestRender,
    forceRender,
    destroy: () => {
      cancelAnimationFrame(raf);
    }
  };
}
