import { db, ref, onValue, set, update } from "./firebase.js";
import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

export class SyncEngine {
  constructor() {
    this.mapId = null;
    this.listeners = [];
    this.worldRef = null;
  }

  /* ─────────────────────────
     INIT WORLD
  ───────────────────────── */

  init(mapId) {
    this.mapId = mapId;

    state.setMap(mapId);

    this.worldRef = ref(db, `world/${mapId}`);

    this.bindFirebase();

    this.bindLocalEvents();
  }

  /* ─────────────────────────
     FIREBASE → LOCAL
  ───────────────────────── */

  bindFirebase() {
    if (!this.worldRef) return;

    onValue(this.worldRef, (snap) => {
      const data = snap.val();

      if (!data) return;

      // синхронизация карты
      if (data.mapId && data.mapId !== state.get("mapId")) {
        state.setMap(data.mapId);
        bus.emit("map:sync", data.mapId);
      }

      // синхронизация фильтра
      if (data.filter) {
        bus.emit("filter:sync", data.filter);
      }

      // синхронизация режима
      if (data.mode) {
        state.patch({ mode: data.mode });
      }

      // маркеры (если используешь глобально)
      if (data.markers) {
        bus.emit("markers:sync", data.markers);
      }
    });
  }

  /* ─────────────────────────
     LOCAL → FIREBASE
  ───────────────────────── */

  bindLocalEvents() {
    bus.on("map:change", (mapId) => {
      this.update({ mapId });
    });

    bus.on("filter:change", (filter) => {
      this.update({ filter });
    });

    bus.on("mode:change", (mode) => {
      this.update({ mode });
    });

    bus.on("markers:update", (markers) => {
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
