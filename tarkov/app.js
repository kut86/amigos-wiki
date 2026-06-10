import { onAuthChange, ensureUser, getUserRole } from "./firebase.js";
import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { syncEngine } from "./syncEngine.js";

/* ─────────────────────────
   PAGE DETECTION
───────────────────────── */

const isMapPage = !!document.getElementById("map");
const isWikiPage = !!document.getElementById("wiki");

/* ─────────────────────────
   GUARD (ANTI DOUBLE INIT)
───────────────────────── */

let bootstrapped = false;
let syncStarted = false;

/* ─────────────────────────
   BASE STATE INIT
───────────────────────── */

if (!bootstrapped) {
  state.patch({
    addMode: false,
    editMode: false,
    currentMarker: null
  });

  bootstrapped = true;
}

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
       SYNC ENGINE (ONLY ONCE)
    ───────────────────────── */

    if (!syncStarted) {
      const initialMap = state.get("mapId") || "woods";
      syncEngine.init(initialMap);
      syncStarted = true;
    }

    /* ─────────────────────────
       ROUTING
    ───────────────────────── */

    if (isMapPage) startMapApp();
    if (isWikiPage) startWikiApp();

    console.log("[APP] bootstrap ready");
  } catch (err) {
    console.error("[APP] bootstrap error:", err);
  }
});

/* ─────────────────────────
   MAP APP
───────────────────────── */

function startMapApp() {
  console.log("[APP] MAP MODE");

  import("./map.js").then((mod) => {
    mod.initMapPage?.();
  });
}

/* ─────────────────────────
   WIKI APP
───────────────────────── */

function startWikiApp() {
  console.log("[APP] WIKI MODE");

  import("./wiki.js").then((mod) => {
    mod.initWikiPage?.();
  });
}

/* ─────────────────────────
   DEBUG EVENTS
───────────────────────── */

const offMapChange = bus.on("map:change", (mapId) => {
  console.log("[APP] map changed:", mapId);
});

/* optional cleanup hook (future-proof) */
window.__APP_OFF__ = () => {
  offMapChange?.();
};

console.log("[APP] bootstrap loaded");
