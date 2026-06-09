import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   GRAPH RENDERER
   (lines between markers)
───────────────────────── */

export function initGraphRenderer({
  mapContainer,
  getMarkers
}) {
  const canvas = document.getElementById("graphLayer");
  const ctx = canvas.getContext("2d");

  let markers = {};

  /* ─────────────────────────
     RESIZE CANVAS
  ───────────────────────── */

  function resize() {
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
     MAIN RENDER
  ───────────────────────── */

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    markers = getMarkers?.() || {};

    Object.values(markers).forEach((m) => {
      if (!m.links || !m.links.length) return;

      m.links.forEach((link) => {
        const target = markers[link.targetId];
        if (!target) return;

        drawLine(m, target, link.type);
      });
    });
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

    /* ── STYLE BY TYPE ── */

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
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
    }

    ctx.stroke();
  }

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────── */

  function update(newMarkers) {
    markers = newMarkers;
    render();
  }

  function forceRender() {
    render();
  }

  /* ─────────────────────────
     SYNC EVENTS
  ───────────────────────── */

  bus.on("graph:render", () => {
    render();
  });

  bus.on("markers:update", (m) => {
    markers = m;
    render();
  });

  /* ─────────────────────────
     AUTO REFRESH LOOP (простая версия)
  ───────────────────────── */

  const interval = setInterval(render, 1000);

  return {
    update,
    render,
    forceRender,
    destroy: () => clearInterval(interval)
  };
                 }
