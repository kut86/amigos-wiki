import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   GRAPH RENDERER (CLEAN)
   lines between markers
───────────────────────── */

export function initGraphRenderer({ mapContainer, getMarkers }) {
  const canvas = document.getElementById("graphLayer");

  if (!canvas) {
    console.warn("[GRAPH] canvas not found");
    return null;
  }

  const ctx = canvas.getContext("2d");

  let markers = {};

  /* ─────────────────────────
     RESIZE
  ───────────────────────── */

  function resize() {
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }

  window.addEventListener("resize", () => {
    resize();
    render();
  });

  resize();

  /* ─────────────────────────
     RENDER CORE
  ───────────────────────── */

  function render() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    markers = getMarkers?.() || {};

    for (const m of Object.values(markers)) {
      const links = m.links;
      if (!links || !links.length) continue;

      for (const link of links) {
        const target = markers[link.targetId];
        if (!target) continue;

        drawLine(m, target, link.type);
      }
    }
  }

  /* ─────────────────────────
     DRAW LINE
  ───────────────────────── */

  function drawLine(from, to, type = "default") {
    const rect = mapContainer.getBoundingClientRect();

    const x1 = (from.x / 100) * rect.width;
    const y1 = (from.y / 100) * rect.height;

    const x2 = (to.x / 100) * rect.width;
    const y2 = (to.y / 100) * rect.height;

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
     PUBLIC API
  ───────────────────────── */

  function update(newMarkers) {
    markers = newMarkers || {};
    render();
  }

  function forceRender() {
    render();
  }

  /* ─────────────────────────
     EVENTS (ONLY TRIGGERS)
  ───────────────────────── */

  bus.on("markers:update", (m) => {
    update(m);
  });

  bus.on("graph:render", () => {
    render();
  });

  /* ❌ УДАЛЕНО:
     setInterval(render, 1000)
     — это ломало производительность
  */

  /* ───────────────────────── */
  return {
    update,
    render,
    forceRender,
    destroy: () => {
      window.removeEventListener("resize", resize);
    }
  };
}
