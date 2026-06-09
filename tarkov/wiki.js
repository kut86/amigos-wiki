import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { initUIEngine } from "./uiEngine.js";

/* ─────────────────────────
   DOM
───────────────────────── */

const wikiContainer = document.getElementById("wiki");
const markerList = document.getElementById("markerList");
const searchInput = document.getElementById("wikiSearch");

/* ─────────────────────────
   UI ENGINE (только UI)
───────────────────────── */

const ui = initUIEngine();

/* ─────────────────────────
   INIT PAGE (вызывается из app.js)
───────────────────────── */

export function initWikiPage() {
  console.log("[WIKI] init");

  bindUI();

  bindEvents();

  renderInitial();
}

/* ─────────────────────────
   INITIAL RENDER
───────────────────────── */

function renderInitial() {
  const markers = state.get("markers") || {};
  renderMarkers(markers);
}

/* ─────────────────────────
   UI EVENTS
───────────────────────── */

function bindUI() {
  searchInput?.addEventListener("input", () => {
    bus.emit("wiki:search", searchInput.value);
  });

  markerList?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-id]");
    if (!item) return;

    const id = item.dataset.id;

    bus.emit("marker:select", id);
  });
}

/* ─────────────────────────
   SYSTEM EVENTS
───────────────────────── */

function bindEvents() {
  bus.on("markers:update", (markers) => {
    renderMarkers(markers);
  });

  bus.on("map:sync", () => {
    // при смене карты очищаем/обновляем wiki
    renderInitial();
  });

  bus.on("marker:open", (marker) => {
    ui.openModal({
      title: marker.text,
      text: marker.text,
      imgUrl: marker.imgUrl,
      type: marker.type
    });
  });
}

/* ─────────────────────────
   RENDER
───────────────────────── */

function renderMarkers(markers) {
  if (!markerList) return;

  markerList.innerHTML = "";

  Object.entries(markers).forEach(([id, m]) => {
    const el = document.createElement("div");

    el.className = "wiki-item";
    el.dataset.id = id;

    el.innerHTML = `
      <div class="title">${m.text || "Без названия"}</div>
      <div class="type">${m.type || "unknown"}</div>
    `;

    markerList.appendChild(el);
  });
}
