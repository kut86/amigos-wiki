let pz = null;

const mapWrapper = document.getElementById("mapWrapper");
const mapEl = document.getElementById("map");
const mapImg = document.getElementById("mapImage");

/* ── INIT ── */
export function initPanzoom() {
  if (pz) {
    pz.destroy();
    pz = null;
  }

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.5,
    contain: "outside",
    startScale: 1,
  });

  // wheel zoom (один раз)
  mapWrapper.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (!pz) return;
      pz.zoomWithWheel(e);
    },
    { passive: false }
  );

  // центрируем после загрузки
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resetView();
    });
  });
}

/* ── RESET VIEW ── */
export function resetView() {
  if (!pz) return;
  if (!mapImg.naturalWidth) return;

  const vw = mapWrapper.clientWidth;
  const vh = mapWrapper.clientHeight;

  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;

  const scale = Math.min(vw / iw, vh / ih);

  const x = (vw - iw * scale) / 2;
  const y = (vh - ih * scale) / 2;

  pz.zoom(scale, { animate: false });
  pz.pan(x, y, { animate: false });
}

/* ── GET SCALE (для других модулей) ── */
export function getScale() {
  return pz ? pz.getScale() : 1;
}

/* ── DESTROY (при смене карты) ── */
export function destroyPanzoom() {
  if (pz) {
    pz.destroy();
    pz = null;
  }
}

/* ── ZOOM HELPERS ── */
export function zoomIn() {
  if (!pz) return;
  const s = pz.getScale() * 1.3;
  pz.zoomToPoint(s, {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2,
  });
}

export function zoomOut() {
  if (!pz) return;
  const s = pz.getScale() / 1.3;
  pz.zoomToPoint(s, {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2,
  });
}

export function zoomReset() {
  resetView();
}

/* ── resize fix ── */
window.addEventListener("resize", () => {
  if (!pz) return;
  resetView();
});
