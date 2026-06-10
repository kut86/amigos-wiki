import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   MAP ENGINE (FINAL STABLE)
───────────────────────── */

export class MapEngine {
  constructor({ mapImg, mapContainer }) {
    this.mapImg = mapImg;
    this.mapContainer = mapContainer;

    this.pz = null;

    this.mapId = state.get("mapId");
    this.initialized = false;

    this.currentImgUrl = null;
    this.loadingToken = 0;
  }

  /* ───────────────────────── */
  init() {
    if (this.initialized) return;

    this.initialized = true;

    this._initPanzoom();

    bus.on("map:request", (mapId) => {
      this.switchMap(mapId, { source: "ui" });
    });

    bus.on("map:sync", (mapId) => {
      this.switchMap(mapId, { source: "remote" });
    });

    console.log("[MAP ENGINE] initialized");
  }

  /* ───────────────────────── */
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
        this.pz?.zoomWithWheel(e);
      },
      { passive: false }
    );
  }

  _destroyPanzoom() {
    this.pz?.destroy();
    this.pz = null;
  }

  /* ───────────────────────── */
  switchMap(mapId, options = {}) {
    if (!mapId || this.mapId === mapId) return;

    const {
      imgUrl,
      fallbackUrl,
      source = "internal"
    } = options;

    this.mapId = mapId;

    /* state safe */
    if (state.get("mapId") !== mapId) {
      state.setMap(mapId);
    }

    this._destroyPanzoom();

    const token = ++this.loadingToken;

    this.mapImg.onload = () => {
      if (token !== this.loadingToken) return;

      this._initPanzoom();
      this.resetView();
    };

    this.mapImg.onerror = () => {
      if (fallbackUrl) {
        this.mapImg.src = fallbackUrl;
      }
    };

    /* image update */
    if (imgUrl && imgUrl !== this.currentImgUrl) {
      this.currentImgUrl = imgUrl;
      this.mapImg.src = imgUrl;
    }

    /* emit only UI-driven changes */
    if (source === "ui") {
      bus.emit("map:request", mapId);
    }
  }

  /* ───────────────────────── */
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

  destroy() {
    this._destroyPanzoom();
    this.initialized = false;
  }
}

/* ───────────────────────── */
export function initMapEngine(config) {
  const engine = new MapEngine(config);
  engine.init();
  return engine;
      }
