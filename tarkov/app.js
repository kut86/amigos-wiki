import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged, signOut
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

const app      = initializeApp(firebaseConfig);
const db       = getDatabase(app);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

/* ── Карты ── */
const MAPS = {
  woods:       { label: "Лес",      imgUrl: "images/woods.png",       fallback: "https://gspics.org/images/2026/06/03/IDigvX.jpg" },
  customs:     { label: "Таможня",  imgUrl: "images/customs.jpg",     fallback: "https://i.imgur.com/FKY4S2W.jpg" },
  interchange: { label: "Развязка", imgUrl: "images/interchange.jpg", fallback: "https://i.imgur.com/FKY4S2W.jpg" }
};

/* ── DOM ── */
const mapEl        = document.getElementById("map");
const mapImg       = document.getElementById("mapImage");
const loginBtn     = document.getElementById("loginBtn");
const logoutBtn    = document.getElementById("logoutBtn");
const adminBadge   = document.getElementById("adminBadge");
const addModeBtn   = document.getElementById("addModeBtn");
const filterSel    = document.getElementById("filter");
const mapSelect    = document.getElementById("mapSelect");
const addForm      = document.getElementById("addForm");
const addName      = document.getElementById("addName");
const addText      = document.getElementById("addText");
const addType      = document.getElementById("addType");
const addImgUrl    = document.getElementById("addImgUrl");
const addIcon      = document.getElementById("addIcon");
const addConfirm   = document.getElementById("addConfirm");
const addCancel    = document.getElementById("addCancel");
const modal        = document.getElementById("modal");
const modalTitle   = document.getElementById("modalTitle");
const modalBadge   = document.getElementById("modalBadge");
const modalPhoto   = document.getElementById("modalPhoto");
const modalDesc    = document.getElementById("modalDesc");
const modalCoords  = document.getElementById("modalCoords");
const modalExtras  = document.getElementById("modalExtras");
const editForm     = document.getElementById("editForm");
const editName     = document.getElementById("editName");
const editText     = document.getElementById("editText");
const editType     = document.getElementById("editType");
const editImgUrl   = document.getElementById("editImgUrl");
const editIcon     = document.getElementById("editIcon");
const editExtraFields = document.getElementById("editExtraFields");
const addExtraFieldBtn = document.getElementById("addExtraFieldBtn");
const saveBtn      = document.getElementById("saveBtn");
const cancelEdit   = document.getElementById("cancelEdit");
const editBtn      = document.getElementById("editBtn");
const delBtn       = document.getElementById("delBtn");
const modalClose   = document.getElementById("modalClose");
const mapWrapper   = document.getElementById("mapWrapper");

/* ── State ── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";
let isAdmin    = false;
let currentMap = "woods";
let current    = null;
let addMode    = false;
let pendingPos = null;
let allMarkers = {};
let currentRef = null;
let offFn      = null;

const isMobile = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;

const TYPE_EMOJI = {
  loot:"📦", boss:"💀", quest:"📋",
  custom:"⭐", bot:"🎯", exit:"🚪", structure:"🧩"
};
const TYPE_LABEL = {
  loot:"Loot", boss:"Boss", quest:"Quest",
  custom:"Custom", bot:"Снайпер", exit:"Выход", structure:"Точка интереса"
};

/* ── Toast ── */
function toast(msg, err = false) {
  const toastCont = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Auth ── */
loginBtn.onclick  = () => signInWithPopup(auth, provider).catch(e => toast(e.message, true));
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  isAdmin = !!(user && user.uid === ADMIN_UID);
  loginBtn.style.display   = user    ? "none" : "";
  logoutBtn.style.display  = user    ? ""     : "none";
  adminBadge.style.display = isAdmin ? ""     : "none";
  addModeBtn.style.display = isAdmin ? ""     : "none";
  if (!isAdmin) exitAddMode();
});

/* ── Map switch ── */
mapSelect.addEventListener("change", e => switchMap(e.target.value));

function switchMap(id) {
  currentMap = id;

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  if (pz) {
    pz.destroy();
    pz = null;
  }

  mapImg.onload = null;

  mapImg.onload = () => {
    subscribe();
    initPanzoom();
  };

  mapImg.onerror = () => {
    mapImg.onerror = null;
    mapImg.src = MAPS[id].fallback;
  };
  mapImg.src = MAPS[id].imgUrl;
}

/* ── Panzoom ── */
let pz = null;

mapEl.parentElement.addEventListener("wheel", e => {
  e.preventDefault();
  if (pz) pz.zoomWithWheel(e);
}, { passive: false });

function initPanzoom() {
  if (pz) {
    pz.destroy();
    pz = null;
  }

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.5,
    contain: "outside",
  });

  setTimeout(() => {
    resetView();
    const scale = pz.getScale();
    pz.zoom(scale, { animate: false });
  }, 200);
}

/* ── RESET VIEW ── */
function resetView() {
  if (!pz) return;

  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  if (!iw || !ih) return;

  const vw = mapEl.clientWidth;
  const vh = mapEl.clientHeight;

  const scale = Math.min(vw / iw, vh / ih);

  const x = (vw - iw * scale) / 2;
  const y = (vh - ih * scale) / 2;

  pz.zoom(scale, { animate: false });
  pz.pan(x, y, { animate: false });
}

/* ── Zoom buttons ── */
document.getElementById("zoomIn").onclick = () => {
  if (!pz) return;
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const scale = pz.getScale() * 1.3;
  pz.zoomToPoint(scale, { clientX: cx, clientY: cy });
};

document.getElementById("zoomOut").onclick = () => {
  if (!pz) return;
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const scale = pz.getScale() / 1.3;
  pz.zoomToPoint(scale, { clientX: cx, clientY: cy });
};

document.getElementById("zoomReset").onclick = () => {
  if (!pz) return;
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  const s  = Math.min(window.innerWidth / iw, window.innerHeight / ih) * 0.8;
  pz.zoom(s, { animate: true });
  pz.pan(
    (window.innerWidth  - iw * s) / 2,
    (window.innerHeight - ih * s) / 2,
    { animate: true }
  );
};

window.addEventListener("resize", () => {
  if (!pz) return;
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  const s  = Math.min(window.innerWidth / iw, window.innerHeight / ih) * 0.8;
  pz.zoom(s, { animate: false });
  pz.pan(
    (window.innerWidth  - iw * s) / 2,
    (window.innerHeight - ih * s) / 2,
    { animate: false }
  );
});

/* ── Firebase subscribe ── */
function subscribe() {
  currentRef = ref(db, `maps/${currentMap}/markers`);
  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => { allMarkers[i.key] = i.val(); });
    render();
  });
}

/* ── Add mode ── */
addModeBtn.onclick = () => addMode ? exitAddMode() : enterAddMode();

function enterAddMode() {
  if (!isAdmin) return;
  addMode = true;
  addModeBtn.textContent = "✕ Отмена";
  addModeBtn.classList.add("btn-danger");
  mapWrapper.style.cursor = 'grabbing';
  toast("Нажмите на карту для добавления маркера");
}

function exitAddMode() {
  addMode    = false;
  pendingPos = null;
  addModeBtn.textContent = "+ Маркер";
  addModeBtn.classList.remove("btn-danger");
  addForm.style.display  = "none";
  mapWrapper.style.cursor = 'crosshair';
}

mapEl.addEventListener("click", e => {
  if (!addMode || !isAdmin) return;
  if (e.target.closest(".marker")) return;
  const r = mapEl.getBoundingClientRect();
  pendingPos = {
    x: ((e.clientX - r.left) / r.width)  * 100,
    y: ((e.clientY - r.top)  / r.height) * 100
  };
  addForm.style.display = "flex";
  addName.value = addText.value = addImgUrl.value = addIcon.value = "";
  addType.value = "loot";
  // Очищаем доп. поля формы добавления
  document.getElementById("addExtraFields").innerHTML = "";
});

/* ── Доп. поля в форме добавления ── */
document.getElementById("addExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(document.getElementById("addExtraFields"));
});

/* ── Confirm add ── */
addConfirm.onclick = () => {
  if (!pendingPos) return;
  const name = addName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }

  const extraFields = collectExtraFields(document.getElementById("addExtraFields"));

  push(currentRef, {
    x: pendingPos.x, y: pendingPos.y,
    name,
    text:      addText.value.trim() || null,
    type:      addType.value,
    imgUrl:    addImgUrl.value.trim()  || null,
    iconUrl:   addIcon.value.trim()    || null,
    extraFields: extraFields.length ? extraFields : null,
  }).then(() => { toast("Маркер добавлен"); exitAddMode(); })
    .catch(e => toast(e.message, true));
};
addCancel.onclick = exitAddMode;

/* ── Render ── */
function render() {
  document.querySelectorAll(".marker").forEach(m => m.remove());
  const f = filterSel.value;
  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== "all" && m.type !== f) return;
    createMarker(id, m);
  });
}
filterSel.addEventListener("change", render);

function createMarker(id, m) {
  const div      = document.createElement("div");
  div.className  = "marker";
  div.dataset.id = id;
  div.style.left = m.x + "%";
  div.style.top  = m.y + "%";
  if (isMobile()) div.classList.add("no-hover");

  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";

  // Тултип показывает name (или text для старых маркеров без name)
  const tooltipText = m.name || m.text || "";

  if (m.imgUrl) {
    div.innerHTML = `
      <div class="marker-photo"><img src="${esc(m.imgUrl)}" alt="" draggable="false" oncontextmenu="return false" onerror="this.src='${fallback}'"></div>
      ${isMobile() ? "" : `<div class="marker-preview"><img src="${esc(m.imgUrl)}" alt="" draggable="false" oncontextmenu="return false"></div>`}
      <div class="marker-tooltip">${esc(tooltipText)}</div>`;
  } else if (m.iconUrl) {
    div.innerHTML = `
      <div class="marker-photo" style="border-color:var(--${m.type}-color,var(--accent))">
        <img src="${esc(m.iconUrl)}" alt="" draggable="false" oncontextmenu="return false" onerror="this.src='${fallback}'">
      </div>
      <div class="marker-tooltip">${esc(tooltipText)}</div>`;
  } else {
    div.innerHTML = `
      <div class="marker-icon ${m.type}"><span>${TYPE_EMOJI[m.type] || "📍"}</span></div>
      <div class="marker-tooltip">${esc(tooltipText)}</div>`;
  }

  div.addEventListener("click", e => {
    e.stopPropagation();
    if (addMode) return;
    openModal(id, m);
  });
  mapEl.appendChild(div);
}

function esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ── Modal ── */
function openModal(id, m) {
  current = { id, ...m };

  // Заголовок: название маркера слева, тип-бейдж справа
  modalTitle.textContent = m.name || m.text || "Маркер";
  modalBadge.textContent = TYPE_LABEL[m.type] || m.type;
  modalBadge.className   = `modal-type-badge badge-${m.type}`;

  // Описание со скроллом
  modalDesc.textContent    = m.text || "";
  modalDesc.style.display  = m.text ? "" : "none";

  // Фото
  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  // Доп. поля (только просмотр)
  renderModalExtras(m.extraFields);

  editBtn.style.display    = isAdmin ? "" : "none";
  delBtn.style.display     = isAdmin ? "" : "none";
  editForm.style.display   = "none";
  modal.classList.add("open");
}

function renderModalExtras(extraFields) {
  modalExtras.innerHTML = "";
  if (!extraFields || !extraFields.length) return;

  extraFields.forEach(field => {
    if (!field.label && !field.value) return;
    const row = document.createElement("div");
    row.className = "modal-extra-row";
    row.innerHTML = `
      <span class="modal-extra-label">${esc(field.label)}</span>
      <span class="modal-extra-value">${esc(field.value)}</span>`;
    modalExtras.appendChild(row);
  });
}

modalClose.onclick = closeModal;
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove("open");
  current = null;
  editForm.style.display = "none";
}

/* ── Edit ── */
editBtn.onclick = () => {
  if (!current) return;
  editName.value   = current.name    || "";
  editText.value   = current.text    || "";
  editType.value   = current.type    || "loot";
  editImgUrl.value = current.imgUrl  || "";
  editIcon.value   = current.iconUrl || "";

  // Восстанавливаем доп. поля
  editExtraFields.innerHTML = "";
  if (current.extraFields && current.extraFields.length) {
    current.extraFields.forEach(f => {
      addExtraFieldRow(editExtraFields, f.label, f.value);
    });
  }

  editForm.style.display = "flex";
  editBtn.style.display  = "none";
};

cancelEdit.onclick = () => {
  editForm.style.display = "none";
  editBtn.style.display  = isAdmin ? "" : "none";
};

saveBtn.onclick = () => {
  if (!current) return;
  const name = editName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }

  const extraFields = collectExtraFields(editExtraFields);

  update(ref(db, `maps/${currentMap}/markers/${current.id}`), {
    x: current.x, y: current.y,
    name,
    text:        editText.value.trim()   || null,
    type:        editType.value,
    imgUrl:      editImgUrl.value.trim() || null,
    iconUrl:     editIcon.value.trim()   || null,
    extraFields: extraFields.length ? extraFields : null,
  }).then(() => { toast("Сохранено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

/* ── Delete ── */
delBtn.onclick = () => {
  if (!current) return;
  if (!confirm("Удалить маркер?")) return;
  remove(ref(db, `maps/${currentMap}/markers/${current.id}`))
    .then(() => { toast("Удалено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

/* ── Extra fields helpers ── */

// Добавляет строку с полями label+value в контейнер
function addExtraFieldRow(container, label = "", value = "") {
  const row = document.createElement("div");
  row.className = "extra-field-row";
  row.innerHTML = `
    <input type="text" class="extra-field-label" placeholder="Название поля" value="${esc(label)}">
    <input type="text" class="extra-field-value" placeholder="Значение" value="${esc(value)}">
    <button type="button" class="extra-field-remove btn btn-sm btn-danger">✕</button>`;
  row.querySelector(".extra-field-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

// Собирает заполненные доп. поля из контейнера
function collectExtraFields(container) {
  const rows = container.querySelectorAll(".extra-field-row");
  const result = [];
  rows.forEach(row => {
    const label = row.querySelector(".extra-field-label").value.trim();
    const value = row.querySelector(".extra-field-value").value.trim();
    if (label || value) result.push({ label, value });
  });
  return result;
}

/* ── Кнопка добавления доп. поля в форме редактирования ── */
addExtraFieldBtn.addEventListener("click", () => {
  addExtraFieldRow(editExtraFields);
});

/* ── Init ── */
switchMap("woods");
                             
