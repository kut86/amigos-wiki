/* app.js*/
import { onAuthChange, getUserRole, ensureUser } from "./firebase.js";
import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";
import { syncEngine } from "./syncEngine.js";

/* ─────────────────────────
   DETECT PAGE
───────────────────────── */

const isMapPage = !!document.getElementById("map");
const isWikiPage = !!document.getElementById("wiki");

/* ─────────────────────────
   INIT STATE (если нужно)
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

  console.log("[APP] user:", user.uid);

  /* ensure user exists in DB */
  await ensureUser(user);

  /* get role */
  const role = await getUserRole(user.uid);

  localStorage.setItem("uid", user.uid);
  localStorage.setItem("role", role);

  state.setUser(user, role === "admin");

  /* ─────────────────────────
     START WORLD SYNC
  ───────────────────────── */

  const mapId = state.get("mapId") || "woods";

  syncEngine.init(mapId);

  /* ─────────────────────────
     PAGE ROUTING LOGIC
  ───────────────────────── */

  if (isMapPage) {
    startMapApp();
  }

  if (isWikiPage) {
    startWikiApp();
  }
});

/* ─────────────────────────
   MAP BOOT
───────────────────────── */

function startMapApp() {
  console.log("[APP] MAP MODE");

  import("./map.js").then((mod) => {
    if (mod.initMapPage) {
      mod.initMapPage();
    }
  });
}

/* ─────────────────────────
   WIKI BOOT
───────────────────────── */

function startWikiApp() {
  console.log("[APP] WIKI MODE");

  import("./wiki.js").then((mod) => {
    if (mod.initWikiPage) {
      mod.initWikiPage();
    }
  });
}

/* ─────────────────────────
   GLOBAL EVENTS
───────────────────────── */

/* синхронизация карты */
bus.on("map:change", (mapId) => {
  state.setMap(mapId);
});

/* UI debug */
console.log("[APP] bootstrap loaded");
