import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ───────────────── FIREBASE ───────────────── */

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

/* ───────────────── MAP DETECTION ───────────────── */

const mapId = location.pathname.split("/").pop().replace(".html", "");

const mapImage = document.getElementById("mapImage");
const markerLayer = document.getElementById("markerLayer");

/* если файл называется woods.html → woods */

mapImage.src = `images/${mapId}.png`;

/* ───────────────── STATE ───────────────── */

const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

let isAdmin = false;
let markers = {};
let currentRef = null;
let currentMarker = null;

/* ───────────────── UI ELEMENTS ───────────────── */

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const filter = document.getElementById("filter");
const mapSelect = document.getElementById("mapSelect");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalImg = document.getElementById("modalImg");
const modalClose = document.getElementById("modalClose");

const editBtn = document.getElementById("editBtn");
const delBtn = document.getElementById("delBtn");

/* ───────────────── AUTH ───────────────── */

loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  isAdmin = !!(user && user.uid === ADMIN_UID);

  loginBtn.style.display = user ? "none" : "";
  logoutBtn.style.display = user ? "" : "none";

  editBtn.style.display = isAdmin ? "" : "none";
  delBtn.style.display = isAdmin ? "" : "none";
});

/* ───────────────── FIREBASE ───────────────── */

function subscribe() {
  currentRef = ref(db, `maps/${mapId}/markers`);

  onValue(currentRef, (snap) => {
    markers = snap.val() || {};
    render();
  });
}

subscribe();

/* ───────────────── RENDER ───────────────── */

function render() {
  markerLayer.innerHTML = "";

  const f = filter.value;

  Object.entries(markers).forEach(([id, m]) => {
    if (f !== "all" && m.type !== f) return;

    const el = document.createElement("div");
    el.className = "marker";
    el.style.left = m.x + "%";
    el.style.top = m.y + "%";

    el.innerHTML = `
      <div class="marker-icon">${getEmoji(m.type)}</div>
    `;

    el.onclick = () => openModal(id, m);

    markerLayer.appendChild(el);
  });
}

filter.onchange = render;

/* ───────────────── MODAL ───────────────── */

function openModal(id, m) {
  currentMarker = { id, ...m };

  modalTitle.textContent = m.text;
  modalText.textContent = m.text;

  if (m.imgUrl) {
    modalImg.style.display = "";
    modalImg.src = m.imgUrl;
  } else {
    modalImg.style.display = "none";
  }

  modal.classList.remove("hidden");
}

modalClose.onclick = () => {
  modal.classList.add("hidden");
  currentMarker = null;
};

/* ───────────────── ADMIN ACTIONS ───────────────── */

editBtn.onclick = () => {
  if (!currentMarker) return;

  const newText = prompt("Edit text:", currentMarker.text);
  if (!newText) return;

  update(ref(db, `maps/${mapId}/markers/${currentMarker.id}`), {
    text: newText
  });
};

delBtn.onclick = () => {
  if (!currentMarker) return;
  if (!confirm("Delete marker?")) return;

  remove(ref(db, `maps/${mapId}/markers/${currentMarker.id}`));
  modal.classList.add("hidden");
};

/* ───────────────── MAP SELECT (HTML SWITCH) ───────────────── */

const MAP_PAGES = [
  { id: "woods", file: "woods.html", label: "Лес" },
  { id: "customs", file: "customs.html", label: "Таможня" },
  { id: "interchange", file: "interchange.html", label: "Развязка" }
];

MAP_PAGES.forEach(m => {
  const opt = document.createElement("option");
  opt.value = m.file;
  opt.textContent = m.label;

  if (m.id === mapId) opt.selected = true;

  mapSelect.appendChild(opt);
});

mapSelect.onchange = (e) => {
  window.location.href = e.target.value;
};

/* ───────────────── LEFT / RIGHT TOGGLES ───────────────── */

document.getElementById("toggleLeft").onclick = () => {
  document.getElementById("leftPanel").classList.toggle("hidden");
};

document.getElementById("toggleRight").onclick = () => {
  document.getElementById("rightPanel").classList.toggle("hidden");
};

/* ───────────────── HELPERS ───────────────── */

function getEmoji(type) {
  switch (type) {
    case "loot": return "📦";
    case "boss": return "💀";
    case "quest": return "📋";
    case "exit": return "🚪";
    case "structure": return "🧩";
    default: return "📍";
  }
    }
