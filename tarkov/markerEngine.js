import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   MAP ENGINE (POLISHED)
───────────────────────── */

export class MapEngine {
  constructor({ mapImg, mapContainer }) {
    this.mapImg = mapImg;
    this.mapContainer = mapContainer;

    this.pz = null;

    this.mapId = state.get("mapId");

    this.initialized = false;
    this.currentImgUrl = null;
  }

  /* ─────────────────────────
     INIT
  ───────────────────────── */

  init() {
    if (this.initialized) return;

    this.initialized = true;

    this._initPanzoom();

    /* реагируем на глобальную смену карты */
    bus.on("map:change", (mapId) => {
      this.switchMap(mapId);
    });

    /* реакция на syncEngine */
    bus.on("map:sync", (mapId) => {
      this.switchMap(mapId, { silent: true });
    });

    console.log("[MAP ENGINE] initialized");
  }

  /* ─────────────────────────
     PANZOOM INIT
  ───────────────────────── */

  _initPanzoom() {
    if (!window.Panzoom) {
      console.warn("[MAP ENGINE] Panzoom not found");
      return;
    }

    this._destroyPanzoom();

    this.pz = Panzoom(this.mapContainer, {
      maxScale: 8,
      minScale: 0.5,
      contain: "outside"
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

  _destroyPanzoom() {
    if (this.pz) {
      this.pz.destroy();
      this.pz = null;
    }
  }

  /* ─────────────────────────
     SWITCH MAP
───────────────────────── */

  switchMap(mapId, options = {}) {
    if (!mapId || this.mapId === mapId) return;

    this.mapId = mapId;

    const { imgUrl, fallbackUrl, silent = false } = options;

    state.setMap(mapId);

    this._destroyPanzoom();

    /* загрузка картинки */
    this.mapImg.onload = () => {
      this._initPanzoom();
      this.resetView();
    };

    this.mapImg.onerror = () => {
      if (fallbackUrl) {
        this.mapImg.src = fallbackUrl;
      }
    };

    if (imgUrl) {
      this.currentImgUrl = imgUrl;
      this.mapImg.src = imgUrl;
    }

    if (!silent) {
      bus.emit("map:change", mapId);
    }
  }

  /* ─────────────────────────
     ZOOM API
───────────────────────── */

  zoomIn() {
    if (!this.pz) return;

    this.pz.zoom(this.pz.getScale() * 1.25);
  }

  zoomOut() {
    if (!this.pz) return;

    this.pz.zoom(this.pz.getScale() / 1.25);
  }

  resetView() {
    if (!this.pz || !this.mapImg) return;

    const iw = this.mapImg.naturalWidth;
    const ih = this.mapImg.naturalHeight;

    const vw = this.mapContainer.clientWidth;
    const vh = this.mapContainer.clientHeight;

    if (!iw || !ih || !vw || !vh) return;

    const scale = Math.min(vw / iw, vh / ih);

    const x = (vw - iw * scale) / 2;
    const y = (vh - ih * scale) / 2;

    this.pz.zoom(scale, { animate: false });
    this.pz.pan(x, y, { animate: false });
  }

  /* ─────────────────────────
     CLEANUP
───────────────────────── */

  destroy() {
    this._destroyPanzoom();
    this.initialized = false;
  }
}

/* ─────────────────────────
   FACTORY
───────────────────────── */

export function initMapEngine(config) {
  const engine = new MapEngine(config);
  engine.init();
  return engine;
}

/* ─────────────────────────
   GLOBAL INSTANCE (если нужно)
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
