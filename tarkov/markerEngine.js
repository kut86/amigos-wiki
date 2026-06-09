import { ref, push, onValue, update, remove } from "./firebase.js";
import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

export class MarkerEngine {
  constructor({ db, container, isMobile, filterFn }) {
    this.db = db;
    this.container = container;

    this.isMobile = isMobile;
    this.filterFn = filterFn;

    this.mapId = state.get("mapId");

    this.currentRef = null;
    this.unsubscribe = null;

    this.markers = {};
  }

  /* ─────────────────────────
     INIT / SWITCH MAP
  ───────────────────────── */

  init(mapId) {
    this.mapId = mapId;
    state.setMap(mapId);

    this._subscribe();
  }

  switchMap(mapId) {
    this.mapId = mapId;
    state.setMap(mapId);

    this._unsubscribe();
    this.clearDOM();
    this._subscribe();
  }

  /* ─────────────────────────
     FIREBASE SUBSCRIBE
  ───────────────────────── */

  _subscribe() {
    this.currentRef = ref(this.db, `maps/${this.mapId}/markers`);

    this.unsubscribe = onValue(this.currentRef, (snap) => {
      this.markers = {};

      snap.forEach(item => {
        this.markers[item.key] = item.val();
      });

      this.render();
    });
  }

  _unsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /* ─────────────────────────
     CRUD
  ───────────────────────── */

  add(marker) {
    return push(this.currentRef, marker);
  }

  update(id, data) {
    return update(
      ref(this.db, `maps/${this.mapId}/markers/${id}`),
      data
    );
  }

  delete(id) {
    return remove(
      ref(this.db, `maps/${this.mapId}/markers/${id}`)
    );
  }

  /* ─────────────────────────
     RENDER
  ───────────────────────── */

  render() {
    this.clearDOM();

    const filter = this.filterFn?.() || "all";

    Object.entries(this.markers).forEach(([id, m]) => {
      if (filter !== "all" && m.type !== filter) return;

      const el = this._createMarker(id, m);
      this.container.appendChild(el);
    });
  }

  clearDOM() {
    this.container.querySelectorAll(".marker").forEach(el => el.remove());
  }

  /* ─────────────────────────
     CREATE MARKER
  ───────────────────────── */

  _createMarker(id, m) {
    const div = document.createElement("div");
    div.className = "marker";
    div.dataset.id = id;

    div.style.left = m.x + "%";
    div.style.top = m.y + "%";

    if (this.isMobile()) {
      div.classList.add("no-hover");
    }

    const fallback = this._fallbackIcon();

    if (m.imgUrl) {
      div.innerHTML = `
        <div class="marker-photo">
          <img src="${m.imgUrl}" onerror="this.src='${fallback}'">
        </div>
        ${this.isMobile() ? "" : `
        <div class="marker-preview">
          <img src="${m.imgUrl}">
        </div>`}
        <div class="marker-tooltip">${m.text}</div>
      `;
    } else if (m.iconUrl) {
      div.innerHTML = `
        <div class="marker-photo">
          <img src="${m.iconUrl}" onerror="this.src='${fallback}'">
        </div>
        <div class="marker-tooltip">${m.text}</div>
      `;
    } else {
      div.innerHTML = `
        <div class="marker-icon">
          📍
        </div>
        <div class="marker-tooltip">${m.text}</div>
      `;
    }

    /* ─────────────────────────
       CLICK → OPEN MODAL
    ───────────────────────── */

    div.addEventListener("click", (e) => {
      e.stopPropagation();

      bus.emit("marker:open", {
        id,
        ...m
      });
    });

    return div;
  }

  _fallbackIcon() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23333'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' fill='%23aaa'%3E?%3C/text%3E%3C/svg%3E";
  }
}
