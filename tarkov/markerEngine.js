// markerEngine.js

import {
  ref,
  push,
  onValue,
  update,
  remove
} from "./firebase.js";

/* ─────────────────────────────
   STATE
───────────────────────────── */

let dbRef = null;
let markersCache = {};
let renderCallback = null;

/* ─────────────────────────────
   INIT ENGINE
   (подключаем к конкретной карте)
───────────────────────────── */

export function initMarkerEngine(config) {
  /*
    config:
    {
      db,
      mapId,
      container,
      filterFn,
      onOpen,
      isMobile
    }
  */

  dbRef = ref(config.db, `maps/${config.mapId}/markers`);

  renderCallback = () => {
    if (config.onRender) {
      config.onRender(markersCache);
    } else {
      defaultRender(config);
    }
  };

  onValue(dbRef, (snap) => {
    markersCache = {};

    snap.forEach(i => {
      markersCache[i.key] = i.val();
    });

    renderCallback();
  });

  return {
    getAll: () => markersCache,

    create: (data) => {
      return push(dbRef, data);
    },

    update: (id, data) => {
      return update(ref(config.db, `maps/${config.mapId}/markers/${id}`), data);
    },

    remove: (id) => {
      return remove(ref(config.db, `maps/${config.mapId}/markers/${id}`));
    },

    open: (id) => {
      if (config.onOpen && markersCache[id]) {
        config.onOpen(id, markersCache[id]);
      }
    }
  };
}

/* ─────────────────────────────
   DEFAULT RENDER
───────────────────────────── */

function defaultRender(config) {
  const container = config.container;
  if (!container) return;

  container.querySelectorAll(".marker").forEach(m => m.remove());

  const filter = config.filterFn ? config.filterFn() : "all";

  Object.entries(markersCache).forEach(([id, m]) => {
    if (filter !== "all" && m.type !== filter) return;

    const el = document.createElement("div");
    el.className = "marker";
    el.dataset.id = id;

    el.style.left = m.x + "%";
    el.style.top  = m.y + "%";

    if (config.isMobile && config.isMobile()) {
      el.classList.add("no-hover");
    }

    el.innerHTML = buildMarkerHTML(m, config.isMobile);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (config.onOpen) config.onOpen(id, m);
    });

    container.appendChild(el);
  });
}

/* ─────────────────────────────
   MARKER TEMPLATE
───────────────────────────── */

function buildMarkerHTML(m, isMobile) {
  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E?%3C/text%3E%3C/svg%3E";

  if (m.imgUrl) {
    return `
      <div class="marker-photo">
        <img src="${m.imgUrl}" onerror="this.src='${fallback}'" draggable="false">
      </div>
      ${!isMobile ? `<div class="marker-preview"><img src="${m.imgUrl}" draggable="false"></div>` : ""}
      <div class="marker-tooltip">${m.text || ""}</div>
    `;
  }

  if (m.iconUrl) {
    return `
      <div class="marker-photo">
        <img src="${m.iconUrl}" onerror="this.src='${fallback}'" draggable="false">
      </div>
      <div class="marker-tooltip">${m.text || ""}</div>
    `;
  }

  return `
    <div class="marker-icon ${m.type || ""}">
      <span>${m.emoji || "📍"}</span>
    </div>
    <div class="marker-tooltip">${m.text || ""}</div>
  `;
}
