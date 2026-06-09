// mapEngine.js

import Panzoom from "https://unpkg.com/@panzoom/panzoom@4.5.1/dist/panzoom.min.js";

/* ─────────────────────────────
   STATE
───────────────────────────── */

let pz = null;
let currentMap = null;
let mapImg = null;
let mapContainer = null;

/* ─────────────────────────────
   INIT MAP ENGINE
───────────────────────────── */

export function initMapEngine(config) {
  /*
    config:
    {
      mapImg: HTMLImageElement,
      mapContainer: HTMLElement,
      onMapChange?: (mapId) => void
    }
  */

  mapImg = config.mapImg;
  mapContainer = config.mapContainer;

  /* wheel zoom */
  mapContainer.parentElement.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (pz) pz.zoomWithWheel(e);
  }, { passive: false });

  return {
    switchMap,
    resetView,
    zoomIn,
    zoomOut,
    destroy: () => {
      if (pz) pz.destroy();
      pz = null;
    }
  };
}

/* ─────────────────────────────
   SWITCH MAP
───────────────────────────── */

export function switchMap(mapId, mapConfig) {
  /*
    mapConfig:
    {
      imgUrl,
      fallbackUrl
    }
  */

  currentMap = mapId;

  if (pz) {
    pz.destroy();
    pz = null;
  }

  mapImg.onload = null;

  mapImg.onload = () => {
    initPanzoom();
  };

  mapImg.onerror = () => {
    mapImg.onerror = null;
    mapImg.src = mapConfig.fallbackUrl;
  };

  mapImg.src = mapConfig.imgUrl;
}

/* ─────────────────────────────
   PANZOOM INIT
───────────────────────────── */

function initPanzoom() {
  if (pz) {
    pz.destroy();
    pz = null;
  }

  pz = Panzoom(mapImg, {
    maxScale: 8,
    minScale: 0.5,
    contain: "outside"
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resetView();
    });
  });
}

/* ─────────────────────────────
   RESET VIEW (центр + масштаб)
───────────────────────────── */

export function resetView() {
  if (!pz || !mapImg) return;

  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;

  const vw = mapContainer.clientWidth;
  const vh = mapContainer.clientHeight;

  if (!iw || !ih) return;

  const scale = Math.min(vw / iw, vh / ih);

  const x = (vw - iw * scale) / 2;
  const y = (vh - ih * scale) / 2;

  pz.zoom(scale, { animate: false });
  pz.pan(x, y, { animate: false });
}

/* ─────────────────────────────
   ZOOM CONTROLS
───────────────────────────── */

export function zoomIn() {
  if (!pz) return;

  const scale = pz.getScale() * 1.3;

  pz.zoomToPoint(scale, {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  });
}

export function zoomOut() {
  if (!pz) return;

  const scale = pz.getScale() / 1.3;

  pz.zoomToPoint(scale, {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  });
}

/* ─────────────────────────────
   RESIZE FIX
───────────────────────────── */

window.addEventListener("resize", () => {
  if (!pz || !mapImg) return;
  resetView();
});
