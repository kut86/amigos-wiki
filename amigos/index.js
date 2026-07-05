 
// ================================================
// БЛОК 1 — FIREBASE ИНИЦИАЛИЗАЦИЯ И AUTH
// ================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, onValue, set, push, remove, update }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// ── Конфиг ──
const firebaseConfig = {
  apiKey:            'AIzaSyDL_d6P_YxVwYF-o6JuRko4CqHT9cTMJ_E',
  authDomain:        'raiders-amigos.firebaseapp.com',
  projectId:         'raiders-amigos',
  storageBucket:     'raiders-amigos.firebasestorage.app',
  messagingSenderId: '786073478347',
  appId:             '1:786073478347:web:df434d6bcf1686d5dd674e',
  databaseURL:       'https://raiders-amigos-default-rtdb.firebaseio.com'
};

// ── Инициализация ──
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getDatabase(app);
const provider = new GoogleAuthProvider();

// ── UID администратора ──
const ADMIN_UID = 'FxumjgSPSzRSLqyeGriFkDute9C2';

// ── Состояние ──
let isAdmin   = false;
let currentUser = null;

// ── Определяем страницу ──
const IS_RAID = window.location.pathname.includes('raid');

// ── Функции раздела "рейд" — реально определяются ниже (только если IS_RAID),
//    но объявлены здесь через let, чтобы к ним можно было безопасно обращаться
//    (typeof-проверкой) из кода, который расположен выше их определения в файле ──
let populateTargetSelect, renderStructuresAdmin, renderRaidCalc, buildRaidCurrencySelect;

// ================================================
// AUTH — ВХОД / ВЫХОД
// ================================================

// Двойной клик по логотипу — открывает окно входа
let clickTimer = null;
document.getElementById('header-brand').addEventListener('click', () => {
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
    openModal('modal-auth');
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = null;
    }, 300);
  }
});

// Кнопка войти через Google
document.getElementById('btn-google-login').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
    closeModal('modal-auth');
  } catch (e) {
    toast('Ошибка входа: ' + e.message, 'error');
  }
});

// Кнопка выйти
document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (e) {
    toast('Ошибка выхода', 'error');
  }
});

// Следим за состоянием авторизации
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  isAdmin     = user ? user.uid === ADMIN_UID : false;
  updateAuthUI();
});

// ── Обновляем UI после входа/выхода ──
function updateAuthUI() {
  const badge   = document.getElementById('user-badge');
  const logoutBtn = document.getElementById('btn-logout');
  const adminPanel = document.getElementById('admin-panel');
  const colActions = document.getElementById('col-actions');

  if (isAdmin) {
    badge.textContent  = '👑 Админ';
    badge.className    = 'hbadge admin';
    logoutBtn.style.display  = '';
    if (adminPanel) adminPanel.classList.add('visible');
    if (colActions) colActions.style.display = '';
    toast('Добро пожаловать, администратор!', 'success');
  } else {
    badge.textContent  = currentUser ? '👤 ' + currentUser.displayName : '👁 Гость';
    badge.className    = 'hbadge';
    logoutBtn.style.display  = 'none';
    if (adminPanel) adminPanel.classList.remove('visible');
    if (colActions) colActions.style.display = 'none';
  }

  // Перерисовываем таблицу с учётом прав
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderCards === 'function') renderCards();
  if (typeof renderResourcesTable === 'function') renderResourcesTable();
  if (IS_RAID) {
    if (typeof renderStructuresAdmin === 'function') renderStructuresAdmin();
    if (typeof populateTargetSelect === 'function') populateTargetSelect();
    if (typeof renderRaidCalc === 'function') renderRaidCalc();
  }
}

// ================================================
// БЛОК 2 — БАЗА ДАННЫХ
// ================================================

// ── Локальное хранилище данных ──
const DB = {
  currencies:  {},  // { id: { name, symbol, color } }
  categories:  {},  // { id: { name, color, icon } }
  resources:   {},  // { id: { name, nameRu, image, category, stack, prices: { currencyId: цена ЗА ВЕСЬ СТАК } } }
  items:       {},  // { id: { name, nameRu, category, stack, type, craftYield, image, hidden, recipe, prices } }
  weapons:     {},  // { id: { name, image, note, dmg, recipe, batchQty } }
  structures:  {},  // { id: { name, image, hp, cat, note, dmgMod } }
  settings:    {},  // { index: { bgUrl, bgOpacity }, raid: { bgUrl, bgOpacity } } — фон отдельный на каждой странице
};

// ── Подписки на Firebase ──
function subscribeToDatabase() {

  // Валюты
  onValue(ref(db, 'currencies'), (snap) => {
    DB.currencies = snap.val() || {};
    onCurrenciesUpdate();
  });

  // Категории
  onValue(ref(db, 'categories'), (snap) => {
    DB.categories = snap.val() || {};
    onCategoriesUpdate();
  });

  // Ресурсы
  onValue(ref(db, 'resources'), (snap) => {
    DB.resources = snap.val() || {};
    onResourcesUpdate();
  });

  // Товары
  onValue(ref(db, 'items'), (snap) => {
    DB.items = snap.val() || {};
    onItemsUpdate();
  });

  // Структуры (используются на raid.html; на index.html нужны для списка "урон по структурам" в товаре)
  onValue(ref(db, 'structures'), (snap) => {
    DB.structures = snap.val() || {};
    onStructuresUpdate();
  });

  // Настройки
  onValue(ref(db, 'settings'), (snap) => {
    DB.settings = snap.val() || {};
    applySettings();
  });
}

// ── Запускаем подписки ──
subscribeToDatabase();

// ================================================
// ОБРАБОТЧИКИ ОБНОВЛЕНИЙ ДАННЫХ
// ================================================

function onCurrenciesUpdate() {
  buildCurrencyFilter();
  buildCurrencyPriceFields('item-currency-prices');
  buildCurrencyPriceFields('resource-currency-prices');
  updateStatsBar();
  if (!IS_RAID) renderTable();
  if (IS_RAID && typeof buildRaidCurrencySelect === 'function') {
    buildRaidCurrencySelect();
    if (typeof renderRaidCalc === 'function') renderRaidCalc();
  }
}

function onStructuresUpdate() {
  if (typeof populateTargetSelect   === 'function') populateTargetSelect();
  if (typeof renderStructuresAdmin  === 'function') renderStructuresAdmin();
  if (typeof renderRaidCalc         === 'function') renderRaidCalc();
  if (!IS_RAID && document.getElementById('modal-item')?.classList.contains('visible')) {
    renderItemDamageRows();
  }
}

function onCategoriesUpdate() {
  buildCategoryFilter();
  buildCategorySelect('item-category');
  buildCategorySelect('resource-category');
  updateStatsBar();
  if (!IS_RAID) renderTable();
}
function onResourcesUpdate() {
  if (!IS_RAID) renderTable();
  if (IS_RAID && typeof renderRaidCalc === 'function') renderRaidCalc();
  if (typeof renderResourcesTable === 'function') renderResourcesTable();
}

function onItemsUpdate() {
  if (!IS_RAID) {
    renderTable();
    renderCards();
    updateStatsBar();
    if (typeof renderResourcesTable === 'function') renderResourcesTable();
  } else {
    if (typeof renderRaidCalc === 'function') renderRaidCalc();
  }
}

// ================================================
// CRUD — ЗАПИСЬ В FIREBASE
// ================================================

// Сохранить любой объект по пути
async function saveToFirebase(path, data) {
  if (!isAdmin) { toast('Нет прав', 'error'); return false; }
  try {
    await set(ref(db, path), data);
    return true;
  } catch (e) {
    toast('Ошибка сохранения: ' + e.message, 'error');
    return false;
  }
}

// Добавить новый объект (auto id)
async function pushToFirebase(path, data) {
  if (!isAdmin) { toast('Нет прав', 'error'); return null; }
  try {
    const newRef = push(ref(db, path));
    await set(newRef, data);
    return newRef.key;
  } catch (e) {
    toast('Ошибка: ' + e.message, 'error');
    return null;
  }
}

// Обновить поля объекта
async function updateInFirebase(path, data) {
  if (!isAdmin) { toast('Нет прав', 'error'); return false; }
  try {
    await update(ref(db, path), data);
    return true;
  } catch (e) {
    toast('Ошибка: ' + e.message, 'error');
    return false;
  }
}

// Удалить объект
async function removeFromFirebase(path) {
  if (!isAdmin) { toast('Нет прав', 'error'); return false; }
  try {
    await remove(ref(db, path));
    return true;
  } catch (e) {
    toast('Ошибка: ' + e.message, 'error');
    return false;
  }
}

// ================================================
// ПРИМЕНЕНИЕ НАСТРОЕК
// ================================================

function applySettings() {
  // У каждой страницы свой фон: settings.index.{bgUrl,bgOpacity} и settings.raid.{...}
  const s = (IS_RAID ? DB.settings.raid : DB.settings.index) || {};

  // Фон сайта
  if (s.bgUrl) {
    const isVideo = s.bgUrl.match(/\.(mp4|webm)$/i);
    const isImage = s.bgUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || s.bgUrl.includes('gif');

    const bgVideo = document.getElementById('bg-video');
    const bgImage = document.getElementById('bg-image');
    const bgOverlay = document.getElementById('bg-overlay');

    if (isVideo) {
      document.getElementById('bg-video-src').src = s.bgUrl;
      bgVideo.load();
      bgVideo.style.opacity = s.bgOpacity || 0.15;
      bgVideo.classList.add('active');
      bgImage.classList.remove('active');
    } else {
      bgImage.src = s.bgUrl;
      bgImage.style.opacity = s.bgOpacity || 0.15;
      bgImage.classList.add('active');
      bgVideo.classList.remove('active');
    }
    bgOverlay.classList.add('active');
  } else {
    document.getElementById('bg-video').classList.remove('active');
    document.getElementById('bg-image').classList.remove('active');
    document.getElementById('bg-overlay').classList.remove('active');
  }

  // Заполняем поля в модалке фона
  const bgUrlInput = document.getElementById('bg-url');
  const bgOpacityInput = document.getElementById('bg-opacity');
  if (bgUrlInput) bgUrlInput.value = s.bgUrl || '';
  if (bgOpacityInput) bgOpacityInput.value = s.bgOpacity || 0.15;
}

// ================================================
// ТЕМА (тёмная / светлая)
// ================================================

// Загружаем тему из localStorage
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeBtn(savedTheme);

document.getElementById('btn-theme').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeBtn(next);
});

function updateThemeBtn(theme) {
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ================================================
// СТАТИСТИКА
// ================================================

function updateStatsBar() {
  const shown    = document.getElementById('stat-shown');
  const total    = document.getElementById('stat-total');
  const cats     = document.getElementById('stat-cats');
  const currs    = document.getElementById('stat-currencies');

  const itemCount = Object.keys(DB.items).length;
  const catCount  = Object.keys(DB.categories).length;
  const curCount  = Object.keys(DB.currencies).length;

  if (shown)  shown.textContent  = itemCount;
  if (total)  total.textContent  = itemCount;
  if (cats)   cats.textContent   = catCount;
  if (currs)  currs.textContent  = curCount;
}

// ================================================
// БЛОК 3 — РАСЧЁТ ЦЕН
// ================================================

// ── Получить цену товара в конкретной валюте ──
function calcItemPrice(itemId, currencyId) {
  const item = DB.items[itemId];
  if (!item) return null;

  // Если есть ручная цена — возвращаем её
  if (item.prices && item.prices[currencyId] !== undefined && item.prices[currencyId] !== '') {
    return parseFloat(item.prices[currencyId]);
  }

  
  // Если крафтовый — считаем по рецепту и делим на выход крафта
  if (item.type === 'craft' && item.recipe) {
    return calcCraftPrice(item.recipe, currencyId, 0, item.craftYield || 1);
  }

  return null;
}

// ── Расчёт цены крафта по рецепту ──
function calcCraftPrice(recipe, currencyId, depth = 0, yieldQty = 1) {
  if (depth > 8) return null;
  if (!recipe || Object.keys(recipe).length === 0) return null;

  let total = 0;

  for (const [resourceId, amount] of Object.entries(recipe)) {
    const resourcePrice = getResourcePrice(resourceId, currencyId, depth + 1);
    if (resourcePrice === null) return null;
    total += resourcePrice * amount;
  }

  const qty = parseFloat(yieldQty) || 1;
  // округляем до сотых, а не до целого — иначе дешёвые поштучные ресурсы (типа пороха) обнулятся в 0/1
  return Math.ceil((total / qty) * 100) / 100;
}

// ── Получить цену ресурса ──
function getResourcePrice(resourceId, currencyId, depth = 0) {
  const resource = DB.resources[resourceId];
  if (!resource) return null;

  // Цена в ресурсе хранится за ВЕСЬ СТАК — делим на размер стака, получаем цену за 1 единицу
  if (resource.prices && resource.prices[currencyId] !== undefined && resource.prices[currencyId] !== '') {
    const stackSize  = parseFloat(resource.stack) || 1;
    const stackPrice = parseFloat(resource.prices[currencyId]);
    return stackPrice / stackSize;
  }

  return null;
}

// ── Подробный расчёт ресурсов для крафта ──
function calcRecipeBreakdown(recipe, qty, currencyId) {
  if (!recipe) return [];
  const lines = [];

  for (const [resourceId, amount] of Object.entries(recipe)) {
    const resource  = DB.resources[resourceId];
    const unitPrice = getResourcePrice(resourceId, currencyId);
    const needAmt   = amount * qty;
    const needCost  = unitPrice !== null ? unitPrice * needAmt : null;

    lines.push({
      resourceId,
      name:     resource ? resource.name   : resourceId,
      nameRu:   resource ? resource.nameRu : '',
      image:    resource ? resource.image  : '',
      amount:   needAmt,
      unitPrice,
      totalCost: needCost
    });
  }

  return lines;
}

// ── Цвет цены ──
function getPriceColor(price) {
  if (price === null)    return 'var(--price-none)';
  if (price === 0)       return 'var(--price-free)';
  if (price < 100)       return 'var(--price-cheap)';
  if (price < 10000)     return 'var(--price-medium)';
  return 'var(--price-expensive)';
}

// ── Форматирование числа ──
function fmtNumber(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'М';
  if (n >= 1000)    return (n / 1000).toFixed(1)    + 'К';
  return n.toLocaleString();
}

// ── Форматирование стака ──
function fmtStack(n) {
  if (!n) return '1';
  if (n >= 1000000000) return '∞';
  if (n >= 1000000)    return (n / 1000000).toFixed(0) + 'М';
  if (n >= 1000)       return (n / 1000).toFixed(0)    + 'К';
  return n.toString();
}

// ── Получить активную валюту из фильтра ──
function getActiveCurrencies() {
  const active = [];
  document.querySelectorAll('.currency-btn.active').forEach(btn => {
    active.push(btn.dataset.currency);
  });
  // Если ничего не выбрано — показываем все
  if (active.length === 0) return Object.keys(DB.currencies);
  return active;
}

// ── Получить первую валюту ──
function getFirstCurrency() {
  const keys = Object.keys(DB.currencies);
  return keys.length > 0 ? keys[0] : null;
}

// ── Авто цена для превью в модалке ──
function updateAutoPricePreview(recipe) {
  const preview = document.getElementById('auto-price-preview');
  const value   = document.getElementById('auto-price-value');
  if (!preview || !value) return;

  if (!recipe || Object.keys(recipe).length === 0) {
    preview.style.display = 'none';
    return;
  }

  const currencyId = getFirstCurrency();
  if (!currencyId) {
    preview.style.display = 'none';
    return;
  }

  const yieldInput = document.getElementById('item-yield');
  const yieldQty    = yieldInput ? (parseFloat(yieldInput.value) || 1) : 1;

  const price    = calcCraftPrice(recipe, currencyId, 0, yieldQty);
  const currency = DB.currencies[currencyId];
  const symbol   = currency ? currency.symbol : '';

  if (price !== null) {
    value.textContent     = fmtNumber(price, symbol) + ' за 1 шт. (выход с крафта: ' + yieldQty + ')';
    preview.style.display = 'block';
  } else {
    value.textContent     = '— (не все цены ресурсов заданы)';
    preview.style.display = 'block';
  }
}

// ── Авто цена для оружия ──
function updateWeaponAutoPricePreview(recipe) {
  const preview = document.getElementById('weapon-auto-price');
  const value   = document.getElementById('weapon-auto-price-value');
  if (!preview || !value) return;

  if (!recipe || Object.keys(recipe).length === 0) {
    preview.style.display = 'none';
    return;
  }

  const currencyId = getFirstCurrency();
  if (!currencyId) {
    preview.style.display = 'none';
    return;
  }

  const price    = calcCraftPrice(recipe, currencyId);
  const currency = DB.currencies[currencyId];
  const symbol   = currency ? currency.symbol : '';

  if (price !== null) {
    value.textContent   = fmtNumber(price, symbol);
    preview.style.display = 'block';
  } else {
    value.textContent   = '— (не все цены ресурсов заданы)';
    preview.style.display = 'block';
  }
}

// ================================================
// БЛОК 4 — ФИЛЬТРЫ, ПОИСК, КАТЕГОРИИ, ВАЛЮТЫ
// ================================================



// ── Состояние фильтров ──
const filters = {
  search:     '',
  category:   'all',
  currencies: [],
  sortKey:    'name',
  sortDir:    1,
};

// ── Поиск ──
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    filters.search = searchInput.value.toLowerCase().trim();
    renderTable();
    renderCards();
    if (typeof renderResourcesTable === 'function') renderResourcesTable();
  });
}

// ── Переключатель вида (Таблица / Карточки) ──
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setView(btn.dataset.view);
  });
});

function setView(view) {
  const tableWrap = document.getElementById('table-wrap');
  const cardsGrid = document.getElementById('cards-grid');
  if (view === 'table') {
    if (tableWrap) tableWrap.style.display = '';
    if (cardsGrid) cardsGrid.classList.remove('visible');
  } else {
    if (tableWrap) tableWrap.style.display = 'none';
    if (cardsGrid) cardsGrid.classList.add('visible');
    renderCards();
  }
}

// На мобиле автоматически показываем карточки
if (window.innerWidth <= 700) {
  setView('cards');
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  const cardsBtn = document.querySelector('[data-view="cards"]');
  if (cardsBtn) cardsBtn.classList.add('active');
}

// ── Строим фильтры категорий (без кнопки "Все", с редактированием) ──
function buildCategoryFilter() {
  const container = document.getElementById('category-filters');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(DB.categories).forEach(([id, cat]) => {
    // Скрытые категории (гости не видят)
    if (cat.hidden && !isAdmin) return;

    const wrap = document.createElement('span');
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '2px';

    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (filters.category === id ? ' active' : '');
    btn.textContent = (cat.icon || '') + ' ' + cat.name;
    btn.style.borderColor = cat.color || '';
    if (filters.category === id) btn.style.background = cat.color || '';
    btn.addEventListener('click', () => {
      filters.category = (filters.category === id) ? 'all' : id;
      buildCategoryFilter();
      renderTable();
      renderCards();
      if (typeof renderResourcesTable === 'function') renderResourcesTable();
    });
    wrap.appendChild(btn);

    // Кнопка редактирования — только для админа
    if (isAdmin) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-action';
      editBtn.style.padding = '2px 5px';
      editBtn.style.fontSize = '10px';
      editBtn.textContent = '✏';
      editBtn.title = 'Редактировать категорию';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCategoryModal(id);
      });
      wrap.appendChild(editBtn);
    }

    container.appendChild(wrap);
  });

  // Кнопка "+ Категория" — только для админа
  if (isAdmin) {
    const addBtn = document.createElement('button');
    addBtn.className = 'cat-btn';
    addBtn.style.borderStyle = 'dashed';
    addBtn.textContent = '+ Категория';
    addBtn.addEventListener('click', () => openCategoryModal(null));
    container.appendChild(addBtn);
  }
}

// ── Строим фильтры валют (видно только админу, клик = редактировать) ──
function buildCurrencyFilter() {
  const container = document.getElementById('currency-filter');
  if (!container) return;
  container.innerHTML = '';

  // Гости вообще не видят этот блок
  if (!isAdmin) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  Object.entries(DB.currencies).forEach(([id, cur]) => {
    const btn = document.createElement('button');
    btn.className   = 'currency-btn';
    btn.textContent = cur.name;
    btn.style.color = cur.color || '';
    btn.title = 'Редактировать валюту';
    btn.addEventListener('click', () => {
      openCurrencyModal(id);
    });
    container.appendChild(btn);
  });

  // Кнопка добавить — дублирует "+ Валюта" в панели, но удобно прямо тут
  const addBtn = document.createElement('button');
  addBtn.className = 'currency-btn';
  addBtn.style.borderStyle = 'dashed';
  addBtn.textContent = '+ Валюта';
  addBtn.addEventListener('click', () => openCurrencyModal(null));
  container.appendChild(addBtn);
}

// ── Строим select категорий в форме товара ──
function buildCategorySelect(selectId = 'item-category') {
  const select = document.getElementById(selectId);
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">— Выбрать —</option>';

  Object.entries(DB.categories).forEach(([id, cat]) => {
    const opt = document.createElement('option');
    opt.value       = id;
    opt.textContent = (cat.icon || '') + ' ' + cat.name;
    select.appendChild(opt);
  });

  if (currentVal) select.value = currentVal;
}

// ── Строим поля цен по валютам в форме ──
function buildCurrencyPriceFields(containerId, existingPrices = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (Object.keys(DB.currencies).length === 0) {
    container.innerHTML = '<div style="color:var(--muted);font-size:12px;font-family:Share Tech Mono,monospace">Сначала создайте валюту</div>';
    return;
  }

  Object.entries(DB.currencies).forEach(([id, cur]) => {
    const row = document.createElement('div');
    row.className = 'currency-row';
    row.innerHTML = `
      <span class="currency-row-name" style="color:${cur.color || 'var(--blue)'}">
        ${cur.name}
      </span>
      <input
        class="currency-row-price"
        type="number"
        data-currency="${id}"
        placeholder="Цена"
        value="${existingPrices[id] !== undefined ? existingPrices[id] : ''}"
        min="0"
        step="0.01"
      >
    `;
    container.appendChild(row);
  });
}

// ── Читаем цены из полей формы ──
function readCurrencyPriceFields(containerId) {
  const prices = {};
  const container = document.getElementById(containerId);
  if (!container) return prices;

  container.querySelectorAll('[data-currency]').forEach(input => {
    const val = input.value.trim();
    if (val !== '') {
      prices[input.dataset.currency] = parseFloat(val);
    }
  });

  return prices;
}

// ── Сортировка таблицы ──
function setSortBy(key) {
  if (filters.sortKey === key) {
    filters.sortDir *= -1;
  } else {
    filters.sortKey = key;
    filters.sortDir = 1;
  }

  // Обновляем классы заголовков
  document.querySelectorAll('#items-table thead th').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === key) {
      th.classList.add(filters.sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
    }
  });

  renderTable();
}

// Вешаем клики на заголовки таблицы
document.querySelectorAll('#items-table thead th[data-sort]').forEach(th => {
  th.addEventListener('click', () => setSortBy(th.dataset.sort));
});

// ── Применяем фильтры к списку товаров ──
function applyFilters(items) {
  return items.filter(([id, item]) => {
    // Поиск
    if (filters.search) {
      const nameMatch   = (item.name   || '').toLowerCase().includes(filters.search);
      const nameRuMatch = (item.nameRu || '').toLowerCase().includes(filters.search);
      if (!nameMatch && !nameRuMatch) return false;
    }

    // Категория
    if (filters.category !== 'all' && item.category !== filters.category) return false;

    // Скрытые (гости не видят)
    if (item.hidden && !isAdmin) return false;

    // Товар в скрытой категории (гости не видят)
    const itemCat = DB.categories[item.category];
    if (itemCat?.hidden && !isAdmin) return false;

    return true;
  });
}

// ── Сортируем список товаров ──
function applySorting(items) {
  return [...items].sort(([aId, a], [bId, b]) => {
    let aVal, bVal;

    switch (filters.sortKey) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        return aVal.localeCompare(bVal) * filters.sortDir;

      case 'category':
        aVal = (DB.categories[a.category]?.name || a.category || '').toLowerCase();
        bVal = (DB.categories[b.category]?.name || b.category || '').toLowerCase();
        return aVal.localeCompare(bVal) * filters.sortDir;

      case 'stack':
        aVal = a.stack || 1;
        bVal = b.stack || 1;
        return (aVal - bVal) * filters.sortDir;

      case 'type':
        aVal = a.type || '';
        bVal = b.type || '';
        return aVal.localeCompare(bVal) * filters.sortDir;

      case 'price': {
        const currId = getFirstCurrency();
        aVal = currId ? (calcItemPrice(aId, currId) ?? -1) : -1;
        bVal = currId ? (calcItemPrice(bId, currId) ?? -1) : -1;
        return (aVal - bVal) * filters.sortDir;
      }

      default:
        return 0;
    }
  });
}
// ================================================
// БЛОК 5 — ТАБЛИЦА И КАРТОЧКИ ТОВАРОВ
// ================================================

// ── Рендер таблицы ──
function renderTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  // Получаем активные валюты
  const activeCurrencies = Object.keys(DB.currencies);

  // Обновляем заголовки цен
 // Обновляем заголовки цен
  const priceHeadersAnchor = document.getElementById('price-headers-anchor');
  if (priceHeadersAnchor) {
    const headerRow = priceHeadersAnchor.parentNode;

    // Убираем заголовки валют, сгенерированные на прошлом рендере
    headerRow.querySelectorAll('.price-header-th').forEach(el => el.remove());

    activeCurrencies.forEach(currId => {
      const cur = DB.currencies[currId];
      if (!cur) return;

      // Цена за 1 шт
      const th = document.createElement('th');
      th.className    = 'price-header-th';
      th.dataset.sort = 'price';
      th.style.color  = cur.color || '';
      th.innerHTML    = `За 1 шт<br><span style="font-size:10px;opacity:0.7"> ${cur.name}</span>`;
      th.addEventListener('click', () => setSortBy('price'));
      headerRow.insertBefore(th, priceHeadersAnchor);

      // Цена за стак
      const thStack = document.createElement('th');
      thStack.className   = 'price-header-th';
      thStack.style.color = cur.color || '';
      thStack.innerHTML   = `За стак<br><span style="font-size:10px;opacity:0.7">  ${cur.name}</span>`;
      headerRow.insertBefore(thStack, priceHeadersAnchor);
    });
  }

  // Фильтрация и сортировка
  let items = applyFilters(Object.entries(DB.items));
  items     = applySorting(items);

  // Обновляем статистику
  const statShown = document.getElementById('stat-shown');
  const statTotal = document.getElementById('stat-total');
  if (statShown) statShown.textContent = items.length;
  if (statTotal) statTotal.textContent = Object.keys(DB.items).length;

  // Нет результатов
  const noResults = document.getElementById('no-results');
  if (noResults) noResults.style.display = items.length ? 'none' : 'block';

  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  items.forEach(([id, item]) => {
    const tr = document.createElement('tr');
    if (item.hidden) tr.classList.add('item-hidden');

    // Клик — калькулятор (гость) или редактирование (админ)
    tr.addEventListener('click', (e) => {
      if (e.target.matches('button')) return;
      if (isAdmin) {
        openItemModal(id);
      } else {
        openCalcModal(id);
      }
    });

    // Категория
    const cat    = DB.categories[item.category] || {};
    const catTag = cat.name
      ? `<span class="tag" style="background:${cat.color}22;color:${cat.color};border:1px solid ${cat.color}44">${cat.icon || ''} ${cat.name}</span>`
      : '—';

    // Тип
    const typeTag = item.type === 'craft'
      ? '<span class="tag tag-craft">КРАФТ</span>'
      : '<span class="tag tag-loot">ЛУТ</span>';

    // Скрытый
    const hiddenTag = item.hidden
      ? '<span class="tag tag-hidden">СКРЫТ</span>'
      : '';

    // Цены по активным валютам (валюта без цены — скрываем полностью)
    let priceCells = '';
    activeCurrencies.forEach(currId => {
      const cur   = DB.currencies[currId];
      if (!cur) return;
      const price = calcItemPrice(id, currId);

      // Нет цены в этой валюте — не выводим ячейки вообще
      if (price === null) {
        priceCells += `<td></td><td></td>`;
        return;
      }

      const color = getPriceColor(price);
      const stack = item.stack || 1;
      const batchPrice = price * stack;

      priceCells += `
        <td>
          <div class="price-cell" style="color:${color}">
            ${fmtNumber(price, cur.symbol)}
          </div>
        </td>
        <td>
          <div class="price-cell" style="color:${color};font-size:11px">
            ${fmtNumber(batchPrice, cur.symbol)}
          </div>
        </td>`;
    });

    // Кнопки действий (только админ)
    // Кнопки действий (только админ)
    const actionCell = isAdmin ? `
      <td style="white-space:nowrap">
        <button class="btn-action" onclick="event.stopPropagation();openItemModal('${id}')" title="Редактировать">✏</button>
        <button class="btn-action danger" onclick="event.stopPropagation();deleteItem('${id}')" title="Удалить">✕</button>
      </td>` : '<td></td>';

    tr.innerHTML = `
      <td>
        <div class="td-name">${esc(item.name || '')}</div>
        ${item.nameRu
          ? `<div class="td-name-ru">${esc(item.nameRu)}</div>`
          : ''
        }
      </td>
      <td>${catTag}</td>
      <td><span class="stack-badge">×${fmtStack(item.stack || 1)}</span></td>
      <td>${typeTag} ${hiddenTag}</td>
      ${priceCells}
      ${actionCell}
    `;

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);

  // Таблица ресурсов всегда обновляется вместе с таблицей товаров
  if (typeof renderResourcesTable === 'function') renderResourcesTable();
}

// ── Рендер карточек ──
function renderCards() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  const activeCurrencies = Object.keys(DB.currencies);

  let items = applyFilters(Object.entries(DB.items));
  items     = applySorting(items);

  grid.innerHTML = '';
  const frag = document.createDocumentFragment();

  items.forEach(([id, item]) => {
    const cat   = DB.categories[item.category] || {};
    const card  = document.createElement('div');
    card.className = 'item-card' + (item.hidden ? ' hidden-item' : '');

    // Цветная полоска по категории
    if (cat.color) {
      card.style.setProperty('--cat-color', cat.color);
      card.style.borderTopColor = cat.color;
    }

    // Клик
    card.addEventListener('click', () => {
      if (isAdmin) openItemModal(id);
      else openCalcModal(id);
    });

    // Цены (валюта без цены — не показываем блок вообще)
    let pricesHtml = '';
    activeCurrencies.forEach(currId => {
      const cur   = DB.currencies[currId];
      if (!cur) return;
      const price = calcItemPrice(id, currId);

      if (price === null) return; // нет цены в этой валюте — пропускаем

      const color = getPriceColor(price);
      const stack = item.stack || 1;
      const batchPrice = price * stack;

      pricesHtml += `
        <div class="card-price-block">
          <div class="card-currency-label" style="color:${cur.color || ''}"> ${cur.name}</div>
          <div class="card-price-value" style="color:${color}">${fmtNumber(price, cur.symbol)}</div>
          <div class="card-price-stack">стак: ${fmtNumber(batchPrice, cur.symbol)}</div>
        </div>`;
    });
      
    // Кнопки
    const footerBtns = isAdmin
      ? `<div class="card-admin-btns">
           <button class="btn-card-edit" onclick="event.stopPropagation();openItemModal('${id}')">✏️ Редактировать</button>
           <button class="btn-card-delete" onclick="event.stopPropagation();deleteItem('${id}')">✕ Удалить</button>
         </div>`
      : `<button class="btn-card-calc" onclick="event.stopPropagation();openCalcModal('${id}')">🧮 Считать</button>`;

    // Фото товара
    const bgStyle = item.image
      ? `background-image:url('${item.image}')`
      : '';

    card.innerHTML = `
      <div class="card-bg" style="${bgStyle}"></div>
      <div class="card-content">
        <div class="card-top">
          <div>
            <div class="card-name">${esc(item.name || '')}</div>
            ${item.nameRu ? `<div class="card-name-ru">${esc(item.nameRu)}</div>` : ''}
          </div>
          <div class="card-badges">
            ${item.type === 'craft'
              ? '<span class="tag tag-craft">КРАФТ</span>'
              : '<span class="tag tag-loot">ЛУТ</span>'
            }
            ${item.hidden ? '<span class="tag tag-hidden">СКРЫТ</span>' : ''}
          </div>
        </div>
        <div class="card-prices">${pricesHtml || '<div style="color:var(--muted);font-size:11px">Нет валют</div>'}</div>
        <div class="card-footer">
          <span class="stack-badge">×${fmtStack(item.stack || 1)}</span>
          ${footerBtns}
        </div>
      </div>`;

    frag.appendChild(card);
  });

  grid.appendChild(frag);
}

// ── Удалить товар ──
async function deleteItem(id) {
  if (!isAdmin) return;
  if (!confirm('Удалить этот товар?')) return;
  const ok = await removeFromFirebase(`items/${id}`);
  if (ok) toast('Товар удалён', 'success');
}

// ── Экранирование HTML ──
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ================================================
// БЛОК 6 — МОДАЛЬНЫЕ ОКНА: ОТКРЫТИЕ/ЗАКРЫТИЕ + ТОВАР
// ================================================

// ── Универсальное открытие/закрытие модалок ──
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('visible');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('visible');
}

// Кнопки закрытия (крестик + кнопка "Отмена")
document.querySelectorAll('[data-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});

// Клик по затемнению — закрыть
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('visible');
  });
});

// ESC закрывает все модалки
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.visible').forEach(m => {
      m.classList.remove('visible');
    });
  }
});

// ================================================
// МОДАЛКА ТОВАРА — состояние
// ================================================

let editingItemId  = null;
let currentRecipe   = {}; // { resourceId: amount }
let currentItemDamage = {}; // { structureCat: dmgPerHit } — делает товар "оружием" для рейда

// ── Открыть модалку добавления товара ──
document.getElementById('btn-add-item')?.addEventListener('click', () => {
  openItemModal(null);
});

// ── Открыть модалку (создание или редактирование) ──
function openItemModal(itemId) {
  editingItemId = itemId;
  const item = itemId ? DB.items[itemId] : null;

  document.getElementById('item-name').value     = item?.name    || '';
  document.getElementById('item-name-ru').value  = item?.nameRu  || '';
  document.getElementById('item-stack').value    = item?.stack   || '';
  document.getElementById('item-image').value    = item?.image   || '';
  document.getElementById('item-type').value     = item?.type    || 'loot';
  document.getElementById('item-yield').value    = item?.craftYield || 1;
  document.getElementById('item-hidden').checked = !!item?.hidden;

  buildCategorySelect('item-category');
  document.getElementById('item-category').value = item?.category || '';

  currentRecipe = item?.recipe ? { ...item.recipe } : {};
  renderRecipeRows();
  toggleRecipeSection();

  buildCurrencyPriceFields('item-currency-prices', item?.prices || {});

  currentItemDamage = item?.damage ? { ...item.damage } : {};
  renderItemDamageRows();

  // Кнопка удаления
  const deleteBtn = document.getElementById('btn-item-delete');
  if (itemId) {
    deleteBtn.style.display = '';
    deleteBtn.onclick = () => { closeModal('modal-item'); deleteItem(itemId); };
  } else {
    deleteBtn.style.display = 'none';
  }

  openModal('modal-item');
}

// ── Тип товара меняется → показываем/скрываем рецепт ──
document.getElementById('item-type')?.addEventListener('change', toggleRecipeSection);

function toggleRecipeSection() {
  const type     = document.getElementById('item-type').value;
  const section  = document.getElementById('recipe-section');
  const yieldRow = document.getElementById('item-yield-row');
  if (section)  section.style.display  = type === 'craft' ? '' : 'none';
  if (yieldRow) yieldRow.style.display = type === 'craft' ? '' : 'none';
  updateAutoPricePreview(currentRecipe);
}
document.getElementById('item-yield')?.addEventListener('input', () => updateAutoPricePreview(currentRecipe));
// ── Рендер строк рецепта ──
function renderRecipeRows() {
  const container = document.getElementById('recipe-rows');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(currentRecipe).forEach(([resourceId, amount]) => {
    const resource = DB.resources[resourceId];
    const row = document.createElement('div');
    row.className = 'recipe-row';
    row.innerHTML = `
      <span class="recipe-row-name">${resource ? esc(resource.name) : resourceId}</span>
      <input type="number" class="recipe-row-amount" value="${amount}" min="0.01" step="0.01" data-resource="${resourceId}">
      <button class="recipe-row-delete" data-resource="${resourceId}">✕</button>
    `;
    container.appendChild(row);
  });

  // Изменение количества
  container.querySelectorAll('.recipe-row-amount').forEach(input => {
    input.addEventListener('input', () => {
      const resId = input.dataset.resource;
      const val   = parseFloat(input.value) || 0;
      currentRecipe[resId] = val;
      updateAutoPricePreview(currentRecipe);
    });
  });

  // Удаление строки
  container.querySelectorAll('.recipe-row-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      delete currentRecipe[btn.dataset.resource];
      renderRecipeRows();
      updateAutoPricePreview(currentRecipe);
    });
  });
}

// ── Урон по структурам (список берётся из уже созданных на raid.html структур; ключ — id каждой конкретной структуры, а не её тип) ──
function renderItemDamageRows() {
  const container = document.getElementById('item-damage-rows');
  if (!container) return;
  container.innerHTML = '';

  const entries = Object.entries(DB.structures).sort((a, b) => (a[1].name || '').localeCompare(b[1].name || ''));

  if (entries.length === 0) {
    container.innerHTML = '<div style="color:var(--muted);font-size:11px;font-family:Share Tech Mono,monospace">Пока нет ни одной структуры — создай их на странице «Калькулятор» (админ-панель → + Структура)</div>';
    return;
  }

  entries.forEach(([id, s]) => {
    const row = document.createElement('div');
    row.className = 'currency-row';
    row.innerHTML = `
      <span class="currency-row-name">${esc(s.name)}${s.cat ? ` <span class="tag" style="margin-left:6px">${esc(s.cat)}</span>` : ''}</span>
      <input class="currency-row-price" type="number" data-struct-id="${esc(id)}" placeholder="0" min="0" step="0.01" value="${currentItemDamage[id] || ''}">
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('[data-struct-id]').forEach(input => {
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      if (val > 0) currentItemDamage[input.dataset.structId] = val;
      else delete currentItemDamage[input.dataset.structId];
    });
  });
}

// ── Кнопка "+ Добавить ресурс" в рецепте ──
document.getElementById('btn-add-recipe-row')?.addEventListener('click', () => {
  const block = document.getElementById('recipe-resource-search');
  block.style.display = block.style.display === 'none' ? 'block' : 'none';
  document.getElementById('recipe-res-input').value = '';
  document.getElementById('recipe-res-results').classList.remove('visible');
  document.getElementById('recipe-res-input').focus();
});

// ── Поиск ресурса для рецепта ──
document.getElementById('recipe-res-input')?.addEventListener('input', (e) => {
  const query   = e.target.value.toLowerCase().trim();
  const results = document.getElementById('recipe-res-results');

  if (!query) {
    results.classList.remove('visible');
    return;
  }

  const matches = Object.entries(DB.resources).filter(([id, res]) =>
    (res.name   || '').toLowerCase().includes(query) ||
    (res.nameRu || '').toLowerCase().includes(query)
  ).slice(0, 10);

  results.innerHTML = '';
  matches.forEach(([id, res]) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <span>${esc(res.name)} ${res.nameRu ? '<span class="search-result-meta">/ ' + esc(res.nameRu) + '</span>' : ''}</span>
    `;
    item.addEventListener('click', () => {
      if (!currentRecipe[id]) currentRecipe[id] = 1;
      renderRecipeRows();
      updateAutoPricePreview(currentRecipe);
      document.getElementById('recipe-resource-search').style.display = 'none';
    });
    results.appendChild(item);
  });

  results.classList.toggle('visible', matches.length > 0);
});

// ── Сохранить товар ──
document.getElementById('btn-item-save')?.addEventListener('click', async () => {
  const name = document.getElementById('item-name').value.trim();
  if (!name) { toast('Введите название', 'error'); return; }

  const type = document.getElementById('item-type').value;

  const itemData = {
    name,
    nameRu:     document.getElementById('item-name-ru').value.trim(),
    category:   document.getElementById('item-category').value || null,
    stack:      parseInt(document.getElementById('item-stack').value) || 1,
    image:      document.getElementById('item-image').value.trim() || null,
    type,
    craftYield: type === 'craft' ? (parseInt(document.getElementById('item-yield').value) || 1) : 1,
    hidden:     document.getElementById('item-hidden').checked,
    recipe:     type === 'craft' ? currentRecipe : null,
    prices:     readCurrencyPriceFields('item-currency-prices'),
    damage:     Object.keys(currentItemDamage).length > 0 ? currentItemDamage : null,
  };

  let ok;
  if (editingItemId) {
    ok = await saveToFirebase(`items/${editingItemId}`, itemData);
  } else {
    const newId = await pushToFirebase('items', itemData);
    ok = !!newId;
  }

  if (ok) {
    closeModal('modal-item');
    toast('Товар сохранён', 'success');
  }
});

// ================================================
// БЛОК 7 — МОДАЛКИ: КАТЕГОРИЯ, РЕСУРС, ВАЛЮТА
// ================================================

// ════════════════════════════════════
// КАТЕГОРИЯ
// ════════════════════════════════════
let editingCategoryId = null;

document.getElementById('btn-add-category')?.addEventListener('click', () => {
  openCategoryModal(null);
});

function openCategoryModal(catId) {
  editingCategoryId = catId;
  const cat = catId ? DB.categories[catId] : null;

  document.getElementById('category-name').value    = cat?.name   || '';
  document.getElementById('category-color').value   = cat?.color  || '#e8a020';
  document.getElementById('category-icon').value    = cat?.icon   || '';
  document.getElementById('category-hidden').checked = !!cat?.hidden;

  const deleteBtn = document.getElementById('btn-cat-delete');
  if (catId) {
    deleteBtn.style.display = '';
    deleteBtn.onclick = () => {
      if (confirm('Удалить категорию? Товары в ней останутся без категории.')) {
        removeFromFirebase(`categories/${catId}`);
        closeModal('modal-category');
        toast('Категория удалена', 'success');
      }
    };
  } else {
    deleteBtn.style.display = 'none';
  }

  openModal('modal-category');
}

document.getElementById('btn-cat-save')?.addEventListener('click', async () => {
  const name = document.getElementById('category-name').value.trim();
  if (!name) { toast('Введите название категории', 'error'); return; }

  const data = {
    name,
    color:  document.getElementById('category-color').value.trim() || '#e8a020',
    icon:   document.getElementById('category-icon').value.trim()  || '',
    hidden: document.getElementById('category-hidden').checked
  };

  let ok;
  if (editingCategoryId) {
    ok = await saveToFirebase(`categories/${editingCategoryId}`, data);
  } else {
    ok = !!(await pushToFirebase('categories', data));
  }

  if (ok) {
    closeModal('modal-category');
    toast('Категория сохранена', 'success');
  }
});

// ════════════════════════════════════
// РЕСУРС
// ════════════════════════════════════
let editingResourceId = null;

document.getElementById('btn-add-resource')?.addEventListener('click', () => {
  openResourceModal(null);
});

function openResourceModal(resId) {
  editingResourceId = resId;
  const res = resId ? DB.resources[resId] : null;

  document.getElementById('resource-name').value    = res?.name    || '';
  document.getElementById('resource-name-ru').value = res?.nameRu  || '';
  document.getElementById('resource-image').value   = res?.image   || '';
  document.getElementById('resource-stack').value   = res?.stack   || '';

  buildCategorySelect('resource-category');
  document.getElementById('resource-category').value = res?.category || '';

  buildCurrencyPriceFields('resource-currency-prices', res?.prices || {});

  const deleteBtn = document.getElementById('btn-res-delete');
  if (resId) {
    deleteBtn.style.display = '';
    deleteBtn.onclick = () => {
      if (confirm('Удалить ресурс? Рецепты, использующие его, перестанут считаться.')) {
        removeFromFirebase(`resources/${resId}`);
        closeModal('modal-resource');
        toast('Ресурс удалён', 'success');
      }
    };
  } else {
    deleteBtn.style.display = 'none';
  }

  openModal('modal-resource');
}

document.getElementById('btn-res-save')?.addEventListener('click', async () => {
  const name = document.getElementById('resource-name').value.trim();
  if (!name) { toast('Введите название ресурса', 'error'); return; }

  const data = {
    name,
    nameRu:   document.getElementById('resource-name-ru').value.trim(),
    image:    document.getElementById('resource-image').value.trim() || null,
    category: document.getElementById('resource-category').value || null,
    stack:    parseInt(document.getElementById('resource-stack').value) || 1,
    prices:   readCurrencyPriceFields('resource-currency-prices'),
  };

  let ok;
  if (editingResourceId) {
    ok = await saveToFirebase(`resources/${editingResourceId}`, data);
  } else {
    ok = !!(await pushToFirebase('resources', data));
  }

  if (ok) {
    closeModal('modal-resource');
    toast('Ресурс сохранён', 'success');
  }
});

// ── Таблица ресурсов (видна только админу, с возможностью редактирования) ──
function renderResourcesTable() {
  const wrap  = document.getElementById('resources-admin-wrap');
  const tbody = document.getElementById('resources-table-body');
  if (!wrap || !tbody) return;

  if (!isAdmin) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';

  const currencyId = getFirstCurrency();
  const currency   = currencyId ? DB.currencies[currencyId] : null;

  tbody.innerHTML = '';

  let entries = Object.entries(DB.resources);

  // Фильтр по категории (те же кнопки, что фильтруют товары)
  if (filters.category !== 'all') {
    entries = entries.filter(([, res]) => res.category === filters.category);
  }

  // Фильтр по поиску (та же строка поиска, что для товаров)
  if (filters.search) {
    entries = entries.filter(([, res]) => {
      const nameMatch   = (res.name   || '').toLowerCase().includes(filters.search);
      const nameRuMatch = (res.nameRu || '').toLowerCase().includes(filters.search);
      return nameMatch || nameRuMatch;
    });
  }

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">Ресурсов не найдено</td></tr>`;
    return;
  }

  entries.forEach(([id, res]) => {
    const cat      = DB.categories[res.category] || {};
    const catLabel = cat.name ? `${cat.icon || ''} ${cat.name}` : '—';
    const stack    = res.stack || 1;

    const stackPriceRaw = currencyId && res.prices ? res.prices[currencyId] : undefined;
    const stackPrice     = (stackPriceRaw !== undefined && stackPriceRaw !== '')
      ? fmtNumber(parseFloat(stackPriceRaw), currency?.symbol || '')
      : '—';

    const unitPrice = currencyId ? getResourcePrice(id, currencyId) : null;
    const unitPriceLabel = unitPrice !== null ? fmtNumber(unitPrice, currency?.symbol || '') : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="td-name">${esc(res.name || '')}</div>
        ${res.nameRu ? `<div class="td-name-ru">${esc(res.nameRu)}</div>` : ''}
      </td>
      <td>${catLabel}</td>
      <td><span class="stack-badge">×${fmtStack(stack)}</span></td>
      <td>${stackPrice}</td>
      <td>${unitPriceLabel}</td>
      <td style="white-space:nowrap">
        <button class="btn-action" onclick="event.stopPropagation();openResourceModal('${id}')" title="Редактировать">✏</button>
        <button class="btn-action danger" onclick="event.stopPropagation();if(confirm('Удалить ресурс?')) removeFromFirebase('resources/${id}')" title="Удалить">✕</button>
      </td>
    `;
    tr.addEventListener('click', (e) => {
      if (e.target.matches('button')) return;
      openResourceModal(id);
    });
    tbody.appendChild(tr);
  });
}

// ════════════════════════════════════
// ВАЛЮТА
// ════════════════════════════════════
let editingCurrencyId = null;

document.getElementById('btn-add-currency')?.addEventListener('click', () => {
  openCurrencyModal(null);
});

function openCurrencyModal(curId) {
  editingCurrencyId = curId;
  const cur = curId ? DB.currencies[curId] : null;

  document.getElementById('currency-name').value   = cur?.name   || ''; 
  document.getElementById('currency-color').value  = cur?.color  || '#e8a020';

  const deleteBtn = document.getElementById('btn-cur-delete');
  if (curId) {
    deleteBtn.style.display = '';
    deleteBtn.onclick = () => {
      if (confirm('Удалить валюту? Цены товаров в этой валюте будут потеряны.')) {
        removeFromFirebase(`currencies/${curId}`);
        closeModal('modal-currency');
        toast('Валюта удалена', 'success');
      }
    };
  } else {
    deleteBtn.style.display = 'none';
  }

  openModal('modal-currency');
}

document.getElementById('btn-cur-save')?.addEventListener('click', async () => {
  const name = document.getElementById('currency-name').value.trim();
  if (!name) { toast('Введите название валюты', 'error'); return; }

  const data = {
    name,
    
    color:  document.getElementById('currency-color').value.trim()  || '#e8a020'
  };

  let ok;
  if (editingCurrencyId) {
    ok = await saveToFirebase(`currencies/${editingCurrencyId}`, data);
  } else {
    ok = !!(await pushToFirebase('currencies', data));
  }

  if (ok) {
    closeModal('modal-currency');
    toast('Валюта сохранена', 'success');
  }
});

// ════════════════════════════════════
// НАСТРОЙКИ ФОНА
// ════════════════════════════════════
document.getElementById('btn-bg-settings')?.addEventListener('click', () => {
  openModal('modal-bg');
});

document.getElementById('btn-bg-save')?.addEventListener('click', async () => {
  const url     = document.getElementById('bg-url').value.trim();
  const opacity = parseFloat(document.getElementById('bg-opacity').value) || 0.15;
  const path    = IS_RAID ? 'settings/raid' : 'settings/index';

  const ok = await saveToFirebase(path, { bgUrl: url || null, bgOpacity: opacity });
  if (ok) {
    closeModal('modal-bg');
    toast('Фон обновлён (только для этой страницы)', 'success');
  }
});

document.getElementById('btn-bg-clear')?.addEventListener('click', async () => {
  const path = IS_RAID ? 'settings/raid' : 'settings/index';
  const ok = await saveToFirebase(path, { bgUrl: null, bgOpacity: parseFloat(document.getElementById('bg-opacity').value) || 0.15 });
  if (ok) {
    document.getElementById('bg-url').value = '';
    closeModal('modal-bg');
    toast('Фон убран', 'success');
  }
});

// ================================================
// БЛОК 8 — КАЛЬКУЛЯТОР ТОВАРА
// ================================================

let calcItemId = null;

// ── Открыть калькулятор ──
function openCalcModal(itemId) {
  const item = DB.items[itemId];
  if (!item) return;

  calcItemId = itemId;

  document.getElementById('calc-title').textContent    = item.name;
  document.getElementById('calc-subtitle').textContent =
    (item.nameRu ? item.nameRu + ' · ' : '') +
    (DB.categories[item.category]?.name || '') +
    ' · стак ×' + fmtStack(item.stack || 1);

  document.getElementById('calc-qty').value = 1;

  openModal('modal-calc');
  updateCalcContent();

  setTimeout(() => document.getElementById('calc-qty').focus(), 100);
}

// ── Кнопки количества ──
document.querySelectorAll('#calc-qty-btns [data-qty]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('calc-qty').value = btn.dataset.qty;
    updateCalcContent();
  });
});

document.getElementById('calc-btn-stack')?.addEventListener('click', () => {
  const item = DB.items[calcItemId];
  if (item) {
    document.getElementById('calc-qty').value = item.stack || 1;
    updateCalcContent();
  }
});

document.getElementById('calc-qty')?.addEventListener('input', updateCalcContent);

// ── Обновить содержимое калькулятора ──
function updateCalcContent() {
  if (!calcItemId) return;
  const item = DB.items[calcItemId];
  if (!item) return;

  const qty     = Math.max(1, parseInt(document.getElementById('calc-qty').value) || 1);
  const content = document.getElementById('calc-content');

  const activeCurrencies = Object.keys(DB.currencies);
  if (activeCurrencies.length === 0) {
    content.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);font-family:Share Tech Mono,monospace">Валюты не созданы</div>`;
    return;
  }

  let html = '';

  // ── Ингредиенты (если крафт) ──
  if (item.type === 'craft' && item.recipe && Object.keys(item.recipe).length > 0) {
    const firstCurrency = activeCurrencies[0];
    const lines = calcRecipeBreakdown(item.recipe, qty, firstCurrency);

    html += `<div class="calc-section">
      <div class="calc-section-title">Необходимые ресурсы для ${qty} шт</div>`;

    lines.forEach(line => {
      html += `
        <div class="calc-ingredient-row">
          <div class="calc-ing-name">
            ${esc(line.name)}
            ${line.nameRu ? `<small>${esc(line.nameRu)}</small>` : ''}
          </div>
          <div class="calc-ing-qty">×${line.amount.toLocaleString()}</div>
          <div class="calc-ing-cost">${line.totalCost !== null ? fmtNumber(line.totalCost) : '—'}</div>
        </div>`;
    });

    html += `</div>`;
  } else if (item.type === 'craft') {
    html += `<div class="calc-section"><div style="color:var(--muted);font-family:Share Tech Mono,monospace;font-size:12px;padding:8px 0">⚙ Рецепт не задан</div></div>`;
  } else {
    html += `<div class="calc-section"><div style="color:var(--muted);font-family:Share Tech Mono,monospace;font-size:12px;padding:8px 0">📦 Некрафтовый предмет — покупка / лут</div></div>`;
  }

  // ── Итог по всем валютам ──
  html += `<div class="calc-total-box">
    <div class="calc-section-title" style="margin-bottom:10px">Итог</div>`;

  activeCurrencies.forEach(currId => {
    const cur       = DB.currencies[currId];
    const unitPrice = calcItemPrice(calcItemId, currId);
    const totalPrice = unitPrice !== null ? unitPrice * qty : null;

    html += `
      <div class="calc-total-row">
        <div>
          <div class="calc-total-currency"> ${cur.name}</div>
          <div class="calc-total-label">за 1 шт: ${fmtNumber(unitPrice, cur.symbol)}</div>
        </div>
        <div class="calc-total-val">
          ${fmtNumber(totalPrice, cur.symbol)}
        </div>
      </div>`;
  });

  // Слоты инвентаря
  const stack      = item.stack || 1;
  const fullStacks = Math.ceil(qty / stack);
  html += `
    <div class="calc-total-row">
      <span class="calc-total-label">Слотов в инвентаре:</span>
      <span style="font-family:Share Tech Mono,monospace;font-size:12px;color:var(--blue)">${fullStacks} слот${fullStacks === 1 ? '' : 'а/ов'}</span>
    </div>`;

  html += `</div>`;

  content.innerHTML = html;
}

// ================================================
// БЛОК 9 — РЕЙД: СТРУКТУРЫ (админка) И КАЛЬКУЛЯТОР
// ================================================

if (IS_RAID) {

// ── Группы структур для фильтра "Категория" (по ключевым словам в cat) ──
function structGroup(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('wall'))                 return 'wall';
  if (c.includes('door') || c.includes('garage')) return 'door';
  if (c.includes('window'))               return 'window';
  return 'deployable';
}

// ── Валюта, выбранная в калькуляторе рейда ──
function getRaidCurrency() {
  const sel = document.getElementById('raid-currency');
  if (sel && sel.value) return sel.value;
  return getFirstCurrency();
}

buildRaidCurrencySelect = function () {
  const sel = document.getElementById('raid-currency');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '';
  Object.entries(DB.currencies).forEach(([id, cur]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = cur.name;
    sel.appendChild(opt);
  });
  if (current && DB.currencies[current]) sel.value = current;
};

// ── Заполняем список структур (#target) с учётом категории и поиска ──
populateTargetSelect = function () {
  const catSel    = document.getElementById('category');
  const searchInp = document.getElementById('search');
  const targetSel = document.getElementById('target');
  if (!targetSel) return;

  const group  = catSel ? catSel.value : 'all';
  const query  = searchInp ? searchInp.value.toLowerCase().trim() : '';
  const prevVal = targetSel.value;

  const entries = Object.entries(DB.structures).filter(([id, s]) => {
    if (group !== 'all' && structGroup(s.cat) !== group) return false;
    if (query && !(s.name || '').toLowerCase().includes(query)) return false;
    return true;
  }).sort((a, b) => (a[1].name || '').localeCompare(b[1].name || ''));

  targetSel.innerHTML = '';
  if (entries.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— нет структур —';
    targetSel.appendChild(opt);
    return;
  }

  entries.forEach(([id, s]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = s.name + (s.hp ? ` (HP ${s.hp.toLocaleString()})` : '');
    targetSel.appendChild(opt);
  });

  if (prevVal && DB.structures[prevVal] && entries.some(([id]) => id === prevVal)) {
    targetSel.value = prevVal;
  }
};

document.getElementById('category')?.addEventListener('change', () => { populateTargetSelect(); renderRaidCalc(); });
document.getElementById('search')?.addEventListener('input', () => { populateTargetSelect(); renderRaidCalc(); });
document.getElementById('target')?.addEventListener('change', () => renderRaidCalc());
document.getElementById('raid-currency')?.addEventListener('change', () => renderRaidCalc());

// ── Кнопка копирования connect-кода ──
document.getElementById('copyBtn')?.addEventListener('click', () => {
  const code = document.getElementById('code')?.textContent.trim();
  if (!code) return;
  navigator.clipboard.writeText(code)
    .then(() => toast('Скопировано', 'success'))
    .catch(() => toast('Не удалось скопировать', 'error'));
});

// ── Главный расчёт: какое оружие/взрывчатка нужны для выбранной структуры ──
renderRaidCalc = function () {
  const results = document.getElementById('calc-results');
  if (!results) return;

  const targetSel = document.getElementById('target');
  const structId  = targetSel ? targetSel.value : '';
  const structure = structId ? DB.structures[structId] : null;

  if (!structure) {
    results.innerHTML = '<div class="calc-empty-hint">Выбери структуру и нажми «Вычислить»</div>';
    return;
  }

  const currencyId = getRaidCurrency();
  const currency   = currencyId ? DB.currencies[currencyId] : null;

  if (!currencyId) {
    results.innerHTML = '<div class="calc-empty-hint">Сначала создай хотя бы одну валюту в экономике</div>';
    return;
  }

  // Товары экономики, у которых заполнен урон именно по этой структуре
  const options = Object.entries(DB.items)
    .filter(([id, item]) => item.damage && parseFloat(item.damage[structId]) > 0)
    .map(([id, item]) => {
      const dmg   = parseFloat(item.damage[structId]);
      const qty   = Math.ceil((structure.hp || 0) / dmg);
      const price = calcItemPrice(id, currencyId);
      return {
        id, item, qty, dmg,
        unitPrice: price,
        totalPrice: price !== null ? price * qty : null,
      };
    })
    .sort((a, b) => {
      if (a.totalPrice === null) return 1;
      if (b.totalPrice === null) return -1;
      return a.totalPrice - b.totalPrice;
    });

  if (options.length === 0) {
    results.innerHTML = `<div class="calc-empty-hint">Нет ни одного товара с уроном по «${esc(structure.name)}» — заполни поле «Урон» у нужного оружия в экономике</div>`;
    return;
  }

  let html = `<div class="raid-result-header">🏗 ${esc(structure.name)} · HP ${(structure.hp||0).toLocaleString()}</div>`;

  options.forEach((opt, i) => {
    const isBest = i === 0 && opt.totalPrice !== null;
    const priceHtml = opt.totalPrice !== null
      ? fmtNumber(opt.totalPrice, currency.symbol) + ' ' + currency.name
      : '— (цена не задана)';

    let breakdownHtml = '';
    if (opt.item.type === 'craft' && opt.item.recipe && Object.keys(opt.item.recipe).length > 0) {
      const lines = calcRecipeBreakdown(opt.item.recipe, opt.qty, currencyId);
      breakdownHtml = `<div class="raid-result-breakdown">` + lines.map(l =>
        `<span>${esc(l.nameRu || l.name)} ×${l.amount.toLocaleString()}</span>`
      ).join(' · ') + `</div>`;
    }

    html += `
      <div class="raid-result-row${isBest ? ' best' : ''}">
        <div class="raid-result-main">
          ${opt.item.image ? `<img class="raid-result-img" src="${opt.item.image}" onerror="this.style.opacity=0.15" alt="">` : ''}
          <div>
            <div class="raid-result-name">${isBest ? '🏆 ' : ''}${esc(opt.item.nameRu || opt.item.name)}</div>
            <div class="raid-result-qty">×${opt.qty.toLocaleString()} шт. · урон за удар: ${opt.dmg.toLocaleString()}</div>
            ${breakdownHtml}
          </div>
        </div>
        <div class="raid-result-price">${priceHtml}</div>
      </div>`;
  });

  results.innerHTML = html;
};

// ================================================
// АДМИНКА: СТРУКТУРЫ
// ================================================

let editingStructureId = null;

document.getElementById('btn-add-structure')?.addEventListener('click', () => openStructureModal(null));

window.openStructureModal = function (structId) {
  editingStructureId = structId;
  const s = structId ? DB.structures[structId] : null;

  document.getElementById('modal-structure-title').textContent = structId ? 'Редактировать структуру' : '+ Структура';
  document.getElementById('structure-name').value  = s?.name  || '';
  document.getElementById('structure-image').value = s?.image || '';
  document.getElementById('structure-hp').value    = s?.hp    || '';
  document.getElementById('structure-cat').value   = s?.cat   || '';
  document.getElementById('structure-note').value  = s?.note  || '';

  const deleteBtn = document.getElementById('btn-structure-delete');
  if (structId) {
    deleteBtn.style.display = '';
    deleteBtn.onclick = async () => {
      if (confirm('Удалить структуру? Оружие, у которого был указан урон по ней, останется, но это значение перестанет использоваться.')) {
        const ok = await removeFromFirebase(`structures/${structId}`);
        if (ok) {
          closeModal('modal-structure');
          toast('Структура удалена', 'success');
        }
      }
    };
  } else {
    deleteBtn.style.display = 'none';
  }

  openModal('modal-structure');
};

document.getElementById('btn-structure-save')?.addEventListener('click', async () => {
  const name = document.getElementById('structure-name').value.trim();
  const cat  = document.getElementById('structure-cat').value.trim();
  if (!name) { toast('Введите название структуры', 'error'); return; }
  if (!cat)  { toast('Укажите тип структуры (напр. wood_wall)', 'error'); return; }

  const data = {
    name,
    image: document.getElementById('structure-image').value.trim() || null,
    hp:    parseFloat(document.getElementById('structure-hp').value) || 0,
    cat,
    note:  document.getElementById('structure-note').value.trim() || null,
  };

  let ok;
  if (editingStructureId) {
    ok = await saveToFirebase(`structures/${editingStructureId}`, data);
  } else {
    ok = !!(await pushToFirebase('structures', data));
  }

  if (ok) {
    closeModal('modal-structure');
    toast('Структура сохранена', 'success');
  }
});

// ── Список структур для админа ──
renderStructuresAdmin = function () {
  const wrap  = document.getElementById('structures-admin-wrap');
  const tbody = document.getElementById('structures-table-body');
  if (!wrap || !tbody) return;

  if (!isAdmin) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';

  tbody.innerHTML = '';
  const entries = Object.entries(DB.structures).sort((a, b) => (a[1].name || '').localeCompare(b[1].name || ''));

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Структур пока нет</td></tr>';
    return;
  }

  entries.forEach(([id, s]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(s.name)}</td>
      <td><span class="tag">${esc(s.cat || '')}</span></td>
      <td>${(s.hp || 0).toLocaleString()}</td>
      <td style="white-space:nowrap">
        <button class="btn-action" onclick="openStructureModal('${id}')" title="Редактировать">✏</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

// ── Первичная инициализация раздела рейда ──
buildRaidCurrencySelect();
populateTargetSelect();
renderRaidCalc();
renderStructuresAdmin();

} // конец if (IS_RAID)

// ================================================
// TOAST УВЕДОМЛЕНИЕ
// ================================================

let toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

// ================================================
// ИНИЦИАЛИЗАЦИЯ
// ================================================

buildCategoryFilter();
buildCurrencyFilter();
buildCategorySelect('item-category');
buildCategorySelect('resource-category');
updateStatsBar();

if (!IS_RAID) {
  renderTable();
  renderCards();
}

// ── Экспорт функций в window: без этого инлайновые onclick="..." в динамически
// созданном HTML не находят функции, т.к. это модуль (type="module"), а не обычный скрипт ──
window.openItemModal     = openItemModal;
window.deleteItem        = deleteItem;
window.openResourceModal = openResourceModal;
window.removeFromFirebase = removeFromFirebase;
window.openCalcModal     = openCalcModal;
