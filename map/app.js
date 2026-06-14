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

/* ── Карты с уровнями ── */
const MAPS = {
  groundzero: {
    label: "Эпицентр",
    levels: {
      "0": { label: "Улица",  imgUrl: "images/groundzero/groundzero.png" },
      "1": { label: "1 этаж", imgUrl: "images/groundzero/level1.png" },
      "2": { label: "2 этаж", imgUrl: "images/groundzero/level2.png" },
    },
    fallback: "https://github.com/kut86/amigos-wiki/blob/main/map/images/groundzero/groundzero.png?raw=true"
  },
  streetsoftarkov: {
    label: "Улицы Таркова",
    levels: {
      "0": { label: "Улица",  imgUrl: "images/streetsoftarkov/streetsoftarkov.svg" },
      "1": { label: "1 этаж", imgUrl: "images/streetsoftarkov/level1.svg" },
    },
    fallback: ""
  },
  labs: {
    label: "Лаборатория",
    levels: {
      "0":  { label: "Б1",     imgUrl: "images/labs/labs.svg" },
      "-1": { label: "Б2",     imgUrl: "images/labs/labsB2.svg" },
    },
    fallback: "https://raw.githubusercontent.com/kut86/amigos-wiki/3b703c6b42941e6fc08ebaaf27ea7ef54d328452/map/images/labs/labs.svg"
  },
  interchange: {
    label: "Развязка",
    levels: {
      "0": { label: "Улица",  imgUrl: "images/interchange/interchange.avif" },
      "1": { label: "1 этаж", imgUrl: "images/interchange/level1.avif" },
      "2": { label: "2 этаж", imgUrl: "images/interchange/level2.avif" },
    },
    fallback: ""
  },
  customs: {
    label: "Таможня",
    levels: {
      "0": { label: "Основной", imgUrl: "images/customs/customs.jpg" },
    },
    fallback: "https://github.com/kut86/amigos-wiki/blob/main/map/images/customs/customs.jpg?raw=true"
  },
  factory: {
    label: "Завод",
    levels: {
      "0":  { label: "Основной", imgUrl: "images/factory/factory.svg" },
      "-1": { label: "Подвал",   imgUrl: "images/factory/basement.svg" },
    },
    fallback: ""
  },
  woods: {
    label: "Лес",
    levels: {
      "0": { label: "Основной", imgUrl: "images/woods/woods.jpg" },
    },
    fallback: ""
  },
  reserve: {
    label: "Резерв",
    levels: {
      "0":  { label: "Поверхность", imgUrl: "images/reserve/reserve.svg" },
      "-1": { label: "Подземный",   imgUrl: "images/reserve/underground.svg" },
    },
    fallback: ""
  },
  lighthouse: {
    label: "Маяк",
    levels: {
      "0": { label: "Основной", imgUrl: "images/lighthouse/lighthouse.svg" },
    },
    fallback: ""
  },
  shoreline: {
    label: "Берег",
    levels: {
      "0": { label: "Основной", imgUrl: "images/shoreline/shoreline.svg" },
    },
    fallback: ""
  },
  labyrinth: {
    label: "Лабиринт",
    levels: {
      "0": { label: "Основной", imgUrl: "images/labyrinth/labyrinth.svg" },
    },
    fallback: ""
  }
};

/* ── Типы ── */
const TYPE_EMOJI = {
  loot:"📦", boss:"💀", quest:"📋",
  info:"⭐", bot:"🎯", exit:"🚪", structure:"🧩", tain:"👁"
};
const TYPE_LABEL = {
  loot:"Лут", boss:"Босс", quest:"Квест",
  info:"Инфо", bot:"Бот", exit:"Выход", structure:"Точка интереса", tain:"Тайник"
};

const QUICK_EMOJI = ["📍","⭐","🔥","💎","⚔️","🧨","💊","🗺","🏴","🔑","☠️","🎯","👁","🔒","📻","🚁","🪖","🧰","⚡"];

/* ── DOM ── */
const mapEl          = document.getElementById("map");
const mapImg         = document.getElementById("mapImage");
const loginBtn       = document.getElementById("loginBtn");
const logoutBtn      = document.getElementById("logoutBtn");
const adminBadge     = document.getElementById("adminBadge");
const addModeBtn     = document.getElementById("addModeBtn");
const filterSel      = document.getElementById("filter");
const mapSelect      = document.getElementById("mapSelect");
const mapWrapper     = document.getElementById("mapWrapper");
const addForm        = document.getElementById("addForm");
const addName        = document.getElementById("addName");
const addType        = document.getElementById("addType");
const addImgUrl      = document.getElementById("addImgUrl");
const addIconUrl     = document.getElementById("addIconUrl");
const addEmojiInput  = document.getElementById("addEmojiInput");
const addEmojiPicker = document.getElementById("addEmojiPicker");
const addExtraFields = document.getElementById("addExtraFields");
const addConfirm     = document.getElementById("addConfirm");
const addCancel      = document.getElementById("addCancel");
const modal          = document.getElementById("modal");
const modalTitle     = document.getElementById("modalTitle");
const modalBadge     = document.getElementById("modalBadge");
const modalPhoto     = document.getElementById("modalPhoto");
const modalDesc      = document.getElementById("modalDesc");
const modalCoords    = document.getElementById("modalCoords");
const modalExtras    = document.getElementById("modalExtras");
const editForm       = document.getElementById("editForm");
const editName       = document.getElementById("editName");
const editType       = document.getElementById("editType");
const editImgUrl     = document.getElementById("editImgUrl");
const editIconUrl    = document.getElementById("editIconUrl");
const editEmojiInput = document.getElementById("editEmojiInput");
const editEmojiPicker= document.getElementById("editEmojiPicker");
const editExtraFields= document.getElementById("editExtraFields");
const saveBtn        = document.getElementById("saveBtn");
const cancelEdit     = document.getElementById("cancelEdit");
const editBtn        = document.getElementById("editBtn");
const delBtn         = document.getElementById("delBtn");
const modalClose     = document.getElementById("modalClose");
const levelUp        = document.getElementById("levelUp");
const levelDown      = document.getElementById("levelDown");
const levelLabel     = document.getElementById("levelLabel");
const levelControls  = document.getElementById("levelControls");

/* ── State ── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";
let isAdmin    = false;
let currentMap = "groundzero";
let currentLevel = 0;       // текущий уровень (число)
let current    = null;
let addMode    = false;
let pendingPos = null;
let allMarkers = {};
let currentRef = null;
let offFn      = null;
let pz         = null;
let addQuill;
let editQuill;

const isMobile = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/* ── Toast ── */
function toast(msg, err = false) {
  const tc = document.getElementById("toastContainer");
  const t  = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Уровни ── */
function getLevels() {
  return MAPS[currentMap]?.levels || { "0": { label: "Основной", imgUrl: MAPS[currentMap]?.imgUrl || "" } };
}

function getLevelKeys() {
  return Object.keys(getLevels()).map(Number).sort((a, b) => a - b);
}

function updateLevelUI() {
  const keys = getLevelKeys();
  const levels = getLevels();
  const hasMultiple = keys.length > 1;

  levelControls.style.display = hasMultiple ? "flex" : "none";
  if (!hasMultiple) return;

  const idx = keys.indexOf(currentLevel);
  levelUp.disabled   = idx >= keys.length - 1;
  levelDown.disabled = idx <= 0;
  levelLabel.textContent = levels[String(currentLevel)]?.label || String(currentLevel);
}

function setLevel(lvl) {
  currentLevel = lvl;
  const levels = getLevels();
  const levelData = levels[String(lvl)];
  if (levelData) {
    mapImg.style.opacity = "0.4";
    setTimeout(() => {
      mapImg.src = levelData.imgUrl;
      mapImg.onload = () => { mapImg.style.opacity = "1"; };
    }, 150);
  }
  updateLevelUI();
  render();
}

levelUp.onclick = () => {
  const keys = getLevelKeys();
  const idx  = keys.indexOf(currentLevel);
  if (idx < keys.length - 1) setLevel(keys[idx + 1]);
};

levelDown.onclick = () => {
  const keys = getLevelKeys();
  const idx  = keys.indexOf(currentLevel);
  if (idx > 0) setLevel(keys[idx - 1]);
};

/* ── Показ/скрытие формы редактирования ── */
function showEditForm() {
  editForm.classList.add("active");
  saveBtn.style.display    = "";
  cancelEdit.style.display = "";
  editBtn.style.display    = "none";
  setTimeout(() => { if (editQuill) editQuill.update(); }, 60);
}

function hideEditForm() {
  editForm.classList.remove("active");
  saveBtn.style.display    = "none";
  cancelEdit.style.display = "none";
  editBtn.style.display    = isAdmin ? "" : "none";
  delBtn.style.display     = isAdmin ? "" : "none";
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
  localStorage.setItem("lastMap", id);
  currentMap   = id;
  currentLevel = 0;

  if (offFn) offFn();
  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());
  if (pz) { pz.destroy(); pz = null; }

  const levels   = getLevels();
  const level0   = levels["0"];
  const firstImg = level0?.imgUrl || "";
  const fallback = MAPS[id]?.fallback || "";

  mapImg.style.opacity = "1";
  mapImg.onload  = null;
  mapImg.onload  = () => { subscribe(); initPanzoom(); updateLevelUI(); };
  mapImg.onerror = () => { mapImg.onerror = null; if (fallback) mapImg.src = fallback; };
  mapImg.src = firstImg;

  updateLevelUI();
}

/* ── Panzoom ── */
mapEl.parentElement.addEventListener("wheel", e => {
  e.preventDefault();
  if (pz) pz.zoomWithWheel(e);
}, { passive: false });

function initPanzoom() {
  if (pz) { pz.destroy(); pz = null; }
  pz = Panzoom(mapEl, { maxScale: 8, minScale: 0.5, contain: "outside" });
  setTimeout(() => { resetView(); pz.zoom(pz.getScale(), { animate: false }); }, 200);
}

function resetView() {
  if (!pz) return;
  const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;
  if (!iw || !ih) return;
  const vw = mapEl.clientWidth, vh = mapEl.clientHeight;
  const scale = Math.min(vw / iw, vh / ih);
  pz.zoom(scale, { animate: false });
  pz.pan((vw - iw * scale) / 2, (vh - ih * scale) / 2, { animate: false });
}

document.getElementById("zoomIn").onclick = () => {
  if (!pz) return;
  pz.zoomToPoint(pz.getScale() * 1.3, { clientX: window.innerWidth/2, clientY: window.innerHeight/2 });
};
document.getElementById("zoomOut").onclick = () => {
  if (!pz) return;
  pz.zoomToPoint(pz.getScale() / 1.3, { clientX: window.innerWidth/2, clientY: window.innerHeight/2 });
};
document.getElementById("zoomReset").onclick = () => {
  if (!pz) return;
  const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;
  const s = Math.min(window.innerWidth/iw, window.innerHeight/ih) * 0.8;
  pz.zoom(s, { animate: true });
  pz.pan((window.innerWidth - iw*s)/2, (window.innerHeight - ih*s)/2, { animate: true });
};
window.addEventListener("resize", () => {
  if (!pz) return;
  const iw = mapImg.naturalWidth, ih = mapImg.naturalHeight;
  const s = Math.min(window.innerWidth/iw, window.innerHeight/ih) * 0.8;
  pz.zoom(s, { animate: false });
  pz.pan((window.innerWidth - iw*s)/2, (window.innerHeight - ih*s)/2, { animate: false });
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

/* ── Emoji picker ── */
function buildEmojiPicker(pickerEl, inputEl) {
  pickerEl.innerHTML = "";
  QUICK_EMOJI.forEach(em => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-btn";
    btn.textContent = em;
    btn.onclick = () => {
      inputEl.value = em;
      pickerEl.querySelectorAll(".emoji-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
    pickerEl.appendChild(btn);
  });
}

buildEmojiPicker(addEmojiPicker, addEmojiInput);
buildEmojiPicker(editEmojiPicker, editEmojiInput);

/* ── Add mode ── */
addModeBtn.onclick = () => addMode ? exitAddMode() : enterAddMode();

function enterAddMode() {
  if (!isAdmin) return;
  addMode = true;
  addModeBtn.textContent = "✕ Отмена";
  addModeBtn.classList.add("btn-danger");
  mapWrapper.style.cursor = "crosshair";
  toast(`Нажмите на карту для добавления маркера (уровень: ${currentLevel})`);
}

function exitAddMode() {
  addMode    = false;
  pendingPos = null;
  addModeBtn.textContent = "+ Маркер";
  addModeBtn.classList.remove("btn-danger");
  addForm.style.display  = "none";
  mapWrapper.style.cursor = "";
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
  addName.value = addImgUrl.value = addIconUrl.value = addEmojiInput.value = "";
  addType.value = "loot";
  if (addQuill) addQuill.setContents([]);
  addEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => b.classList.remove("active"));
  addExtraFields.innerHTML = "";
});

addConfirm.onclick = () => {
  if (!pendingPos) return;
  const name = addName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }
  const textHTML = addQuill ? addQuill.root.innerHTML : null;
  const textVal  = (addQuill && addQuill.getText().trim()) ? textHTML : null;
  const extraFields = collectExtraFields(addExtraFields);
  push(currentRef, {
    x: pendingPos.x, y: pendingPos.y,
    level: currentLevel,          // ← записываем текущий уровень
    name,
    text:        textVal,
    type:        addType.value,
    emoji:       addEmojiInput.value.trim()  || null,
    imgUrl:      addImgUrl.value.trim()      || null,
    iconUrl:     addIconUrl.value.trim()     || null,
    extraFields: extraFields.length ? extraFields : null,
  }).then(() => { toast("Маркер добавлен"); exitAddMode(); })
    .catch(e => toast(e.message, true));
};
addCancel.onclick = exitAddMode;

document.getElementById("addExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(addExtraFields);
});

/* ── Render — показываем только маркеры текущего уровня ── */
function render() {
  document.querySelectorAll(".marker").forEach(m => m.remove());
  const f = filterSel.value;
  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== "all" && m.type !== f) return;
    /* level: null/undefined = старые маркеры без уровня → показываем на уровне 0 */
    const markerLevel = m.level ?? 0;
    if (markerLevel !== currentLevel) return;
    createMarker(id, m);
  });
}
filterSel.addEventListener("change", render);

/* ── Create marker DOM ── */
function createMarker(id, m) {
  const div      = document.createElement("div");
  div.className  = "marker";
  div.dataset.id = id;
  div.style.left = m.x + "%";
  div.style.top  = m.y + "%";
  if (isMobile()) div.classList.add("no-hover");

  const tooltipText = m.name || "";
  let iconHTML = "";
  if (m.iconUrl) {
    const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";
    iconHTML = `<div class="marker-icon icon-img"><img src="${esc(m.iconUrl)}" alt="" draggable="false" oncontextmenu="return false" onerror="this.src='${fallback}'"></div>`;
  } else {
    const displayEmoji = m.emoji || TYPE_EMOJI[m.type] || "📍";
    iconHTML = `<div class="marker-icon ${m.type}"><span>${displayEmoji}</span></div>`;
  }
  const previewHTML = (!isMobile() && m.imgUrl)
    ? `<div class="marker-preview"><img src="${esc(m.imgUrl)}" alt="" draggable="false" oncontextmenu="return false"></div>`
    : "";

  div.innerHTML = `${iconHTML}${previewHTML}<div class="marker-tooltip">${esc(tooltipText)}</div>`;
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
  history.replaceState(null, "", `#marker=${id}`);
  current = { id, ...m };
  modalTitle.textContent = m.name || "Маркер";
  modalBadge.textContent = TYPE_LABEL[m.type] || m.type;
  modalBadge.className   = `modal-type-badge badge-${m.type}`;
  if (m.text) {
    modalDesc.innerHTML     = m.text;
    modalDesc.style.display = "";
  } else {
    modalDesc.innerHTML     = "";
    modalDesc.style.display = "none";
  }
  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;
  renderModalExtras(m.extraFields);
  hideEditForm();
  modal.classList.add("open");
}

function renderModalExtras(extraFields) {
  modalExtras.innerHTML = "";
  if (!extraFields || !extraFields.length) return;
  extraFields.forEach(f => {
    if (!f.label && !f.value) return;
    const row = document.createElement("div");
    row.className = "modal-extra-row";
    row.innerHTML = `<span class="modal-extra-label">${esc(f.label)}</span><span class="modal-extra-value">${esc(f.value)}</span>`;
    modalExtras.appendChild(row);
  });
}

modalClose.onclick = closeModal;
document.getElementById("copyLinkBtn").onclick = () => {
  const url = `${location.origin}${location.pathname}#marker=${current.id}`;
  navigator.clipboard.writeText(url)
    .then(() => toast("Ссылка скопирована"))
    .catch(() => toast("Не удалось скопировать", true));
};
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

function closeModal() {
  history.replaceState(null, "", location.pathname);
  modal.classList.remove("open");
  current = null;
  hideEditForm();
}

/* ── Edit ── */
editBtn.onclick = () => {
  if (!current) return;
  editName.value       = current.name    || "";
  editType.value       = current.type    || "loot";
  editImgUrl.value     = current.imgUrl  || "";
  editIconUrl.value    = current.iconUrl || "";
  editEmojiInput.value = current.emoji   || "";
  if (editQuill) {
    if (current.text) {
      editQuill.root.innerHTML = current.text;
    } else {
      editQuill.setContents([]);
    }
  }
  editEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === current.emoji);
  });
  editExtraFields.innerHTML = "";
  (current.extraFields || []).forEach(f => addExtraFieldRow(editExtraFields, f.label, f.value));
  showEditForm();
};

cancelEdit.onclick = () => hideEditForm();

saveBtn.onclick = () => {
  if (!current) return;
  const name = editName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }
  const textHTML = editQuill ? editQuill.root.innerHTML : null;
  const textVal  = (editQuill && editQuill.getText().trim()) ? textHTML : null
