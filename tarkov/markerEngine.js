import { ref, push, onValue, update, remove } from "firebase/database";
import { eventBus as bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   MARKER ENGINE (FINAL STABLE CORE)
───────────────────────── */

export class MarkerEngine {
  constructor(db, mapId) {
    this.db = db;
    this.mapId = mapId;

    this.currentRef = ref(db, `maps/${mapId}/markers`);

    this.markers = {};
    this.initialized = false;

    this.unsubscribe = null;

    this.isRemoteUpdate = false;
    this.lastEmitHash = null;
  }

  /* ───────────────────────── */
  init() {
    if (this.initialized) return;

    this.initialized = true;
    this.subscribe();

    console.log("[MARKER ENGINE] initialized");
  }

  /* ─────────────────────────
     FIREBASE SUBSCRIBE
  ───────────────────────── */

  subscribe() {
    if (this.unsubscribe) this.unsubscribe();

    this.unsubscribe = onValue(this.currentRef, (snap) => {
      const data = snap.val() || {};

      this.isRemoteUpdate = true;

      this.markers = data;

      state.setMarkers(data);

      // защита от лишних rerender циклов
      const hash = JSON.stringify(data);
      if (hash !== this.lastEmitHash) {
        this.lastEmitHash = hash;

        bus.emit("markers:update", data);
        bus.emit("graph:render");
      }

      this.isRemoteUpdate = false;
    });
  }

  /* ─────────────────────────
     CREATE
  ───────────────────────── */

  add(marker) {
    const normalized = this.normalize(marker);
    return push(this.currentRef, normalized);
  }

  /* ─────────────────────────
     UPDATE
  ───────────────────────── */

  update(id, data) {
    if (!id) return;

    return update(
      ref(this.db, `maps/${this.mapId}/markers/${id}`),
      this.normalize(data, true)
    );
  }

  /* ─────────────────────────
     DELETE
  ───────────────────────── */

  delete(id) {
    if (!id) return;

    return remove(
      ref(this.db, `maps/${this.mapId}/markers/${id}`)
    );
  }

  /* ─────────────────────────
     NORMALIZER
  ───────────────────────── */

  normalize(marker, isUpdate = false) {
    const base = {
      text: marker.text || "",
      type: marker.type || "loot",

      x: marker.x ?? 0,
      y: marker.y ?? 0,

      imgUrl: marker.imgUrl || null,
      iconUrl: marker.iconUrl || null,

      fields: marker.fields || {},
      links: marker.links || [],
      meta: marker.meta || {},
      conditions: marker.conditions || [],
      actions: marker.actions || []
    };

    return isUpdate ? { ...base, ...marker } : base;
  }

  /* ─────────────────────────
     HELPERS
  ───────────────────────── */

  addField(id, key, value) {
    const m = this.markers[id];
    if (!m) return;

    const fields = { ...(m.fields || {}) };
    fields[key] = value;

    return this.update(id, { fields });
  }

  addLink(id, targetId, type = "generic") {
    const m = this.markers[id];
    if (!m) return;

    const links = [...(m.links || [])];
    links.push({ targetId, type });

    return this.update(id, { links });
  }

  setCondition(id, condition) {
    const m = this.markers[id];
    if (!m) return;

    const conditions = [...(m.conditions || [])];
    conditions.push(condition);

    return this.update(id, { conditions });
  }

  setAction(id, action) {
    const m = this.markers[id];
    if (!m) return;

    const actions = [...(m.actions || [])];
    actions.push(action);

    return this.update(id, { actions });
  }

  /* ─────────────────────────
     SWITCH MAP
  ───────────────────────── */

  switchMap(mapId) {
    if (!mapId || this.mapId === mapId) return;

    this.mapId = mapId;

    this.currentRef = ref(
      this.db,
      `maps/${mapId}/markers`
    );

    this.subscribe();
  }

  /* ───────────────────────── */
  destroy() {
    if (this.unsubscribe) this.unsubscribe();

    this.initialized = false;
    this.markers = {};
  }
}

/* ─────────────────────────
   FACTORY
───────────────────────── */

export function createMarkerEngine(db, mapId) {
  const engine = new MarkerEngine(db, mapId);
  engine.init();
  return engine;
   }
