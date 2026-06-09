export class StateManager {
  constructor() {
    this.state = {
      /* ─────────────────────
         APP CORE
      ───────────────────── */

      mapId: "woods",

      user: null,
      isAdmin: false,

      /* ─────────────────────
         MODES
      ───────────────────── */

      addMode: false,
      editMode: false,
      connectMode: false,

      /* ─────────────────────
         MARKERS
      ───────────────────── */

      currentMarker: null,

      /* ─────────────────────
         TIME SYSTEM
      ───────────────────── */

      time: 12,
      isNight: false,

      /* ─────────────────────
         UI STATE
      ───────────────────── */

      selectedTool: null
    };

    this.listeners = new Map();
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
    this.patch({ user, isAdmin });
  }

  setAddMode(value) {
    this.set("addMode", value);
  }

  setEditMode(value) {
    this.set("editMode", value);
  }

  setConnectMode(value) {
    this.set("connectMode", value);
  }

  setCurrentMarker(marker) {
    this.set("currentMarker", marker);
  }

  setTime(time) {
    this.set("time", time);
    this.set("isNight", time >= 20 || time < 6);
  }

  setNight(isNight) {
    this.set("isNight", isNight);
  }
}

/* singleton */
export const state = new StateManager();
