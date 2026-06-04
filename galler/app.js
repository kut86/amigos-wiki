/* ============================================================
   TARKOV MAP — app.js (FIXED STABLE VERSION)
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ── Firebase ── */
const firebaseConfig = {
  apiKey: "AIzaSyA7GnUlFkDcDKAv4ntXC6UZDjAkpaEgPMs",
  authDomain: "tarkovmap-376d0.firebaseapp.com",
  projectId: "tarkovmap-376d0",
  storageBucket: "tarkovmap-376d0.firebasestorage.app",
  messagingSenderId: "693794844907",
  appId: "1:693794844907:web:bb020ca896ae7b07acceae",
  databaseURL: "https://tarkovmap-376d0-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ── MAPS ── */
const MAPS = {
  woods: {
    label: "Лес",
    imgUrl: "https://i.imgur.com/IvAlf2V.jpeg"
  },
  customs: {
    label: "Таможня",
    imgUrl: "https://i.imgur.com/FKY4S2W.jpg"
  },
  interchange: {
    label: "Развязка",
    imgUrl: "https://gspics.org/images/2026/06/03/IDrVtJ.webp"
  }
};

/* ── DOM ── */
const mapWrapper = document.getElementById("mapWrapper");
const mapEl = document.getElementById("map");
const mapImg = document.getElementById("mapImage");
const mapSelect = document.getElementById("mapSelect");
const filterSel = document.getElementById("filter");

const statusBar = document.getElementById("statusBar");
const toastCont = document.getElementById("toastContainer");

/* ── STATE ── */
let pz = null;
let currentMap = "woods";
let currentRef = null;
let allMarkers = {};
let offFn = null;

/* ── HELPERS ── */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ── PANZOOM CORE FIX ── */
function initPanzoom() {
  if (!mapImg.naturalWidth || !mapImg.naturalHeight) return;

  if (pz) {
    pz.destroy();
    pz = null;
  }

  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;

  // фиксируем реальный размер карты
  mapEl.style.width = iw + "px";
  mapEl.style.height = ih + "px";

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.02,
    canvas: false,
    contain: false,
    panOnlyWhenZoomed: false
  });

  pz.reset();

  requestAnimationFrame(() => {
    const scale = Math.min(
      window.innerWidth / iw,
      window.innerHeight / ih
    ) * 0.95;

    pz.zoom(scale, { animate: false });

    const panX = (window.innerWidth - iw * scale) / 2;
    const panY = (window.innerHeight - ih * scale) / 2;

    pz.pan(panX, panY, { animate: false });

    updateStatus();
  });
}

/* ── LOAD MAP (ЕДИНАЯ ТОЧКА ПРАВДЫ) ── */
function loadMap(mapId) {
  if (!MAPS[mapId]) return;

  currentMap = mapId;

  if (offFn) {
    offFn();
    offFn = null;
  }

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  currentRef = ref(db, `maps/${mapId}/markers`);

  subscribeMarkers();

  mapImg.src = MAPS[mapId].imgUrl;

  toast(`Карта: ${MAPS[mapId].label}`);
}

/* ── PANZOOM INIT TRIGGER ── */
mapImg.addEventListener("load", () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initPanzoom();
    });
  });
});

/* ── ZOOM / STATUS ── */
function updateStatus() {
  if (!pz) return;
  const s = pz.getScale();
  statusBar.textContent =
    `${MAPS[currentMap].label} · ZOOM ${(s * 100).toFixed(0)}% · ${Object.keys(allMarkers).length} маркеров`;
}

/* ── FIREBASE ── */
function subscribeMarkers() {
  if (!currentRef) currentRef = ref(db, `maps/${currentMap}/markers`);

  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => {
      allMarkers[i.key] = i.val();
    });
    renderMarkers();
  });
}

/* ── RENDER MARKERS ── */
function renderMarkers() {
  document.querySelectorAll(".marker").forEach(m => m.remove());

  Object.entries(allMarkers).forEach(([id, m]) => {
    const div = document.createElement("div");
    div.className = "marker";
    div.style.left = m.x + "%";
    div.style.top = m.y + "%";
    div.innerHTML = `<div class="marker-icon">${m.type}</div>`;

    div.addEventListener("click", e => {
      e.stopPropagation();
      toast(m.text);
    });

    mapEl.appendChild(div);
  });

  updateStatus();
}

/* ── FILTER ── */
filterSel?.addEventListener("change", renderMarkers);

/* ── MAP SWITCH ── */
mapSelect?.addEventListener("change", e => {
  loadMap(e.target.value);
});

/* ── INIT ── */
loadMap("woods");
