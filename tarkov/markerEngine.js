import { ref, push, onValue, update, remove } from "firebase/database";
import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   MARKER ENGINE (CLEAN VERSION)
───────────────────────── */

export class MarkerEngine {
  constructor(db, mapId) {
    this.db = db;
    this.mapId = mapId;

    this.currentRef = ref(db, `maps/${mapId}/markers`);

    this.markers = {};
    this.listeners = new Set();

    this.lastHash = null;
    this.initialized = false;
  }

  /* ─────────────────────────
     SUBSCRIBE (REALTIME)
  ───────────────────────── */

  subscribe(callback) {
    if (this.initialized) return;

    this.initialized = true;

    onValue(this.currentRef, (snap) => {
      const newMarkers = {};

      snap.forEach((i) => {
        newMarkers[i.key] = {
          id: i.key,
          ...i.val()
        };
      });

      const hash = this._hash(newMarkers);

      // защита от лишних обновлений
      if (hash === this.lastHash) return;

      this.lastHash = hash;
      this.markers = newMarkers;

      /* ───────── STATE SYNC ───────── */

      state.setMarkers(newMarkers);

      /* ───────── GLOBAL EVENT ───────── */

      bus.emit("markers:sync", newMarkers);

      /* ───────── LOCAL CALLBACK ───────── */

      callback?.(newMarkers);
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
    return update(
      ref(this.db, `maps/${this.mapId}/markers/${id}`),
      this.normalize(data, true)
    );
  }

  /* ─────────────────────────
     DELETE
  ───────────────────────── */

  delete(id) {
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

    if (isUpdate) {
      return {
        ...marker,
        ...base
      };
    }

    return base;
  }

  /* ─────────────────────────
     HELPERS
  ───────────────────────── */

  addField(id, key, value) {
    const marker = this.markers[id];
    if (!marker) return;

    const fields = {
      ...(marker.fields || {}),
      [key]: value
    };

    return this.update(id, { fields });
  }

  addLink(id, targetId, type = "generic") {
    const marker = this.markers[id];
    if (!marker) return;

    const links = [...(marker.links || [])];

    links.push({ targetId, type });

    return this.update(id, { links });
  }

  setCondition(id, condition) {
    const marker = this.markers[id];
    if (!marker) return;

    return this.update(id, {
      conditions: [
        ...(marker.conditions || []),
        condition
      ]
    });
  }

  setAction(id, action) {
    const marker = this.markers[id];
    if (!marker) return;

    return this.update(id, {
      actions: [
        ...(marker.actions || []),
        action
      ]
    });
  }

  /* ─────────────────────────
     SWITCH MAP
  ───────────────────────── */

  switchMap(mapId) {
    this.mapId = mapId;

    this.currentRef = ref(
      this.db,
      `maps/${mapId}/markers`
    );

    this.markers = {};
    this.lastHash = null;
    this.initialized = false;
  }

  /* ─────────────────────────
     HASH UTILITY
  ───────────────────────── */

  _hash(obj) {
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
  }
   }
