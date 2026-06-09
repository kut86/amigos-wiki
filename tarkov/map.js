import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   CONFIG ЛОКАЦИЙ
───────────────────────── */

const LOCATIONS = {
  woods: {
    name: "Лес",
    img: "images/woods.png",
    timeOffset: 0
  },
  customs: {
    name: "Таможня",
    img: "images/customs.jpg",
    timeOffset: 2
  },
  interchange: {
    name: "Развязка",
    img: "images/interchange.jpg",
    timeOffset: 4
  }
};

/* ─────────────────────────
   DOM
───────────────────────── */

const map = document.getElementById("map");
const mapImg = document.getElementById("mapImage");

const confirmModal = createConfirmModal();

/* ─────────────────────────
   STATE
───────────────────────── */

let currentLocation = null;

/* ─────────────────────────
   INIT
───────────────────────── */

init();

/* ─────────────────────────
   INIT FUNCTION
───────────────────────── */

function init() {
  const saved = localStorage.getItem("lastLocation") || "woods";
  loadMap(saved);

  renderLocations();
}

/* ─────────────────────────
   LOAD MAP
───────────────────────── */

function loadMap(id) {
  currentLocation = id;
  state.setMap(id);

  mapImg.src = LOCATIONS[id].img;

  localStorage.setItem("lastLocation", id);

  updateTime(id);
}

/* ─────────────────────────
   RENDER LOCATIONS
───────────────────────── */

function renderLocations() {
  Object.entries(LOCATIONS).forEach(([id, loc]) => {
    const el = document.createElement("div");
    el.className = "location-marker";
    el.dataset.id = id;

    el.innerHTML = `
      <div class="location-dot"></div>
      <div class="location-label">${loc.name}</div>
    `;

    el.style.position = "absolute";

    /* 👉 временно рандом позиция (потом заменишь на координаты) */
    el.style.left = Math.random() * 80 + 10 + "%";
    el.style.top = Math.random() * 80 + 10 + "%";

    el.addEventListener("click", () => {
      openConfirm(id);
    });

    map.appendChild(el);
  });
}

/* ─────────────────────────
   CONFIRM FLOW
───────────────────────── */

function openConfirm(id) {
  const loc = LOCATIONS[id];

  confirmModal.show(
    `Перейти в ${loc.name}?`,
    () => goToLocation(id)
  );
}

function goToLocation(id) {
  state.setMap(id);

  localStorage.setItem("lastLocation", id);

  window.location.href = `wiki.html?map=${id}`;
}

/* ─────────────────────────
   TIME SYSTEM (заготовка)
───────────────────────── */

function updateTime(id) {
  const offset = LOCATIONS[id].timeOffset || 0;

  const baseHour = new Date().getHours();
  const gameHour = (baseHour + offset) % 24;

  const isNight = gameHour >= 21 || gameHour < 6;

  bus.emit("time:update", {
    mapId: id,
    hour: gameHour,
    isNight
  });
}

/* ─────────────────────────
   SIMPLE CONFIRM MODAL
───────────────────────── */

function createConfirmModal() {
  const el = document.createElement("div");
  el.className = "confirm-modal";
  el.style.display = "none";

  el.innerHTML = `
    <div class="confirm-box">
      <p class="confirm-text"></p>
      <div class="confirm-actions">
        <button class="btn-yes">Да</button>
        <button class="btn-no">Нет</button>
      </div>
    </div>
  `;

  document.body.appendChild(el);

  const text = el.querySelector(".confirm-text");
  const yes = el.querySelector(".btn-yes");
  const no = el.querySelector(".btn-no");

  let onConfirm = null;

  yes.onclick = () => {
    el.style.display = "none";
    onConfirm?.();
  };

  no.onclick = () => {
    el.style.display = "none";
  };

  return {
    show(message, callback) {
      text.textContent = message;
      onConfirm = callback;
      el.style.display = "flex";
    }
  };
}
