import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import {
  onAuthChange,
  ensureUser,
  getUserRole
} from "./firebase.js";

/* ─────────────────────────
   DOM
───────────────────────── */

const mapContainer = document.getElementById("map");
const mapImage = document.getElementById("mapImage");

const mapSelect = document.getElementById("mapSelect");
const filterSel = document.getElementById("filter");

const modal = document.getElementById("confirmModal");
const confirmBtn = document.getElementById("confirmEnter");
const cancelBtn = document.getElementById("cancelEnter");

/* ─────────────────────────
   MAP DATA (ТВОЯ ЛОГИКА СОХРАНЕНА)
───────────────────────── */

const MAPS = {
  woods: {
    title: "Лес",
    img: "images/woods.png",
    fallback: "fallback.jpg"
  },
  customs: {
    title: "Таможня",
    img: "images/customs.png",
    fallback: "fallback.jpg"
  },
  interchange: {
    title: "Развязка",
    img: "images/interchange.png",
    fallback: "fallback.jpg"
  }
};

/* ─────────────────────────
   STATE INIT
───────────────────────── */

state.hydrate();

/* ─────────────────────────
   AUTH + ROLE SYSTEM
───────────────────────── */

onAuthChange(async (user) => {
  if (!user) return;

  await ensureUser(user);

  const role = await getUserRole(user.uid);

  state.setUser(user, role);

  if (role === "admin") {
    document.body.classList.add("admin");
    console.log("ADMIN MODE ENABLED (MAP)");
  }
});

/* ─────────────────────────
   CURRENT MAP STATE
───────────────────────── */

let selectedMap = null;

/* ─────────────────────────
   LOAD MAP (твоя функция — улучшенная)
───────────────────────── */

function loadMap(mapId, silent = false) {
  const map = MAPS[mapId];
  if (!map) return;

  state.setMap(mapId);

  mapImage.src = map.img;

  mapImage.onerror = () => {
    mapImage.src = map.fallback;
  };

  mapSelect.value = mapId;

  if (!silent) {
    bus.emit("map:change", mapId);
  }
}

/* ─────────────────────────
   SELECT UI
───────────────────────── */

mapSelect.addEventListener("change", (e) => {
  const newMap = e.target.value;

  bus.emit("map:requestChange", newMap);
});

/* ─────────────────────────
   CONFIRM SWITCH FLOW (твой подход сохранён)
───────────────────────── */

bus.on("map:requestChange", (mapId) => {
  const current = state.get("mapId");

  if (current === mapId) return;

  selectedMap = mapId;

  document.getElementById("confirmTitle").textContent =
    `Перейти на ${MAPS[mapId].title}?`;

  modal.classList.remove("hidden");
});

/* ─────────────────────────
   CONFIRM
───────────────────────── */

confirmBtn.addEventListener("click", () => {
  if (!selectedMap) return;

  loadMap(selectedMap);

  bus.emit("map:confirmed", selectedMap);

  modal.classList.add("hidden");
  selectedMap = null;

  // переход в wiki
  window.location.href = `wiki.html?map=${state.get("mapId")}`;
});

/* ─────────────────────────
   CANCEL
───────────────────────── */

cancelBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  selectedMap = null;
});

/* ─────────────────────────
   INIT
───────────────────────── */

loadMap(state.get("mapId") || "woods", true);
