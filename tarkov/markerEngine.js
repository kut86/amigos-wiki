import { ref, push, onValue, update, remove } from "firebase/database";

/* ─────────────────────────
   MARKER ENGINE (CONSTRUCTOR VERSION)
───────────────────────── */

export class MarkerEngine {
  constructor(db, mapId) {
    this.db = db;
    this.mapId = mapId;

    this.currentRef = ref(db, `maps/${mapId}/markers`);
    this.markers = {};
    this.listeners = new Set();
  }

  /* ─────────────────────────
     SUBSCRIBE
  ───────────────────────── */

  subscribe(callback) {
    const unsub = onValue(this.currentRef, (snap) => {
      this.markers = {};

      snap.forEach((i) => {
        this.markers[i.key] = {
          id: i.key,
          ...i.val()
        };
      });

      callback(this.markers);
    });

    return unsub;
  }

  /* ─────────────────────────
     CREATE (CONSTRUCTOR MODE)
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
     NORMALIZER (СЕРДЦЕ КОНСТРУКТОРА)
  ───────────────────────── */

  normalize(marker, isUpdate = false) {
    const base = {
      text: marker.text || "",
      type: marker.type || "loot",

      x: marker.x ?? 0,
      y: marker.y ?? 0,

      imgUrl: marker.imgUrl || null,
      iconUrl: marker.iconUrl || null,

      /* ── NEW: CONSTRUCTOR FIELDS ── */

      fields: marker.fields || {}, 
      // гибкие кастом поля:
      // { key: value }

      links: marker.links || [],
      // цепочки: дверь → ключ → карта

      meta: marker.meta || {},
      // технические данные

      conditions: marker.conditions || [],
      // условия отображения

      actions: marker.actions || []
      // действия (например: перейти, открыть, подсветить)
    };

    /* при update не ломаем старые данные */
    if (isUpdate) {
      return {
        ...base,
        ...marker
      };
    }

    return base;
  }

  /* ─────────────────────────
     HELPERS (БУДУЩИЕ ФИЧИ)
  ───────────────────────── */

  addField(id, key, value) {
    const marker = this.markers[id];
    if (!marker) return;

    const fields = marker.fields || {};
    fields[key] = value;

    return this.update(id, { fields });
  }

  addLink(id, targetId, type = "generic") {
    const marker = this.markers[id];
    if (!marker) return;

    const links = marker.links || [];

    links.push({
      targetId,
      type
    });

    return this.update(id, { links });
  }

  setCondition(id, condition) {
    const marker = this.markers[id];
    if (!marker) return;

    const conditions = marker.conditions || [];
    conditions.push(condition);

    return this.update(id, { conditions });
  }

  setAction(id, action) {
    const marker = this.markers[id];
    if (!marker) return;

    const actions = marker.actions || [];
    actions.push(action);

    return this.update(id, { actions });
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
  }
      }
