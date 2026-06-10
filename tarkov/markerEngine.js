import { ref, push, onValue, update, remove } from "firebase/database";

/* ─────────────────────────
   MARKER ENGINE (STABLE)
───────────────────────── */

export class MarkerEngine {
  constructor(db, mapId) {
    this.db = db;
    this.mapId = mapId;

    this.currentRef = ref(db, `maps/${mapId}/markers`);

    this.markers = {};

    this.unsubscribe = null;

    this.listeners = new Set();

    this.isSubscribed = false;
  }

  /* ─────────────────────────
     SUBSCRIBE (SAFE)
───────────────────────── */

  subscribe(callback) {
    // защита от дублей
    if (this.isSubscribed) {
      console.warn("[MarkerEngine] already subscribed");
      return this.unsubscribe;
    }

    this.isSubscribed = true;

    this.unsubscribe = onValue(this.currentRef, (snap) => {
      const next = {};

      snap.forEach((i) => {
        next[i.key] = {
          id: i.key,
          ...i.val()
        };
      });

      this.markers = next;

      callback(next);
    });

    return this.unsubscribe;
  }

  /* ─────────────────────────
     ADD
───────────────────────── */

  add(marker) {
    const normalized = this.normalize(marker);
    return push(this.currentRef, normalized);
  }

  /* ─────────────────────────
     UPDATE (SAFE MERGE)
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
     NORMALIZE (SAFE MERGE)
───────────────────────── */

  normalize(marker, isUpdate = false) {
    const base = {
      text: "",
      type: "loot",

      x: 0,
      y: 0,

      imgUrl: null,
      iconUrl: null,

      fields: {},
      links: [],
      meta: {},
      conditions: [],
      actions: []
    };

    if (!isUpdate) {
      return {
        ...base,
        ...marker
      };
    }

    // update → аккуратный merge
    return {
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
     SWITCH MAP (FIXED)
───────────────────────── */

  switchMap(mapId) {
    if (!mapId || this.mapId === mapId) return;

    // отписка от старого listener
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.isSubscribed = false;

    this.mapId = mapId;

    this.currentRef = ref(
      this.db,
      `maps/${mapId}/markers`
    );
  }
}

/* singleton export */
export const createMarkerEngine = (db, mapId) =>
  new MarkerEngine(db, mapId);
