import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase,
    ref,
    push,
    onValue,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================
   FIREBASE INIT (SAFE)
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyA7GnUlFkDcDKAv4ntXC6UZDjAkpaEgPMs",
  authDomain: "tarkovmap-376d0.firebaseapp.com",
  projectId: "tarkovmap-376d0",
  storageBucket: "tarkovmap-376d0.firebasestorage.app",
  messagingSenderId: "693794844907",
  appId: "1:693794844907:web:bb020ca896ae7b07acceae",
  databaseURL: "https://tarkovmap-376d0-default-rtdb.europe-west1.firebasedatabase.app"
};

let app, db, auth, markersRef;

try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    markersRef = ref(db, "markers");

    console.log("✅ Firebase подключен");
} catch (e) {
    console.error("❌ Firebase ошибка:", e);
}

/* =========================
   DOM SAFE CHECK
========================= */

const $ = (id) => document.getElementById(id);

const map = $("map");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");

const modal = $("modal");
const textInput = $("text");
const typeInput = $("type");
const saveBtn = $("save");
const deleteBtn = $("delete");

const filter = $("filter");
const search = $("search");

/* =========================
   STATE
========================= */

let isAdmin = false;
const ADMIN_EMAIL = "pinachet160@gmail.com";

let scale = 1;
let pos = { x: 0, y: 0 };
let drag = false;
let offset = { x: 0, y: 0 };

let currentMarker = null;
let pending = null;

/* =========================
   SAFETY WRAPPER
========================= */

function require(el, name) {
    if (!el) {
        console.error(`❌ Элемент не найден: ${name}`);
    }
    return el;
}

/* =========================
   AUTH SAFE
========================= */

const provider = new GoogleAuthProvider();

loginBtn?.addEventListener("click", () => {
    if (!auth) return console.error("Auth not ready");

    signInWithPopup(auth, provider)
        .catch(err => console.error("Login error:", err));
});

logoutBtn?.addEventListener("click", () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {

    if (user?.email === ADMIN_EMAIL) {
        isAdmin = true;
        console.log("🟢 ADMIN MODE");
    } else {
        isAdmin = false;
    }

    if (user) {
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
    } else {
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
    }
});

/* =========================
   DRAG
========================= */

map?.addEventListener("mousedown", (e) => {
    drag = true;
    offset.x = e.clientX - pos.x;
    offset.y = e.clientY - pos.y;
});

window.addEventListener("mouseup", () => {
    drag = false;
});

window.addEventListener("mousemove", (e) => {
    if (!drag) return;

    pos.x = e.clientX - offset.x;
    pos.y = e.clientY - offset.y;

    update();
});

/* =========================
   ZOOM
========================= */

window.addEventListener("wheel", (e) => {
    if (!map) return;

    e.preventDefault();

    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(scale * zoom, 0.5), 3);

    pos.x = e.clientX - (e.clientX - pos.x) * (newScale / scale);
    pos.y = e.clientY - (e.clientY - pos.y) * (newScale / scale);

    scale = newScale;

    update();

}, { passive: false });

function update() {
    if (!map) return;

    map.style.transform =
        `translate(${pos.x}px,${pos.y}px) scale(${scale})`;
}

/* =========================
   CREATE MARKER
========================= */

map?.addEventListener("click", (e) => {

    if (!isAdmin) return;
    if (drag) return;

    const rect = map.getBoundingClientRect();

    pending = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100
    };

    currentMarker = null;

    modal.style.display = "flex";
});

/* =========================
   SAVE (FIXED SAFE)
========================= */

saveBtn?.addEventListener("click", () => {

    if (!markersRef) {
        return console.error("❌ markersRef not ready");
    }

    if (!pending) {
        return console.warn("⚠️ Нет координат");
    }

    const data = {
        x: pending.x,
        y: pending.y,
        text: textInput.value || "",
        type: typeInput.value || "loot"
    };

    if (currentMarker?.id) {
        set(ref(db, "markers/" + currentMarker.id), data);
    } else {
        push(markersRef, data);
    }

    modal.style.display = "none";
    pending = null;
});

/* =========================
   DELETE SAFE
========================= */

deleteBtn?.addEventListener("click", () => {

    if (!currentMarker?.id) return;

    remove(ref(db, "markers/" + currentMarker.id));

    modal.style.display = "none";
});

/* =========================
   LOAD MARKERS (SAFE)
========================= */

function icon(type) {
    return {
        loot: "💰",
        boss: "💀",
        quest: "📜",
        pmc: "🔴",
        scav: "🟡",
        mine: "☠️"
    }[type] || "📍";
}

onValue(markersRef, (snap) => {

    if (!map) return;

    document.querySelectorAll(".marker")
        .forEach(m => m.remove());

    snap.forEach(i => {

        const m = i.val();
        const id = i.key;

        const div = document.createElement("div");
        div.className = "marker";

        div.style.left = m.x + "%";
        div.style.top = m.y + "%";

        div.innerHTML = icon(m.type);

        div.onclick = (e) => {

            e.stopPropagation();

            currentMarker = {
                ...m,
                id
            };

            textInput.value = m.text || "";
            typeInput.value = m.type || "loot";

            modal.style.display = "flex";
        };

        map.appendChild(div);
    });
});
