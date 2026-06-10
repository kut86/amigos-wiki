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

    /* ─────────────────────────
       ANTI LOOP STATE
    ───────────────────────── */

    this.lastMapId = null;
    this.lastFilter = null;
    this.lastMode = null;
    this.lastMarkersHash = null;

    this.localUpdateLock = false;
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
    if (this.firebaseBound || !this.worldRef) return;

    this.firebaseBound = true;

    onValue(this.worldRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      this.localUpdateLock = true;

      /* ───────── MAP ───────── */

      if (
        data.mapId &&
        data.mapId !== this.lastMapId &&
        data.mapId !== state.get("mapId")
      ) {
        this.lastMapId = data.mapId;

        state.setMap(data.mapId);
        bus.emit("map:sync", data.mapId);
      }

      /* ───────── FILTER ───────── */

      if (
        data.filter &&
        data.filter !== this.lastFilter
      ) {
        this.lastFilter = data.filter;

        state.setFilter?.(data.filter);

        bus.emit("filter:sync", data.filter);
      }

      /* ───────── MODE ───────── */

      if (
        data.mode &&
        data.mode !== this.lastMode
      ) {
        this.lastMode = data.mode;

        state.setMode?.(data.mode);
      }

      /* ───────── MARKERS ───────── */

      if (data.markers) {
        const hash = this._hash(data.markers);

        if (hash !== this.lastMarkersHash) {
          this.lastMarkersHash = hash;

          state.setMarkers?.(data.markers);

          bus.emit("markers:sync", data.markers);
        }
      }

      this.localUpdateLock = false;
    });
  }

  /* ─────────────────────────
     LOCAL → FIREBASE
  ───────────────────────── */

  bindLocalEvents() {
    if (this.eventsBound) return;

    this.eventsBound = true;

    bus.on("map:change", (mapId) => {
      if (this.localUpdateLock) return;
      if (mapId === this.lastMapId) return;

      this.lastMapId = mapId;

      this._update({ mapId });
    });

    bus.on("filter:change", (filter) => {
      if (this.localUpdateLock) return;
      if (filter === this.lastFilter) return;

      this.lastFilter = filter;

      this._update({ filter });
    });

    bus.on("mode:change", (mode) => {
      if (this.localUpdateLock) return;
      if (mode === this.lastMode) return;

      this.lastMode = mode;

      this._update({ mode });
    });

    bus.on("markers:update", (markers) => {
      if (this.localUpdateLock) return;

      const hash = this._hash(markers);
      if (hash === this.lastMarkersHash) return;

      this.lastMarkersHash = hash;

      this._update({ markers });
    });
  }

  /* ─────────────────────────
     FIREBASE UPDATE
  ───────────────────────── */

  _update(data) {
    if (!this.worldRef) return;

    const clean = this._normalize(data);

    update(this.worldRef, clean);
  }

  /* ─────────────────────────
     FULL STATE SET
  ───────────────────────── */

  setFullState(stateData) {
    if (!this.worldRef) return;

    set(this.worldRef, this._normalize(stateData));
  }

  /* ─────────────────────────
     NORMALIZATION
  ───────────────────────── */

  _normalize(data) {
    return {
      mapId: data.mapId,
      filter: data.filter,
      mode: data.mode,
      markers: data.markers
    };
  }

  /* ─────────────────────────
     SIMPLE HASH (anti spam update)
  ───────────────────────── */

  _hash(obj) {
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
  }
}

/* singleton */

export const syncEngine = new SyncEngine();
