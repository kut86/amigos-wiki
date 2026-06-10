import { onAuthChange, ensureUser, getUserRole } from "./firebase.js";
import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { syncEngine } from "./syncEngine.js";

/* ─────────────────────────
   PROJECT ISOLATION (ВАЖНО)
───────────────────────── */
const PROJECT_ID = "site1"; // ← меняешь если копируешь сайт

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
  currentMarker: null
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
    ───────────────────────── */

    const initialMap = state.get("mapId") || "woods";

    syncEngine.init(initialMap);

    /* ─────────────────────────
       ROUTING
    ───────────────────────── */

    if (isMapPage) {
      startMapApp();
    }

    if (isWikiPage) {
      startWikiApp();
    }

    console.log("[APP] bootstrap ready");
  } catch (err) {
    console.error("[APP] bootstrap error:", err);
  }
});

/* ─────────────────────────
   MAP APP BOOT
───────────────────────── */

function startMapApp() {
  console.log("[APP] MAP MODE");

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
   GLOBAL BUS DEBUG
───────────────────────── */

bus.on("map:change", (mapId) => {
  console.log("[APP] map changed:", mapId);
});

/* ─────────────────────────
   DEBUG
───────────────────────── */

console.log("[APP] bootstrap loaded");
console.log("[APP] PROJECT_ID =", PROJECT_ID);
