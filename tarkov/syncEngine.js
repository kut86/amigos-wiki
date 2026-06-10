import { db, ref, onValue, set, update } from "./firebase.js";
import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

export class SyncEngine {
  constructor() {
    this.mapId = null;
    this.worldRef = null;

    this.initialized = false;
    this.firebaseBound = false;
    this.eventsBound = false;

    this.lastMapId = null;
    this.lastFilter = null;
    this.lastMode = null;

    /* ─────────────────────────
       ANTI LOOP FLAG
    ───────────────────────── */
    this.isRemoteUpdate = false;
  }

  /* ─────────────────────────
     INIT WORLD
  ───────────────────────── */

  init(mapId) {
    if (this.initialized && this.mapId === mapId) return;

    this.initialized = true;
    this.mapId = mapId;

    state.setMap(mapId);

    this.worldRef = ref(db, `world/${mapId}`);

    this.bindFirebase();
    this.bindLocalEvents();

    console.log("[SYNC] initialized:", mapId);
  }

  /* ─────────────────────────
     FIREBASE → LOCAL
  ───────────────────────── */

  bindFirebase() {
    if (this.firebaseBound) return;
    if (!this.worldRef) return;

    this.firebaseBound = true;

    onValue(this.worldRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      this.isRemoteUpdate = true;

      /* MAP */
      if (
        data.mapId &&
        data.mapId !== this.lastMapId &&
        data.mapId !== state.get("mapId")
      ) {
        this.lastMapId = data.mapId;
        state.setMap(data.mapId);
        bus.emit("map:sync", data.mapId);
      }

      /* FILTER */
      if (data.filter && data.filter !== this.lastFilter) {
        this.lastFilter = data.filter;
        bus.emit("filter:sync", data.filter);
      }

      /* MODE */
      if (data.mode && data.mode !== this.lastMode) {
        this.lastMode = data.mode;
        state.patch({ mode: data.mode });
      }

      /* MARKERS */
      if (data.markers) {
        bus.emit("markers:sync", data.markers);
      }

      this.isRemoteUpdate = false;
    });
  }

  /* ─────────────────────────
     LOCAL → FIREBASE
  ───────────────────────── */

  bindLocalEvents() {
    if (this.eventsBound) return;

    this.eventsBound = true;

    bus.on("map:change", (mapId) => {
      if (this.isRemoteUpdate) return;
      if (mapId === this.lastMapId) return;

      this.lastMapId = mapId;
      this.update({ mapId });
    });

    bus.on("filter:change", (filter) => {
      if (this.isRemoteUpdate) return;
      if (filter === this.lastFilter) return;

      this.lastFilter = filter;
      this.update({ filter });
    });

    bus.on("mode:change", (mode) => {
      if (this.isRemoteUpdate) return;
      if (mode === this.lastMode) return;

      this.lastMode = mode;
      this.update({ mode });
    });

    bus.on("markers:update", (markers) => {
      if (this.isRemoteUpdate) return;
      this.update({ markers });
    });
  }

  /* ─────────────────────────
     UPDATE FIREBASE
  ───────────────────────── */

  update(data) {
    if (!this.worldRef) return;
    update(this.worldRef, data);
  }

  /* ─────────────────────────
     SET FULL STATE
  ───────────────────────── */

  setFullState(stateData) {
    if (!this.worldRef) return;
    set(this.worldRef, stateData);
  }
}

/* singleton */
export const syncEngine = new SyncEngine();
