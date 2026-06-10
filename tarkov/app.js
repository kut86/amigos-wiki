import { onAuthChange, getUserRole, ensureUser } from "./firebase.js";
import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { syncEngine } from "./syncEngine.js";

/* ─────────────────────────
   PAGE DETECTION
───────────────────────── */

const isMapPage = !!document.getElementById("map");
const isWikiPage = !!document.getElementById("wiki");

/* ─────────────────────────
   BOOT FLAGS (ANTI DOUBLE INIT)
───────────────────────── */

let appStarted = false;

/* ─────────────────────────
   INIT STATE DEFAULTS
───────────────────────── */

state.patch({
  addMode: false,
  editMode: false,
  connectMode: false,
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

  if (appStarted) return;
  appStarted = true;

  console.log("[APP] user:", user.uid);

  /* ─────────────────────────
     USER INIT
  ───────────────────────── */

  await ensureUser(user);

  const role = await getUserRole(user.uid);

  localStorage.setItem("uid", user.uid);
  localStorage.setItem("role", role);

  state.setUser(user, role === "admin");

  /* ─────────────────────────
     START SYNC ENGINE
  ───────────────────────── */

  const mapId = state.get("mapId") || "woods";

  syncEngine.init(mapId);

  /* ─────────────────────────
     GLOBAL EVENT HOOKS
  ───────────────────────── */

  bus.on("map:change", (mapId) => {
    state.setMap(mapId);
  });

  bus.on("filter:change", (filter) => {
    state.setFilter(filter);
  });

  bus.on("mode:change", (mode) => {
    state.setMode(mode);
  });

  bus.on("markers:update", (markers) => {
    state.setMarkers(markers);
  });

  /* ─────────────────────────
     PAGE ROUTING
  ───────────────────────── */

  if (isMapPage) {
    startMapApp();
  }

  if (isWikiPage) {
    startWikiApp();
  }

  console.log("[APP] bootstrap complete");
});

/* ─────────────────────────
   MAP BOOT
───────────────────────── */

function startMapApp() {
  console.log("[APP] MAP MODE");

  import("./map.js").then((mod) => {
    mod?.initMapPage?.();
  });
}

/* ─────────────────────────
   WIKI BOOT
───────────────────────── */

function startWikiApp() {
  console.log("[APP] WIKI MODE");

  import("./wiki.js").then((mod) => {
    mod?.initWikiPage?.();
  });
}
