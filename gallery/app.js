/* ============================================================
   TARKOV MAP — app.js
   ============================================================ */

import { initializeApp }             from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push,
         onValue, update, remove }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, GoogleAuthProvider,
         signInWithPopup, onAuthStateChanged,
         signOut }                   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const markersRef = ref(db, "markers");

/* ── DOM ── */
const mapWrapper = document.getElementById("mapWrapper");
const mapEl      = document.getElementById("map");
const mapImg     = document.getElementById("mapImage");
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const adminBadge = document.getElementById("adminBadge");
const filterSel  = document.getElementById("filter");
const addModeBtn = document.getElementById("addModeBtn");
const statusBar  = document.getElementById("statusBar");
const toastCont  = document.getElementById("toastContainer");

const modal      = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBadge = document.getElementById("modalBadge");
const modalPhoto = document.getElementById("modalPhoto");
const modalDesc  = document.getElementById("modalDesc");
const modalCoords= document.getElementById("modalCoords");
const editBtn    = document.getElementById("editBtn");
const delBtn     = document.getElementById("delBtn");
const modalClose = document.getElementById("modalClose");

const editForm   = document.getElementById("editForm");
const editText   = document.getElementById("editText");
const editType   = document.getElementById("editType");
const editImgUrl = document.getElementById("editImgUrl");
const editIcon   = document.getElementById("editIcon");
const saveBtn    = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");

const addForm    = document.getElementById("addForm");
const addText    = document.getElementById("addText");
const addType    = document.getElementById("addType");
const addImgUrl  = document.getElementById("addImgUrl");
const addIcon    = document.getElementById("addIcon");
const addConfirm = document.getElementById("addConfirm");
const addCancel  = document.getElementById("addCancel");

/* ── State ── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";
let isAdmin    = false;
let current    = null;
let addMode    = false;
let pendingPos = null;
let allMarkers = {};

const TYPE_EMOJI = { loot:'📦', boss:'💀', quest:'📋', custom:'⭐', bot:'🎯', exit:'🚪', structure:'🧩' };
const TYPE_LABEL = { loot:'Loot', boss:'Boss', quest:'Quest', custom:'Custom', bot:'Снайпер', exit:'Выход', structure:'Точка интереса' };

/* ── Toast ── */
function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
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
  renderAllMarkers();
  toast(loggedIn ? `Вошёл как ${user.email}` : 'Выход');
});

/* ── MAP fit ── */
function fitMap() {
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  if (!iw || !ih) return;
  mapEl.style.width  = iw + 'px';
  mapEl.style.height = ih + 'px';
  const s = Math.min(window.innerWidth / iw, window.innerHeight / ih, 1);
  scale = s;
  pos.x = (window.innerWidth  - iw * s) / 2;
  pos.y = (window.innerHeight - ih * s) / 2;
  applyTransform();
}
mapImg.onload = fitMap;

let scale = 1;
let pos   = { x: 0, y: 0 };

function applyTransform() {
  mapEl.style.transform = `translate(${pos.x}px,${pos.y}px) scale(${scale})`;
  statusBar.textContent = `ZOOM ${(scale*100).toFixed(0)}% · ${Object.keys(allMarkers).length} маркеров`;
}

/* ══════════════════════════════════════════════
   DRAG + PINCH — единый touch/pointer обработчик
   Работает и на мобильных и на десктопе
   ══════════════════════════════════════════════ */
let touches    = {};   // активные касания { id: {x,y} }
let dragMoved  = false;

function midpoint(t) {
  const ids = Object.keys(t);
  if (ids.length === 1) return { x: t[ids[0]].x, y: t[ids[0]].y, dist: 0 };
  const a = t[ids[0]], b = t[ids[1]];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    dist: Math.hypot(b.x - a.x, b.y - a.y)
  };
}

let lastMid = null;

mapWrapper.addEventListener('touchstart', e => {
  e.preventDefault();
  dragMoved = false;
  for (const t of e.changedTouches) touches[t.identifier] = { x: t.clientX, y: t.clientY };
  lastMid = midpoint(touches);
}, { passive: false });

mapWrapper.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) touches[t.identifier] = { x: t.clientX, y: t.clientY };
  const mid = midpoint(touches);

  // pan
  pos.x += mid.x - lastMid.x;
  pos.y += mid.y - lastMid.y;

  // pinch zoom
  if (lastMid.dist && mid.dist) {
    const factor   = mid.dist / lastMid.dist;
    const newScale = Math.min(Math.max(scale * factor, 0.3), 5);
    pos.x = mid.x - (mid.x - pos.x) * (newScale / scale);
    pos.y = mid.y - (mid.y - pos.y) * (newScale / scale);
    scale = newScale;
  }

  dragMoved = true;
  lastMid = mid;
  applyTransform();
}, { passive: false });

mapWrapper.addEventListener('touchend', e => {
  for (const t of e.changedTouches) delete touches[t.identifier];
  lastMid = Object.keys(touches).length ? midpoint(touches) : null;
});

/* Desktop mouse drag */
let mouseDown = false;
let mouseStart = { x: 0, y: 0 };
let posStart   = { x: 0, y: 0 };

mapWrapper.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  mouseDown  = true;
  dragMoved  = false;
  mouseStart = { x: e.clientX, y: e.clientY };
  posStart   = { ...pos };
  mapWrapper.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  const dx = e.clientX - mouseStart.x;
  const dy = e.clientY - mouseStart.y;
  if (Math.hypot(dx, dy) > 4) dragMoved = true;
  pos.x = posStart.x + dx;
  pos.y = posStart.y + dy;
  applyTransform();
});

window.addEventListener('mouseup', () => {
  mouseDown = false;
  mapWrapper.style.cursor = '';
});

/* Desktop wheel zoom */
mapWrapper.addEventListener('wheel', e => {
  e.preventDefault();
  const delta    = e.deltaY < 0 ? 0.12 : -0.12;
  const newScale = Math.min(Math.max(scale + delta, 0.3), 5);
  pos.x = e.clientX - (e.clientX - pos.x) * (newScale / scale);
  pos.y = e.clientY - (e.clientY - pos.y) * (newScale / scale);
  scale = newScale;
  applyTransform();
}, { passive: false });

/* Zoom buttons */
document.getElementById('zoomIn').onclick    = () => zoomBy(0.25);
document.getElementById('zoomOut').onclick   = () => zoomBy(-0.25);
document.getElementById('zoomReset').onclick = fitMap;

function zoomBy(delta) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const newScale = Math.min(Math.max(scale + delta, 0.3), 5);
  pos.x = cx - (cx - pos.x) * (newScale / scale);
  pos.y = cy - (cy - pos.y) * (newScale / scale);
  scale = newScale;
  applyTransform();
}

/* ── ADD MODE ── */
addModeBtn.onclick = () => addMode ? exitAddMode() : enterAddMode();

function enterAddMode() {
  if (!isAdmin) return;
  addMode = true;
  mapWrapper.classList.add('adding');
  addModeBtn.textContent = '✕ Отмена';
  addModeBtn.classList.add('btn-danger');
  toast('Нажмите на карту для добавления маркера');
}

function exitAddMode() {
  addMode = false; pendingPos = null;
  mapWrapper.classList.remove('adding');
  addModeBtn.textContent = '+ Маркер';
  addModeBtn.classList.remove('btn-danger');
  addForm.style.display = 'none';
}

/* клик по карте для добавления маркера */
mapWrapper.addEventListener('click', e => {
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
  push(markersRef, {
    x: pendingPos.x, y: pendingPos.y,
    text, type: addType.value,
    imgUrl:  addImgUrl.value.trim() || null,
    iconUrl: addIcon.value.trim()   || null,
  }).then(() => { toast('Маркер добавлен'); exitAddMode(); })
    .catch(e => toast(e.message, true));
};
addCancel.onclick = exitAddMode;

/* ── RENDER ── */
onValue(markersRef, snap => {
  allMarkers = {};
  snap.forEach(i => { allMarkers[i.key] = i.val(); });
  renderAllMarkers();
});

function renderAllMarkers() {
  document.querySelectorAll('.marker').forEach(m => m.remove());
  const f = filterSel.value;
  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== 'all' && m.type !== f) return;
    createMarkerEl(id, m);
  });
  applyTransform();
}

filterSel.addEventListener('change', renderAllMarkers);

function createMarkerEl(id, m) {
  const div = document.createElement('div');
  div.className  = 'marker';
  div.dataset.id = id;
  div.style.left = m.x + '%';
  div.style.top  = m.y + '%';

  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";

  if (m.imgUrl) {
    div.innerHTML = `
      <div class="marker-photo"><img src="${esc(m.imgUrl)}" alt="" onerror="this.src='${fallback}'"></div>
      <div class="marker-preview"><img src="${esc(m.imgUrl)}" alt=""></div>
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

  /* клик на маркер — открыть модалку */
  div.addEventListener('click', e => {
    e.stopPropagation();
    if (addMode || dragMoved) return;
    openModal(id, m);
  });

  /* тач на маркер (мобильные) */
  div.addEventListener('touchend', e => {
    e.stopPropagation();
    if (addMode || dragMoved) return;
    openModal(id, m);
  });

  mapEl.appendChild(div);
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── MODAL ── */
function openModal(id, m) {
  current = { id, ...m };
  modalTitle.textContent = TYPE_LABEL[m.type] || m.type;
  modalBadge.textContent = m.type;
  modalBadge.className   = `modal-type-badge badge-${m.type}`;
  modalPhoto.style.display = m.imgUrl ? '' : 'none';
  if (m.imgUrl) modalPhoto.src = m.imgUrl;
  modalDesc.textContent    = m.text;
  modalCoords.textContent  = `x:${m.x.toFixed(2)}% y:${m.y.toFixed(2)}%`;
  editBtn.style.display    = isAdmin ? '' : 'none';
  delBtn.style.display     = isAdmin ? '' : 'none';
  editForm.style.display   = 'none';
  editBtn.style.display    = isAdmin ? '' : 'none';
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
  update(ref(db, 'markers/' + current.id), {
    x: current.x, y: current.y,
    text, type: editType.value,
    imgUrl:  editImgUrl.value.trim() || null,
    iconUrl: editIcon.value.trim()   || null,
  }).then(() => { toast('Сохранено'); closeModal(); })
    .catch(e => toast(e.message, true));
};

delBtn.onclick = () => {
  if (!current) return;
  if (!confirm('Удалить маркер?')) return;
  remove(ref(db, 'markers/' + current.id))
    .then(() => { toast('Удалено'); closeModal(); })
    .catch(e => toast(e.message, true));
};
