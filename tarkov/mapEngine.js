import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

export class MapEngine {
  constructor({ mapImg, mapContainer }) {
    this.mapImg = mapImg;
    this.mapContainer = mapContainer;

    this.pz = null;

    this.mapId = state.get("mapId");

    this.loading = false;
    this.pendingMap = null;
  }

  /* ─────────────────────────
     INIT
  ───────────────────────── */

  init() {
    this._initPanzoom();

    bus.on("map:change", (mapId) => {
      this.switchMap(mapId);
    });
  }

  /* ─────────────────────────
     PANZOOM
  ───────────────────────── */

  _initPanzoom() {
    this.pz = Panzoom(this.mapContainer, {
      maxScale: 8,
      minScale: 0.5,
      contain: "outside",
    });

    this.mapContainer.parentElement.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.pz.zoomWithWheel(e);
      },
      { passive: false }
    );
  }

  /* ─────────────────────────
     SWITCH MAP (УЛУЧШЕНО)
  ───────────────────────── */

  switchMap(mapId, options = {}) {
    if (!mapId) return;

    // защита от повторного вызова
    if (this.loading && this.pendingMap === mapId) {
      return;
    }

    if (this.mapId === mapId && !options.force) {
      return;
    }

    this.loading = true;
    this.pendingMap = mapId;

    this.mapId = mapId;

    // ❗ UI слой НЕ должен писать напрямую в state
    // state.setMap(mapId) ← УБРАЛИ

    const { imgUrl, fallbackUrl } = options;

    this._clearPanzoom();

    this.mapImg.onload = () => {
      this._initPanzoom();
      this.resetView();

      this.loading = false;
      this.pendingMap = null;
    };

    this.mapImg.onerror = () => {
      if (fallbackUrl) {
        this.mapImg.src = fallbackUrl;
      }

      this.loading = false;
      this.pendingMap = null;
    };

    this.mapImg.src = imgUrl;
  }

  /* ─────────────────────────
     PANZOOM CLEANUP
  ───────────────────────── */

  _clearPanzoom() {
    if (this.pz) {
      this.pz.destroy();
      this.pz = null;
    }
  }

  /* ─────────────────────────
     VIEW CONTROL
  ───────────────────────── */

  zoomIn() {
    if (!this.pz) return;

    const scale = this.pz.getScale() * 1.3;
    this.pz.zoom(scale);
  }

  zoomOut() {
    if (!this.pz) return;

    const scale = this.pz.getScale() / 1.3;
    this.pz.zoom(scale);
  }

  resetView() {
    if (!this.pz) return;

    const iw = this.mapImg.naturalWidth;
    const ih = this.mapImg.naturalHeight;

    const vw = this.mapContainer.clientWidth;
    const vh = this.mapContainer.clientHeight;

    if (!iw || !ih) return;

    const scale = Math.min(vw / iw, vh / ih);

    const x = (vw - iw * scale) / 2;
    const y = (vh - ih * scale) / 2;

    this.pz.zoom(scale, { animate: false });
    this.pz.pan(x, y, { animate: false });
  }
}

/* ─────────────────────────
   HELPER EXPORT
───────────────────────── */

export function initMapEngine(config) {
  const engine = new MapEngine(config);
  engine.init();
  return engine;
}

/* ─────────────────────────
   GLOBAL CONTROL WRAPPERS
───────────────────────── */

let instance = null;

export function setMapEngine(i) {
  instance = i;
}

export function zoomIn() {
  instance?.zoomIn();
}

export function zoomOut() {
  instance?.zoomOut();
}

export function resetView() {
  instance?.resetView();
    }
