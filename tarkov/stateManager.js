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

      mode: null,

      /* ─────────────────────
         MARKERS
      ───────────────────── */

      currentMarker: null,
      markers: {},

      /* ─────────────────────
         TIME SYSTEM
      ───────────────────── */

      time: 12,
      isNight: false,

      /* ─────────────────────
         FILTERS
      ───────────────────── */

      filter: "all",

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
    return { ...this.state };
  }

  /* ─────────────────────────
     SETTERS
  ───────────────────────── */

  set(key, value) {
    if (this.state[key] === value) {
      return;
    }

    this.state[key] = value;

    this.emit(key, value);
    this.emit("stateChange", this.getState());
  }

  patch(obj) {
    let changed = false;

    for (const key in obj) {
      if (this.state[key] === obj[key]) {
        continue;
      }

      this.state[key] = obj[key];

      this.emit(key, obj[key]);

      changed = true;
    }

    if (changed) {
      this.emit("stateChange", this.getState());
    }
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
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[STATE ERROR] ${event}`, err);
      }
    });
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

  setConnectMode(value) {
    this.set("connectMode", value);
  }

  setCurrentMarker(marker) {
    this.set("currentMarker", marker);
  }

  setMarkers(markers) {
    this.set("markers", markers);
  }

  setFilter(filter) {
    this.set("filter", filter);
  }

  setMode(mode) {
    this.set("mode", mode);
  }

  setTime(time) {
    this.patch({
      time,
      isNight: time >= 20 || time < 6
    });
  }

  setNight(isNight) {
    this.set("isNight", isNight);
  }

  setTool(tool) {
    this.set("selectedTool", tool);
  }

  resetModes() {
    this.patch({
      addMode: false,
      editMode: false,
      connectMode: false
    });
  }
}

/* singleton */

export const state = new StateManager();
