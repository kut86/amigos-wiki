import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
getDatabase,
ref,
push,
onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
signOut,
onAuthStateChanged
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
/* DOM */

const map = document.getElementById("map");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const userStatus = document.getElementById("userStatus");

const createModal =
document.getElementById("createModal");

const viewModal =
document.getElementById("viewModal");

const markerType =
document.getElementById("markerType");

const markerDescription =
document.getElementById("markerDescription");

const saveMarkerBtn =
document.getElementById("saveMarkerBtn");

const cancelMarkerBtn =
document.getElementById("cancelMarkerBtn");

const closeViewBtn =
document.getElementById("closeViewBtn");

const viewText =
document.getElementById("viewText");

/* ADMIN */

const ADMIN_EMAIL =
"pinachet160@gmail.com";

let isAdmin = false;

/* MAP POSITION */

let scale = 1;

let pos = {
x: 0,
y: 0
};

function updateTransform() {

map.style.transform =
    `translate(${pos.x}px, ${pos.y}px) scale(${scale})`;

}

/* DRAG */

let dragging = false;

let dragStart = {
x: 0,
y: 0
};

map.addEventListener("mousedown", (e) => {

dragging = true;

dragStart.x = e.clientX - pos.x;
dragStart.y = e.clientY - pos.y;

});

window.addEventListener("mouseup", () => {

dragging = false;

});

window.addEventListener("mousemove", (e) => {

if (!dragging) return;

pos.x = e.clientX - dragStart.x;
pos.y = e.clientY - dragStart.y;

updateTransform();

});

/* ZOOM */

window.addEventListener("wheel", (e) => {

e.preventDefault();

if (e.deltaY < 0) {
    scale += 0.1;
} else {
    scale -= 0.1;
}

scale = Math.max(0.5, scale);
scale = Math.min(4, scale);

updateTransform();

}, { passive:false });

/* AUTH */

loginBtn.onclick = async () => {

try {

    await signInWithPopup(
        auth,
        provider
    );

} catch (err) {

    console.error(err);

}

};

logoutBtn.onclick = async () => {

await signOut(auth);

};

onAuthStateChanged(auth, (user) => {

if (!user) {

    isAdmin = false;

    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";

    userStatus.textContent =
        "Гость";

    return;
}

loginBtn.style.display = "none";
logoutBtn.style.display = "block";

userStatus.textContent =
    user.email;

isAdmin =
    user.email === ADMIN_EMAIL;

});

/* CREATE MARKER */

let pendingX = 0;
let pendingY = 0;

map.addEventListener("click", (e) => {

if (!isAdmin) return;

if (dragging) return;

const rect =
    map.getBoundingClientRect();

pendingX =
    ((e.clientX - rect.left)
        / rect.width) * 100;

pendingY =
    ((e.clientY - rect.top)
        / rect.height) * 100;

markerDescription.value = "";

createModal.style.display =
    "flex";

});

cancelMarkerBtn.onclick = () => {

createModal.style.display =
    "none";

};

saveMarkerBtn.onclick = async () => {

const text =
    markerDescription.value.trim();

if (!text) return;

await push(markersRef, {

    x: pendingX,
    y: pendingY,

    type:
        markerType.value,

    text

});

createModal.style.display =
    "none";

};

/* ICONS */

function getIcon(type) {

switch(type) {

    case "loot":
        return "💰";

    case "boss":
        return "💀";

    case "pmc":
        return "🔴";

    case "scav":
        return "🟡";

    case "quest":
        return "📜";

    case "mine":
        return "☠️";

    default:
        return "📍";
}

}

/* LOAD MARKERS */

onValue(markersRef, (snapshot) => {

document
    .querySelectorAll(".marker")
    .forEach(m => m.remove());

snapshot.forEach(item => {

    const marker =
        item.val();

    const div =
        document.createElement("div");

    div.className =
        "marker";

    div.style.left =
        marker.x + "%";

    div.style.top =
        marker.y + "%";

    div.innerHTML =
        getIcon(marker.type);

    div.onclick = (e) => {

        e.stopPropagation();

        viewText.textContent =
            marker.text || "";

        viewModal.style.display =
            "flex";

    };

    map.appendChild(div);

});

});

/* VIEW */

closeViewBtn.onclick = () => {

viewModal.style.display =
    "none";

};
