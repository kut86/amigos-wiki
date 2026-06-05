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
  woods:       { label: "Лес",      imgUrl: "https://i.imgur.com/FKY4S2W.jpg" },
  customs:     { label: "Таможня",  imgUrl: "https://i.imgur.com/FKY4S2W.jpg" },
  interchange: { label: "Развязка", imgUrl: "https://i.imgur.com/FKY4S2W.jpg" }
};

/* ── DOM ── */
const mapEl      = document.getElementById("map");
const mapImg     = document.getElementById("mapImage");
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const adminBadge = document.getElementById("adminBadge");
const addModeBtn = document.getElementById("addModeBtn");
const filterSel  = document.getElementById("filter");
const mapSelect  = document.getElementById("mapSelect");
const addForm    = document.getElementById("addForm");
const addText    = document.getElementById("addText");
const addType    = document.getElementById("addType");
const addImgUrl  = document.getElementById("addImgUrl");
const addIcon    = document.getElementById("addIcon");
const addConfirm = document.getElementById("addConfirm");
const addCancel  = document.getElementById("addCancel");
const modal      = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBadge = document.getElementById("modalBadge");
const modalPhoto = document.getElementById("modalPhoto");
const modalDesc  = document.getElementById("modalDesc");
const modalCoords= document.getElementById("modalCoords");
const editForm   = document.getElementById("editForm");
const editText   = document.getElementById("editText");
const editType   = document.getElementById("editType");
const editImgUrl = document.getElementById("editImgUrl");
const editIcon   = document.getElementById("editIcon");
const saveBtn    = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");
const editBtn    = document.getElementById("editBtn");
const delBtn     = document.getElementById("delBtn");
const modalClose = document.getElementById("modalClose");

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

/* ── Map switch с пересозданием pamzoom ── */
/*mapSelect.addEventListener("change", e => switchMap(e.target.value));

function switchMap(id) {
  currentMap = id;
  if (offFn) offFn();
  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());
  mapImg.src = MAPS[id].imgUrl;
  if (mapImg.complete && mapImg.naturalWidth) {
    initPanzoom();
    subscribe();
  } else {
    mapImg.onload = () => { initPanzoom(); subscribe(); };
  }
}*/
/* ── Map switch ── */
/*mapSelect.addEventListener("change", e => switchMap(e.target.value));

function switchMap(id) {
  currentMap = id;

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  mapImg.onload = () => {
    subscribe();

    if (!pz) initPanzoom();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resetView();
      });
    });
  };

  mapImg.src = MAPS[id].imgUrl;
}*/
/* ── Map switch ── */
mapSelect.addEventListener("change", e => switchMap(e.target.value));

function switchMap(id) {
  currentMap = id;

  // остановка старой подписки Firebase
  if (offFn) offFn();

  // очистка маркеров
  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  // сброс состояния panzoom (ВАЖНО)
  if (pz) {
    pz.destroy();
    pz = null;
  }

  // сброс загрузки картинки (чтобы не словить старый onload)
  mapImg.onload = null;

  mapImg.onload = () => {
    subscribe();

    // создаём panzoom ТОЛЬКО после загрузки картинки
    initPanzoom();
  };

  mapImg.src = MAPS[id].imgUrl;
}
/* ── Panzoom старый── */
/*let pz = null;*/

/* колесо — один раз */
/*mapEl.parentElement.addEventListener("wheel", e => {
  e.preventDefault();
  if (pz) pz.zoomWithWheel(e);
}, { passive: false });

function initPanzoom() {
  if (pz) { pz.destroy(); pz = null; }

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.5,
    contain: "outside",
  });*/

/* старая версия 1*/
 /* requestAnimationFrame(() => {
    const iw = mapImg.naturalWidth;
    const ih = mapImg.naturalHeight;
    if (!iw || !ih) return;*/
      /*новая 2*/
  /* двойной rAF — гарантирует что браузер отрендерил картинку НЕ РАБОТАЕТ С OUTSIDE */
 /* requestAnimationFrame(() => requestAnimationFrame(() => {
    const iw = mapImg.naturalWidth;
    const ih = mapImg.naturalHeight;
    if (!iw || !ih) return;

    const scale = Math.max(
  0.5,
  Math.min(
    window.innerWidth / iw,
    window.innerHeight / ih
  ) * 1);*/
  
    /*const scale = Math.min(
      window.innerWidth  / iw,
      window.innerHeight / ih
    ) * 0.2;*/

  /*  pz.zoom(scale, { animate: false });
    pz.pan(
      (window.innerWidth  - iw * scale) / 2,
      (window.innerHeight - ih * scale) / 2,
      { animate: false }
    );
  }));
}*/

/* ── Panzoom новый  ── */
/*let pz = null;
*/
/* колесо — один раз */
/*mapEl.parentElement.addEventListener("wheel", e => {
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

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resetView();
    });
  });
}
*/

/* ── RESET VIEW ── */
/*function resetView() {
  if (!pz) return;

  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  if (!iw || !ih) return;

  const scale = Math.min(
    window.innerWidth / iw,
    window.innerHeight / ih
  );

  pz.zoom(scale, { animate: false });

  pz.pan(
    (window.innerWidth - iw * scale) / 2,
    (window.innerHeight - ih * scale) / 2,
    { animate: false }
  );
}*/
  
/* ── Panzoom ── */
let pz = null;

/* колесо — один раз */
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

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resetView();
    });
  });
}


/* ── RESET VIEW ── */
function resetView() {
  if (!pz) return;

  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  if (!iw || !ih) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const scale = Math.min(vw / iw, vh / ih);

  const x = Math.round((vw - iw * scale) / 2);
  const y = Math.round((vh - ih * scale) / 2);

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
/* ── Пересчёт позиции при изменении размера экрана (поворот, режим ПК) ── */
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
/* ── Firebase ── */
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
  toast("Нажмите на карту для добавления маркера");
}

function exitAddMode() {
  addMode    = false;
  pendingPos = null;
  addModeBtn.textContent = "+ Маркер";
  addModeBtn.classList.remove("btn-danger");
  addForm.style.display  = "none";
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
  addText.value = addImgUrl.value = addIcon.value = "";
  addType.value = "loot";
});

addConfirm.onclick = () => {
  if (!pendingPos) return;
  const text = addText.value.trim();
  if (!text) { toast("Введите описание", true); return; }
  push(currentRef, {
    x: pendingPos.x, y: pendingPos.y,
    text,
    type:    addType.value,
    imgUrl:  addImgUrl.value.trim()  || null,
    iconUrl: addIcon.value.trim()    || null,
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

  if (m.imgUrl) {
    div.innerHTML = `
      <div class="marker-photo"><img src="${esc(m.imgUrl)}" alt="" onerror="this.src='${fallback}'"></div>
      ${isMobile() ? "" : `<div class="marker-preview"><img src="${esc(m.imgUrl)}" alt=""></div>`}
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  } else if (m.iconUrl) {
    div.innerHTML = `
      <div class="marker-photo" style="border-color:var(--${m.type}-color,var(--accent))">
        <img src="${esc(m.iconUrl)}" alt="" onerror="this.src='${fallback}'">
      </div>
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  } else {
    div.innerHTML = `
      <div class="marker-icon ${m.type}"><span>${TYPE_EMOJI[m.type] || "📍"}</span></div>
      <div class="marker-tooltip">${esc(m.text)}</div>`;
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
  modalTitle.textContent   = TYPE_LABEL[m.type] || m.type;
  modalBadge.textContent   = TYPE_LABEL[m.type] || m.type;
  modalBadge.className     = `modal-type-badge badge-${m.type}`;
  modalDesc.textContent    = m.text;
  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;
  editBtn.style.display    = isAdmin ? "" : "none";
  delBtn.style.display     = isAdmin ? "" : "none";
  editForm.style.display   = "none";
  modal.classList.add("open");
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
  editText.value   = current.text    || "";
  editType.value   = current.type    || "loot";
  editImgUrl.value = current.imgUrl  || "";
  editIcon.value   = current.iconUrl || "";
  editForm.style.display = "flex";
  editBtn.style.display  = "none";
};

cancelEdit.onclick = () => {
  editForm.style.display = "none";
  editBtn.style.display  = isAdmin ? "" : "none";
};

saveBtn.onclick = () => {
  if (!current) return;
  const text = editText.value.trim();
  if (!text) { toast("Введите описание", true); return; }
  update(ref(db, `maps/${currentMap}/markers/${current.id}`), {
    x: current.x, y: current.y,
    text,
    type:    editType.value,
    imgUrl:  editImgUrl.value.trim()  || null,
    iconUrl: editIcon.value.trim()    || null,
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

/* ── Init ── */
switchMap("woods");

