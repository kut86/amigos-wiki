// map.js
import { MapEngine } from "./mapEngine.js";

/* ── список карт (глобальная карта мира) ── */
const MAPS = {
  woods: {
    name: "Лес",
    raidTime: "45 мин",
    image: "images/woods.png"
  },
  customs: {
    name: "Таможня",
    raidTime: "40 мин",
    image: "images/customs.jpg"
  },
  interchange: {
    name: "Развязка",
    raidTime: "50 мин",
    image: "images/interchange.jpg"
  }
};

/* ── engine ── */
const engine = new MapEngine(MAPS);

/* ── DOM ── */
const mapNodes = document.querySelectorAll(".map-node");
const currentMapLabel = document.getElementById("currentMapLabel");
const timeLabel = document.getElementById("timeLabel");
const previewImg = document.getElementById("mapPreview");

/* ── состояние ── */
let selectedMap = null;

/* ── обновление UI ── */
function updateUI(mapId) {
  const map = MAPS[mapId];
  if (!map) return;

  currentMapLabel.textContent = map.name;
  timeLabel.textContent = `Рейд: ${map.raidTime}`;
  previewImg.src = map.image;
}

/* ── клик по точке карты ── */
mapNodes.forEach(node => {
  node.addEventListener("click", () => {
    const mapId = node.dataset.map;

    if (!MAPS[mapId]) return;

    selectedMap = mapId;
    updateUI(mapId);

    openConfirm(mapId);
  });
});

/* ── подтверждение перехода ── */
function openConfirm(mapId) {
  const map = MAPS[mapId];

  const ok = confirm(
    `Перейти на карту: ${map.name}?\n` +
    `Время рейда: ${map.raidTime}`
  );

  if (!ok) return;

  engine.setMap(mapId);

  // сохраняем выбор (чтобы wiki могла восстановить)
  localStorage.setItem("selectedMap", mapId);

  // переход на wiki
  window.location.href = `/wiki.html?map=${mapId}`;
}

/* ── восстановление выбора при загрузке ── */
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("selectedMap");

  if (saved && MAPS[saved]) {
    selectedMap = saved;
    updateUI(saved);
  }
});
