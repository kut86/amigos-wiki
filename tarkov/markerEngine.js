import {
  ref,
  push,
  onValue,
  update,
  remove
} from "firebase/database";

/* ─────────────────────────
   MARKER ENGINE (POLISHED)
───────────────────────── */

export class MarkerEngine {
  constructor(db, mapId) {
    this.db = db;
    this.mapId = mapId;

    this.currentRef = ref(db, `maps/${mapId}/markers`);

    this.markers = {};
    this.unsub = null;

    this.listeners = new Set();
  }

  /* ─────────────────────────
     SUBSCRIBE (REALTIME)
  ───────────────────────── */

  subscribe(callback) {
    // защита от двойной подписки
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }

    this.unsub = onValue(this.currentRef, (snap) => {
      const data = {};

      snap.forEach((child) => {
        data[child.key] = {
          id: child.key,
          ...child.val()
        };
      });

      this.markers = data;

      callback?.(data);
    });

    return this.unsub;
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
     NORMALIZE (единая структура)
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

    if (!isUpdate) return base;

    return {
      ...base,
      ...marker
    };
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

    const conditions = [...(m.conditions || []), condition];

    return this.update(id, { conditions });
  }

  setAction(id, action) {
    const m = this.markers[id];
    if (!m) return;

    const actions = [...(m.actions || []), action];

    return this.update(id, { actions });
  }

  /* ─────────────────────────
     SWITCH MAP (ВАЖНО)
  ───────────────────────── */

  switchMap(mapId) {
    if (this.mapId === mapId) return;

    this.mapId = mapId;

    this.currentRef = ref(
      this.db,
      `maps/${mapId}/markers`
    );

    // перезапуск подписки при смене карты
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
  }

  /* ─────────────────────────
     CLEANUP
  ───────────────────────── */

  destroy() {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }

    this.markers = {};
  }
}

/* ─────────────────────────
   USAGE
───────────────────────── */

export function createMarkerEngine(db, mapId) {
  return new MarkerEngine(db, mapId);
}
