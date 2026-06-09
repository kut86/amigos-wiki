export class StateManager {
  constructor() {
    this.state = {
      mapId: "woods",
      user: null,
      isAdmin: false,

      // режимы
      addMode: false,
      editMode: false,

      // выбранный маркер
      currentMarker: null,
    };

    this.listeners = new Map(); // eventName -> Set(callback)
  }

  /* ─────────────────────────
     GETTERS
  ───────────────────────── */

  get(key) {
    return this.state[key];
  }

  getState() {
    return this.state;
  }

  /* ─────────────────────────
     SETTERS
  ───────────────────────── */

  set(key, value) {
    this.state[key] = value;
    this.emit(key, value);
    this.emit("stateChange", this.state);
  }

  patch(obj) {
    Object.assign(this.state, obj);

    for (const key in obj) {
      this.emit(key, obj[key]);
    }

    this.emit("stateChange", this.state);
  }

  /* ─────────────────────────
     EVENTS
  ───────────────────────── */

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    // вернуть unsubscribe
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  /* ─────────────────────────
     HELPERS
  ───────────────────────── */

  setMap(mapId) {
    this.set("mapId", mapId);
  }

  setUser(user, isAdmin = false) {
    this.patch({
      user,
      isAdmin
    });
  }

  setAddMode(value) {
    this.set("addMode", value);
  }

  setEditMode(value) {
    this.set("editMode", value);
  }

  setCurrentMarker(marker) {
    this.set("currentMarker", marker);
  }
}

/* singleton (один на всё приложение) */
export const state = new StateManager();
