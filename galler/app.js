/* ============================================================
   TARKOV MAP — app.js (Panzoom + multi-map)
   ============================================================ */

import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push,
         onValue, update, remove }  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, GoogleAuthProvider,
         signInWithPopup, onAuthStateChanged,
         signOut }                  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

/* ── Список карт ── */
const MAPS = {
  woods: {
    label:  'Лес',
    imgUrl: 'https://i.imgur.com/IvAlf2V.jpeg'
  },
  customs: {
    label:  'Таможня',
    imgUrl: 'https://i.imgur.com/FKY4S2W.jpg'
  },
  interchange: {
    label:  'Развязка',
    imgUrl: 'https://gspics.org/images/2026/06/03/IDrVtJ.webp'
  }
};

/* ── DOM ── */
const mapWrapper  = document.getElementById("mapWrapper");
const mapEl       = document.getElementById("map");
const mapImg      = document.getElementById("mapImage");
const loginBtn    = document.getElementById("loginBtn");
const logoutBtn   = document.getElementById("logoutBtn");
const adminBadge  = document.getElementById("adminBadge");
const filterSel   = document.getElementById("filter");
const mapSelect   = document.getElementById("mapSelect");
const addModeBtn  = document.getElementById("addModeBtn");
const statusBar   = document.getElementById("statusBar");
const toastCont   = document.getElementById("toastContainer");

const modal       = document.getElementById("modal");
const modalTitle  = document.getElementById("modalTitle");
const modalBadge  = document.getElementById("modalBadge");
const modalPhoto  = document.getElementById("modalPhoto");
const modalDesc   = document.getElementById("modalDesc");
const modalCoords = document.getElementById("modalCoords");
const editBtn     = document.getElementById("editBtn");
const delBtn      = document.getElementById("delBtn");
const modalClose  = document.getElementById("modalClose");

const editForm    = document.getElementById("editForm");
const editText    = document.getElementById("editText");
const editType    = document.getElementById("editType");
const editImgUrl  = document.getElementById("editImgUrl");
const editIcon    = document.getElementById("editIcon");
const saveBtn     = document.getElementById("saveBtn");
const cancelEdit  = document.getElementById("cancelEdit");

const addForm     = document.getElementById("addForm");
const addText     = document.getElementById("addText");
const addType     = document.getElementById("addType");
const addImgUrl   = document.getElementById("addImgUrl");
const addIcon     = document.getElementById("addIcon");
const addConfirm  = document.getElementById("addConfirm");
const addCancel   = document.getElementById("addCancel");

/* ── State ── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";
let isAdmin    = false;
let current    = null;
let addMode    = false;
let pendingPos = null;
let allMarkers = {};
let pz         = null;
let currentMap = 'woods';
let currentRef = null;
let offFn      = null;

const isMobile = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const TYPE_EMOJI = { loot:'📦', boss:'💀', quest:'📋', custom:'⭐', bot:'🎯', exit:'🚪', structure:'🧩' };
const TYPE_LABEL = { loot:'Loot', boss:'Boss', quest:'Quest', custom:'Custom', bot:'Снайпер', exit:'Выход', structure:'Точка интереса' };

/* ── Toast ── */
function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className   = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Auth ── */
loginBtn.onclick  = () => signInWithPopup(auth, provider).catch(e => toast(e.message, true));
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  const loggedIn = !!user;
  isAdmin = loggedIn && user.uid === ADMIN_UID;

   loginBtn.style.display   = loggedIn ? 'none' : '';
  logoutBtn.style.display  = loggedIn ? '' : 'none';
  adminBadge.style.display = isAdmin  ? '' : 'none';
  addModeBtn.style.display = isAdmin  ? '' : 'none';

  if (!isAdmin) exitAddMode();
  toast(loggedIn ? `Вошёл как ${user.email}` : 'Выход');
});

/* ══════════════════════════════════════════
   PANZOOM
   ══════════════════════════════════════════ */
function initPanzoom() {
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  if (!iw || !ih) return;

  if (pz) {
    mapWrapper.removeEventListener('touchstart', pz.handleDown);
    mapWrapper.removeEventListener('touchmove',  pz.handleMove);
    mapWrapper.removeEventListener('touchend',   pz.handleUp);
    pz.destroy();
    pz = null;
  }

  mapEl.style.width     = iw + 'px';
  mapEl.style.height    = ih + 'px';
  mapEl.style.transform = 'matrix(1,0,0,1,0,0)';

  const startScale = Math.min(
    window.innerWidth  / iw,
    window.innerHeight / ih
  ) * 0.95; /* небольшой отступ чтобы карта не касалась краёв */

  const startX = (window.innerWidth  - iw * startScale) / 2;
  const startY = (window.innerHeight - ih * startScale) / 2;

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.02,
    canvas:   false,  /* false — иначе touch ломается на мобиле */
    contain:  false,
    panOnlyWhenZoomed: false,
    excludeClass: 'marker',
  });

  pz.zoom(startScale, { animate: false });
  pz.pan(startX, startY, { animate: false });

  /* touch вешаем на wrapper а не на mapEl */
  mapWrapper.addEventListener('touchstart', pz.handleDown,  { passive: false });
  mapWrapper.addEventListener('touchmove',  pz.handleMove,  { passive: false });
  mapWrapper.addEventListener('touchend',   pz.handleUp,    { passive: false });

  updateCursor();
  updateStatus();
}

let pzIniting = false;

mapImg.addEventListener('load', () => {
  if (pzIniting) return;
  pzIniting = true;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    initPanzoom();
    pzIniting = false;
  }));
});

if (mapImg.complete && mapImg.naturalWidth) {
  if (!pzIniting) {
    pzIniting = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      initPanzoom();
      pzIniting = false;
    }));
  }
}

mapWrapper.addEventListener('wheel', e => {
  e.preventDefault();
  if (pz) { pz.zoomWithWheel(e); updateStatus(); }
}, { passive: false });

mapEl.addEventListener('panzoomchange', updateStatus);

function updateCursor() {
  mapWrapper.style.cursor = addMode ? 'crosshair' : 'grab';
}

function updateStatus() {
  if (!pz) return;
  const s = pz.getScale();
  statusBar.textContent = `${MAPS[currentMap].label} · ZOOM ${(s * 100).toFixed(0)}% · ${Object.keys(allMarkers).length} маркеров`;
}

function zoomToCenter(factor) {
  if (!pz) return;
  const s    = pz.getScale();
  const newS = Math.min(8, Math.max(0.02, s * factor));
  const pan  = pz.getPan();
  const cx   = window.innerWidth  / 2;
  const cy   = window.innerHeight / 2;
  const mapX = (cx - pan.x) / s;
  const mapY = (cy - pan.y) / s;
  pz.zoom(newS, { animate: false });
  pz.pan(cx - mapX * newS, cy - mapY * newS, { animate: false });
  updateStatus();
}

document.getElementById('zoomIn').onclick    = () => zoomToCenter(1.3);
document.getElementById('zoomOut').onclick   = () => zoomToCenter(1 / 1.3);
document.getElementById('zoomReset').onclick = () => {
  if (!pz) return;
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  const s  = Math.min(window.innerWidth / iw, window.innerHeight / ih) * 0.95;
  const x  = (window.innerWidth  - iw * s) / 2;
  const y  = (window.innerHeight - ih * s) / 2;
  pz.zoom(s, { animate: false });
  pz.pan(x, y, { animate: false });
  updateStatus();
};

  
/* ══════════════════════════════════════════
   СМЕНА КАРТЫ
   ══════════════════════════════════════════ */
mapSelect.addEventListener('change', e => switchMap(e.target.value));

function switchMap(mapId) {
  if (!MAPS[mapId] || mapId === currentMap) return;

  exitAddMode();
  closeModal();

  if (offFn) { offFn(); offFn = null; }

  allMarkers = {};
  document.querySelectorAll('.marker').forEach(m => m.remove());

  currentMap = mapId;
  currentRef = ref(db, `maps/${mapId}/markers`);

  /* смена src — initPanzoom сработает через событие load */
  mapImg.src = MAPS[mapId].imgUrl;

  subscribeMarkers();
  toast(`Карта: ${MAPS[mapId].label}`);
}

/* ══════════════════════════════════════════
   FIREBASE
   ══════════════════════════════════════════ */
function subscribeMarkers() {
  if (!currentRef) currentRef = ref(db, `maps/${currentMap}/markers`);
  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => { allMarkers[i.key] = i.val(); });
    renderAllMarkers();
  });
}

currentRef = ref(db, `maps/${currentMap}/markers`);
subscribeMarkers();

/* ══════════════════════════════════════════
   ADD MODE
   ══════════════════════════════════════════ */
addModeBtn.onclick = () => addMode ? exitAddMode() : enterAddMode();

function enterAddMode() {
  if (!isAdmin) return;
  addMode = true;
  addModeBtn.textContent = '✕ Отмена';
  addModeBtn.classList.add('btn-danger');
  updateCursor();
  toast('Нажмите на карту для добавления маркера');
}

function exitAddMode() {
  addMode    = false;
  pendingPos = null;
  addModeBtn.textContent = '+ Маркер';
  addModeBtn.classList.remove('btn-danger');
  addForm.style.display  = 'none';
  updateCursor();
}

mapEl.addEventListener('click', e => {
  if (!addMode || !isAdmin) return;
  if (e.target.closest('.marker')) return;
  const rect = mapEl.getBoundingClientRect();
  pendingPos = {
    x: ((e.clientX - rect.left) / rect.width)  * 100,
    y: ((e.clientY - rect.top)  / rect.height) * 100
  };
  addForm.style.display = 'flex';
  addText.value = addImgUrl.value = addIcon.value = '';
  addType.value = 'loot';
});

addConfirm.onclick = () => {
  if (!pendingPos) return;
  const text = addText.value.trim();
  if (!text) { toast('Введите описание', true); return; }
  push(currentRef, {
    x: pendingPos.x, y: pendingPos.y,
    text,
    type:    addType.value,
    imgUrl:  addImgUrl.value.trim()  || null,
    iconUrl: addIcon.value.trim()    || null,
  }).then(() => { toast('Маркер добавлен'); exitAddMode(); })
    .catch(e => toast(e.message, true));
};

addCancel.onclick = exitAddMode;

/* ══════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════ */
function renderAllMarkers() {
  document.querySelectorAll('.marker').forEach(m => m.remove());
  const f = filterSel.value;
  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== 'all' && m.type !== f) return;
    createMarkerEl(id, m);
  });
  updateStatus();
}

filterSel.addEventListener('change', renderAllMarkers);

function createMarkerEl(id, m) {
  const div      = document.createElement('div');
  div.className  = 'marker';
  div.dataset.id = id;
  div.style.left = m.x + '%';
  div.style.top  = m.y + '%';

  if (isMobile()) div.classList.add('no-hover');

  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";

  if (m.imgUrl) {
    div.innerHTML = `
      <div class="marker-photo"><img src="${esc(m.imgUrl)}" alt="" onerror="this.src='${fallback}'"></div>
      ${isMobile() ? '' : `<div class="marker-preview"><img src="${esc(m.imgUrl)}" alt=""></div>`}
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  } else if (m.iconUrl) {
    div.innerHTML = `
      <div class="marker-photo" style="border-color:var(--${m.type}-color,var(--accent))">
        <img src="${esc(m.iconUrl)}" alt="" onerror="this.src='${fallback}'">
      </div>
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  } else {
    div.innerHTML = `
      <div class="marker-icon ${m.type}"><span>${TYPE_EMOJI[m.type] || '📍'}</span></div>
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  }

  div.addEventListener('click', e => {
    e.stopPropagation();
    if (addMode) return;
    openModal(id, m);
  });

  mapEl.appendChild(div);
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════ */
function openModal(id, m) {
  current = { id, ...m };
  modalTitle.textContent   = TYPE_LABEL[m.type] || m.type;
  modalBadge.textContent   = m.type;
  modalBadge.className     = `modal-type-badge badge-${m.type}`;
  modalPhoto.style.display = m.imgUrl ? '' : 'none';
  if (m.imgUrl) modalPhoto.src = m.imgUrl;
  modalDesc.textContent    = m.text;
  modalCoords.textContent  = `x:${m.x.toFixed(2)}% y:${m.y.toFixed(2)}%`;
  editBtn.style.display    = isAdmin ? '' : 'none';
  delBtn.style.display     = isAdmin ? '' : 'none';
  editForm.style.display   = 'none';
  modal.classList.add('open');
}

modalClose.onclick = closeModal;
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove('open');
  current = null;
  editForm.style.display = 'none';
}

editBtn.onclick = () => {
  if (!current) return;
  editText.value   = current.text    || '';
  editType.value   = current.type    || 'loot';
  editImgUrl.value = current.imgUrl  || '';
  editIcon.value   = current.iconUrl || '';
  editForm.style.display = 'flex';
  editBtn.style.display  = 'none';
};

cancelEdit.onclick = () => {
  editForm.style.display = 'none';
  editBtn.style.display  = isAdmin ? '' : 'none';
};

saveBtn.onclick = () => {
  if (!current) return;
  const text = editText.value.trim();
  if (!text) { toast('Введите описание', true); return; }
  update(ref(db, `maps/${currentMap}/markers/${current.id}`), {
    x: current.x, y: current.y,
    text,
    type:    editType.value,
    imgUrl:  editImgUrl.value.trim()  || null,
    iconUrl: editIcon.value.trim()    || null,
  }).then(() => { toast('Сохранено'); closeModal(); })
    .catch(e => toast(e.message, true));
};

delBtn.onclick = () => {
  if (!current) return;
  if (!confirm('Удалить маркер?')) return;
  remove(ref(db, `maps/${currentMap}/markers/${current.id}`))
    .then(() => { toast('Удалено'); closeModal(); })
    .catch(e => toast(e.message, true));
};
                                
