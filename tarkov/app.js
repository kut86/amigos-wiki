import { onAuthChange, ensureUser, getUserRole } from "./firebase.js";
import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { syncEngine } from "./syncEngine.js";

/* ─────────────────────────
   FIXED PAGE MAP ID
   (эта страница = woods.html)
───────────────────────── */

const PAGE_MAP_ID = "woods";

/* ─────────────────────────
   PAGE DETECTION
───────────────────────── */

const isMapPage = !!document.getElementById("map");
const isWikiPage = !!document.getElementById("wiki");

/* ─────────────────────────
   BASE STATE INIT
───────────────────────── */

state.patch({
  addMode: false,
  editMode: false,
  currentMarker: null,
  mapId: PAGE_MAP_ID // 🔥 фиксируем карту на уровне страницы
});

/* ─────────────────────────
   AUTH BOOTSTRAP
───────────────────────── */

onAuthChange(async (user) => {
  if (!user) {
    console.log("[APP] not logged in");
    return;
  }

  try {
    console.log("[APP] user:", user.uid);

    await ensureUser(user);

    const role = await getUserRole(user.uid);

    localStorage.setItem("uid", user.uid);
    localStorage.setItem("role", role);

    state.setUser(user, role === "admin");

    /* ─────────────────────────
       START SYNC ENGINE
       (ВСЕГДА woods для этой страницы)
    ───────────────────────── */

    syncEngine.init(PAGE_MAP_ID);

    /* ─────────────────────────
       ROUTING
    ───────────────────────── */

    if (isMapPage) {
      startMapApp();
    }

    if (isWikiPage) {
      startWikiApp();
    }

    console.log("[APP] bootstrap ready (woods.html)");
  } catch (err) {
    console.error("[APP] bootstrap error:", err);
  }
});

/* ─────────────────────────
   MAP APP BOOT
───────────────────────── */

function startMapApp() {
  console.log("[APP] MAP MODE: woods");

  import("./map.js").then((mod) => {
    mod.initMapPage?.();
  });
}

/* ─────────────────────────
   WIKI APP BOOT
───────────────────────── */

function startWikiApp() {
  console.log("[APP] WIKI MODE");

  import("./wiki.js").then((mod) => {
    mod.initWikiPage?.();
  });
}

/* ─────────────────────────
   DEBUG BUS
───────────────────────── */

bus.on("map:change", (mapId) => {
  console.log("[APP] map change ignored (fixed page):", mapId);
});

/* ─────────────────────────
   DEBUG
───────────────────────── */

console.log("[APP] woods app loaded");
