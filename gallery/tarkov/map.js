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

/* ================= FIREBASE ================= */

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

const markersRef = ref(db, "markers");

/* ================= SAFE DOM ================= */

const map = document.getElementById("map");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* 🔥 FIX: поддержка разных HTML */
const modal =
    document.getElementById("modal") ||
    document.getElementById("createModal") ||
    null;

const textInput = document.getElementById("text");
const typeInput = document.getElementById("type");

const saveBtn = document.getElementById("save");
const deleteBtn = document.getElementById("delete");

const filter = document.getElementById("filter");
const search = document.getElementById("search");

/* ================= STATE ================= */

let isAdmin = false;
const ADMIN_EMAIL = "pinachet160@gmail.com";

let scale = 1;
let pos = { x: 0, y: 0 };

let drag = false;
let offset = { x: 0, y: 0 };

let currentMarker = null;
let pending = null;

/* ================= SAFE MODAL ================= */

function openModal() {
    if (!modal) {
        console.error("❌ modal не найден в HTML");
        return;
    }
    modal.style.display = "flex";
}

function closeModal() {
    if (!modal) {
        console.error("❌ modal не найден");
        return;
    }
    modal.style.display = "none";
}

/* ================= AUTH ================= */

loginBtn?.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(console.error);
});

logoutBtn?.addEventListener("click", () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {

    if (user && user.email === ADMIN_EMAIL) {
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

/* ================= DRAG ================= */

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

/* ================= ZOOM ================= */

window.addEventListener("wheel", (e) => {
    if (!map) return;

    e.preventDefault();

    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.min(Math.max(scale * zoom, 0.5), 3);

    update();

}, { passive: false });

function update() {
    if (!map) return;

    map.style.transform =
        `translate(${pos.x}px,${pos.y}px) scale(${scale})`;
}

/* ================= CREATE MARKER ================= */

map?.addEventListener("click", (e) => {

    if (!isAdmin) return;
    if (drag) return;

    const rect = map.getBoundingClientRect();

    pending = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100
    };

    currentMarker = null;

    openModal();
});

/* ================= SAVE ================= */

saveBtn?.addEventListener("click", () => {

    if (!markersRef) {
        console.error("❌ markersRef нет");
        return;
    }

    if (!pending) return;

    const data = {
        x: pending.x,
        y: pending.y,
        text: textInput?.value || "",
        type: typeInput?.value || "loot"
    };

    if (currentMarker?.id) {
        set(ref(db, "markers/" + currentMarker.id), data);
    } else {
        push(markersRef, data);
    }

    closeModal();
    pending = null;
});

/* ================= DELETE ================= */

deleteBtn?.addEventListener("click", () => {

    if (!currentMarker?.id) return;

    remove(ref(db, "markers/" + currentMarker.id));

    closeModal();
});

/* ================= LOAD ================= */

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

            currentMarker = { ...m, id };

            if (textInput) textInput.value = m.text || "";
            if (typeInput) typeInput.value = m.type || "loot";

            openModal();
        };

        map.appendChild(div);
    });
});
