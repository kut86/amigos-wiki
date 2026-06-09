import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { MarkerEngine } from "./markerEngine.js";

/* ─────────────────────────
   DOM
───────────────────────── */

const mapContainer = document.getElementById("map");
const filterSel = document.getElementById("filter");

/* ─────────────────────────
   STATE
───────────────────────── */

state.hydrate();

/* ─────────────────────────
   MARKER ENGINE
───────────────────────── */

let markerEngine = null;

/* ─────────────────────────
   INIT ENGINE
───────────────────────── */

function initMarkers(mapId) {
  if (markerEngine) {
    markerEngine.destroy?.();
  }

  markerEngine = new MarkerEngine(mapId);

  markerEngine.subscribe((markers) => {
    render(markers);
  });
}

/* ─────────────────────────
   RENDER
───────────────────────── */

function render(markers) {
  document.querySelectorAll(".marker").forEach(m => m.remove());

  const filter = filterSel.value;

  Object.entries(markers).forEach(([id, m]) => {
    if (filter !== "all" && m.type !== filter) return;

    const el = createMarker(id, m);
    mapContainer.appendChild(el);
  });
}

/* ─────────────────────────
   CREATE MARKER
───────────────────────── */

function createMarker(id, m) {
  const div = document.createElement("div");

  div.className = "marker";
  div.style.left = m.x + "%";
  div.style.top = m.y + "%";

  div.innerHTML = `
    <div class="marker-inner">
      ${m.iconUrl
        ? `<img src="${m.iconUrl}" class="marker-icon">`
        : `<span class="marker-text">${m.text}</span>`
      }
    </div>
  `;

  /* ── OPEN MODAL ── */

  div.addEventListener("click", () => {
    state.setCurrentMarker({ id, ...m });

    bus.emit("marker:open", {
      id,
      ...m
    });
  });

  return div;
}

/* ─────────────────────────
   FILTER
───────────────────────── */

filterSel.addEventListener("change", () => {
  if (markerEngine) {
    markerEngine.reload?.();
  }
});

/* ─────────────────────────
   MAP SYNC (из map.js)
───────────────────────── */

bus.on("map:change", (mapId) => {
  initMarkers(mapId);
});

/* ─────────────────────────
   STATE SYNC
───────────────────────── */

state.on("mapId", (mapId) => {
  initMarkers(mapId);
});

/* ─────────────────────────
   INIT
───────────────────────── */

initMarkers(state.get("mapId"));
