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

/* FIREBASE */
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

/* DOM */
const map = document.getElementById("map");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const modal = document.getElementById("modal");
const textInput = document.getElementById("text");
const typeSelect = document.getElementById("type");
const saveBtn = document.getElementById("save");
const deleteBtn = document.getElementById("delete");

const filter = document.getElementById("filter");
const search = document.getElementById("search");

/* ADMIN */
let isAdmin = false;
const ADMIN_EMAIL = "pinachet160@gmail.com";

/* MAP STATE */
let scale = 1;
let pos = { x: 0, y: 0 };

let drag = false;
let offset = { x: 0, y: 0 };

let currentMarker = null;
let pendingClick = null;

/* =========================
   AUTH
========================= */

loginBtn.onclick = () => {
    signInWithPopup(auth, provider);
};

logoutBtn.onclick = () => {
    signOut(auth);
};

onAuthStateChanged(auth, (user) => {

    if (user && user.email === ADMIN_EMAIL) {
        isAdmin = true;
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
    } else if (user) {
        isAdmin = false;
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
    } else {
        isAdmin = false;
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
    }
});

/* =========================
   DRAG
========================= */

map.addEventListener("mousedown", (e) => {
    drag = true;
    offset.x = e.clientX - pos.x;
    offset.y = e.clientY - pos.y;
    map.style.cursor = "grabbing";
});

window.addEventListener("mouseup", () => {
    drag = false;
    map.style.cursor = "grab";
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
    e.preventDefault();

    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(scale * zoom, 0.5), 3);

    pos.x = e.clientX - (e.clientX - pos.x) * (newScale / scale);
    pos.y = e.clientY - (e.clientY - pos.y) * (newScale / scale);

    scale = newScale;

    update();
}, { passive: false });

function update() {
    map.style.transform =
        `translate(${pos.x}px,${pos.y}px) scale(${scale})`;
}

/* =========================
   CREATE MARKER (FIXED)
========================= */

map.addEventListener("click", (e) => {

    if (!isAdmin) return;
    if (drag) return; // ❗ FIX: prevents accidental clicks

    const rect = map.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    pendingClick = { x, y };

    currentMarker = {
        id: null,
        x,
        y
    };

    textInput.value = "";
    typeSelect.value = "loot";

    modal.style.display = "flex";
});

/* =========================
   SAVE
========================= */

saveBtn.onclick = () => {

    if (!pendingClick) return;

    const data = {
        x: pendingClick.x,
        y: pendingClick.y,
        text: textInput.value,
        type: typeSelect.value
    };

    if (currentMarker?.id) {
        set(ref(db, "markers/" + currentMarker.id), data);
    } else {
        push(markersRef, data);
    }

    modal.style.display = "none";
    pendingClick = null;
};

/* =========================
   DELETE
========================= */

deleteBtn.onclick = () => {

    if (currentMarker?.id) {
        remove(ref(db, "markers/" + currentMarker.id));
    }

    modal.style.display = "none";
};

/* =========================
   LOAD MARKERS
========================= */

onValue(markersRef, (snap) => {

    document.querySelectorAll(".marker").forEach(m => m.remove());

    snap.forEach(i => {

        const m = i.val();
        const id = i.key;

        if (filter.value !== "all" && m.type !== filter.value) return;
        if (search.value && !m.text?.toLowerCase().includes(search.value.toLowerCase())) return;

        const div = document.createElement("div");

        div.className = "marker";
        div.style.left = m.x + "%";
        div.style.top = m.y + "%";

        div.innerHTML =
            m.type === "loot" ? "💰" :
            m.type === "boss" ? "💀" :
            m.type === "quest" ? "📜" :
            "📍";

        div.onclick = (e) => {

            e.stopPropagation();

            currentMarker = {
                ...m,
                id
            };

            textInput.value = m.text || "";
            typeSelect.value = m.type || "loot";

            modal.style.display = "flex";
        };

        map.appendChild(div);
    });
});
