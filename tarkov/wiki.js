import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   WIKI ENGINE (PAGE CONTROLLER)
───────────────────────── */

let initialized = false;

/* ─────────────────────────
   INIT
───────────────────────── */

export function initWikiPage() {
  if (initialized) return;

  initialized = true;

  console.log("[WIKI] initialized");

  initState();
  bindEvents();
  hydrateUI();
}

/* ─────────────────────────
   STATE INIT
───────────────────────── */

function initState() {
  // wiki НЕ управляет картой или Firebase
  // только UI-режим

  state.patch({
    wikiMode: true
  });
}

/* ─────────────────────────
   UI BINDING
───────────────────────── */

function hydrateUI() {
  const search = document.getElementById("wikiSearch");
  const list = document.getElementById("wikiList");
  const content = document.getElementById("wikiContent");

  if (!search || !list || !content) {
    console.warn("[WIKI] missing DOM elements");
    return;
  }

  // базовый UX
  search.addEventListener("input", (e) => {
    bus.emit("wiki:search", e.target.value);
  });
}

/* ─────────────────────────
   EVENTS
───────────────────────── */

function bindEvents() {
  /* поиск */
  bus.on("wiki:search", (query) => {
    console.log("[WIKI] search:", query);

    // пока просто проброс — позже подключим wikiDB
    state.set("wikiQuery", query);
  });

  /* открытие статьи */
  bus.on("wiki:open", (article) => {
    openArticle(article);
  });
}

/* ─────────────────────────
   ARTICLE VIEW
───────────────────────── */

function openArticle(article) {
  const content = document.getElementById("wikiContent");
  if (!content) return;

  content.innerHTML = `
    <h2>${article.title || "Без названия"}</h2>
    <p>${article.text || "Нет данных"}</p>
  `;

  state.set("currentWikiArticle", article);

  bus.emit("wiki:opened", article);
}

/* ─────────────────────────
   CLEAN API (на будущее)
───────────────────────── */

export function searchWiki(query) {
  bus.emit("wiki:search", query);
}

export function openWikiArticle(article) {
  bus.emit("wiki:open", article);
}
