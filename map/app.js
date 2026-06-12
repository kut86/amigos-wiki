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

/* ── Типы ── */
const TYPE_EMOJI = {
  loot:"📦", boss:"💀", quest:"📋",
  custom:"⭐", bot:"🎯", exit:"🚪", structure:"🧩"
};
const TYPE_LABEL = {
  loot:"Loot", boss:"Boss", quest:"Quest",
  custom:"Custom", bot:"Снайпер", exit:"Выход", structure:"Точка интереса"
};

const QUICK_EMOJI = ["📍","⭐","🔥","💎","🛡","⚔️","🧨","💊","🗺","🏴","🔑","☠️","🎯","👁","🔒","📻","🚁","🪖","🧰","⚡"];

/* ── DOM ── */
const mapEl         = document.getElementById("map");
const mapImg        = document.getElementById("mapImage");
const loginBtn      = document.getElementById("loginBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const adminBadge    = document.getElementById("adminBadge");
const addModeBtn    = document.getElementById("addModeBtn");
const filterSel     = document.getElementById("filter");
const mapSelect     = document.getElementById("mapSelect");
const mapWrapper    = document.getElementById("mapWrapper");

/* ADD FORM */
const addForm       = document.getElementById("addForm");
const addName       = document.getElementById("addName");
const addType       = document.getElementById("addType");
const addImgUrl     = document.getElementById("addImgUrl");
const addIconUrl    = document.getElementById("addIconUrl");
const addEmojiInput = document.getElementById("addEmojiInput");
const addEmojiPicker= document.getElementById("addEmojiPicker");
const addExtraFields= document.getElementById("addExtraFields");
const addConfirm    = document.getElementById("addConfirm");
const addCancel     = document.getElementById("addCancel");

/* MODAL */
const modal         = document.getElementById("modal");
const modalTitle    = document.getElementById("modalTitle");
const modalBadge    = document.getElementById("modalBadge");
const modalPhoto    = document.getElementById("modalPhoto");
const modalDesc     = document.getElementById("modalDesc");
const modalCoords   = document.getElementById("modalCoords");
const modalExtras   = document.getElementById("modalExtras");
const editForm      = document.getElementById("editForm");
const editName      = document.getElementById("editName");
const editType      = document.getElementById("editType");
const editImgUrl    = document.getElementById("editImgUrl");
const editIconUrl   = document.getElementById("editIconUrl");
const editEmojiInput= document.getElementById("editEmojiInput");
const editEmojiPicker=document.getElementById("editEmojiPicker");
const editExtraFields=document.getElementById("editExtraFields");
const saveBtn       = document.getElementById("saveBtn");
const cancelEdit    = document.getElementById("cancelEdit");
const editBtn       = document.getElementById("editBtn");
const delBtn        = document.getElementById("delBtn");
const modalClose    = document.getElementById("modalClose");
let addQuill;
let editQuill;


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

/* ── Toast ── */
function toast(msg, err = false) {
  const tc = document.getElementById("toastContainer");
  const t  = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  tc.appendChild(t);
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
  if (pz) { pz.destroy(); pz = null; }
  mapImg.onload  = null;
  mapImg.onload  = () => { subscribe(); initPanzoom(); };
  mapImg.onerror = () => { mapImg.onerror = null; mapImg.src = MAPS[id].fallback; };
  mapImg.src = MAPS[id].imgUrl;
}

/* ── Panzoom ── */
let pz = null;

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
  toast("Нажмите на карту для добавления маркера");
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
  /* сброс формы */
  addName.value = addImgUrl.value = addIconUrl.value = addEmojiInput.value = "";
  addType.value = "loot";
  addQuill.setContents([]);
  addEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => b.classList.remove("active"));
  addExtraFields.innerHTML = "";
});

addConfirm.onclick = () => {
  if (!pendingPos) return;
  const name = addName.value.trim();
  if (!name) { toast("Введите название маркера", true); return; }

  /* Получаем HTML из Quill, проверяем не пустой ли */
  const textHTML = addQuill.root.innerHTML;
  const textVal  = addQuill.getText().trim() ? textHTML : null;

  const extraFields = collectExtraFields(addExtraFields);
  push(currentRef, {
    x: pendingPos.x, y: pendingPos.y,
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

/* ── Modal open ── */
function openModal(id, m) {
  history.replaceState(null, "", `#marker=${id}`);
  current = { id, ...m };

  modalTitle.textContent = m.name || "Маркер";
  modalBadge.textContent = TYPE_LABEL[m.type] || m.type;
  modalBadge.className   = `modal-type-badge badge-${m.type}`;

  /* Рендерим HTML описания (от Quill) через innerHTML */
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

  editBtn.style.display  = isAdmin ? "" : "none";
  delBtn.style.display   = isAdmin ? "" : "none";
  editForm.style.display = "none";
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
  editForm.style.display = "none";
}

/* ── Edit ── */
editBtn.onclick = () => {
  if (!current) return;
  editName.value    = current.name    || "";
  editType.value    = current.type    || "loot";
  editImgUrl.value  = current.imgUrl  || "";
  editIconUrl.value = current.iconUrl || "";
  editEmojiInput.value = current.emoji || "";

  /* Загружаем HTML описания в Quill */
  if (current.text) {
    editQuill.root.innerHTML = current.text;
  } else {
    editQuill.setContents([]);
  }

  editEmojiPicker.querySelectorAll(".emoji-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === current.emoji);
  });

  editExtraFields.innerHTML = "";
  (current.extraFields || []).forEach(f => addExtraFieldRow(editExtraFields, f.label, f.value));

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

  const textHTML = editQuill.root.innerHTML;
  const textVal  = editQuill.getText().trim() ? textHTML : null;

  const extraFields = collectExtraFields(editExtraFields);
  update(ref(db, `maps/${currentMap}/markers/${current.id}`), {
    x: current.x, y: current.y,
    name,
    text:        textVal,
    type:        editType.value,
    emoji:       editEmojiInput.value.trim()  || null,
    imgUrl:      editImgUrl.value.trim()      || null,
    iconUrl:     editIconUrl.value.trim()     || null,
    extraFields: extraFields.length ? extraFields : null,
  }).then(() => { toast("Сохранено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

document.getElementById("editExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(editExtraFields);
});

/* ── Delete ── */
delBtn.onclick = () => {
  if (!current) return;
  if (!confirm("Удалить маркер?")) return;
  remove(ref(db, `maps/${currentMap}/markers/${current.id}`))
    .then(() => { toast("Удалено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

/* ── Extra fields helpers ── */
function addExtraFieldRow(container, label = "", value = "") {
  const row = document.createElement("div");
  row.className = "extra-field-row";
  row.innerHTML = `
    <input type="text" class="extra-field-label" placeholder="Название поля" value="${esc(label)}">
    <input type="text" class="extra-field-value" placeholder="Значение"       value="${esc(value)}">
    <button type="button" class="extra-field-remove btn btn-sm btn-danger">✕</button>`;
  row.querySelector(".extra-field-remove").onclick = () => row.remove();
  container.appendChild(row);
}

function collectExtraFields(container) {
  const result = [];
  container.querySelectorAll(".extra-field-row").forEach(row => {
    const label = row.querySelector(".extra-field-label").value.trim();
    const value = row.querySelector(".extra-field-value").value.trim();
    if (label || value) result.push({ label, value });
  });
  return result;
}

/* ── Init ── */
switchMap("woods");

function waitAndOpen(id, m) {
  if (pz) {
    openModal(id, m);
  } else {
    setTimeout(() => waitAndOpen(id, m), 200);
  }
}

function checkUrlHash() {
  const hash = location.hash;
  if (!hash.startsWith("#marker=")) return;
  const id = hash.slice(8);

  const unsub = onValue(ref(db, `maps/${currentMap}/markers`), snap => {
    unsub();
    snap.forEach(i => { allMarkers[i.key] = i.val(); });
    const m = allMarkers[id];
    if (m) {
      render();
      waitAndOpen(id, m);
    } else {
      toast("Маркер не найден", true);
    }
  });
}
checkUrlHash();

/* ── Quill editors ── */
function addIframeHandler(quill) {
  const btn = quill.container.previousSibling.querySelector(".ql-iframe");
  if (!btn) return;
  btn.onclick = () => {
    const code = prompt("Вставь iframe код:");
    if (!code) return;
    const match = code.match(/src="([^"]+)"/);
    if (!match) { toast("Не найден src в iframe", true); return; }
    const src = match[1];
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, "video", src);
  };
}

const addQuill = new Quill("#addQuillEditor", {
  theme: "snow",
  placeholder: "Подробное описание...",
  modules: { toolbar: "#addQuillToolbar" }
});
addIframeHandler(addQuill);

const editQuill = new Quill("#editQuillEditor", {
  theme: "snow",
  placeholder: "Описание...",
  modules: { toolbar: "#editQuillToolbar" }
});
addIframeHandler(editQuill);
