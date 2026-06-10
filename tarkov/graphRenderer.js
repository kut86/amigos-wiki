import { bus } from "./eventBus.js";

/* ─────────────────────────
   GRAPH RENDERER (FINAL STABLE)
───────────────────────── */

export function initGraphRenderer({ mapContainer, getMarkers }) {
  const canvas = document.getElementById("graphLayer");

  if (!canvas) {
    console.warn("[GRAPH] canvas not found");
    return null;
  }

  const ctx = canvas.getContext("2d");

  let markers = {};
  let rafId = null;

  /* ─────────────────────────
     RESIZE (stable ref)
  ───────────────────────── */

  function resize() {
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    requestRender();
  }

  window.addEventListener("resize", resize);

  resize();

  /* ─────────────────────────
     RENDER QUEUE (ANTI-SPAM)
  ───────────────────────── */

  function requestRender() {
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      render();
    });
  }

  /* ─────────────────────────
     RENDER CORE
  ───────────────────────── */

  function render() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    markers = getMarkers?.() || {};

    for (const m of Object.values(markers)) {
      if (!m.links?.length) continue;

      for (const link of m.links) {
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
     EVENTS
  ───────────────────────── */

  const offMarkers = bus.on("markers:update", (m) => {
    markers = m || {};
    requestRender();
  });

  const offRender = bus.on("graph:render", () => {
    requestRender();
  });

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────── */

  return {
    update: (m) => {
      markers = m || {};
      requestRender();
    },

    render: requestRender,

    forceRender: render,

    destroy: () => {
      window.removeEventListener("resize", resize);
      offMarkers?.();
      offRender?.();

      if (rafId) cancelAnimationFrame(rafId);
    }
  };
}
