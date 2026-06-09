class StateManager {
  constructor() {
    this.state = {
      user: null,
      isAdmin: false,

      currentMap: "woods",

      mode: "view", // view | edit | add

      dayNight: {
        woods: "day",
        customs: "day",
        interchange: "day"
      }
    };

    this.listeners = {};
  }

  /* ───────────────
     GET STATE
  ─────────────── */

  get(key) {
    return this.state[key];
  }

  getAll() {
    return this.state;
  }

  getMap() {
    return this.state.currentMap;
  }

  isAdmin() {
    return this.state.isAdmin;
  }

  getUser() {
    return this.state.user;
  }

  getMode() {
    return this.state.mode;
  }

  getTimeState(mapId = this.state.currentMap) {
    return this.state.dayNight[mapId];
  }

  /* ───────────────
     SET STATE
  ─────────────── */

  set(key, value) {
    this.state[key] = value;
    this.emit(key, value);
  }

  setUser(user) {
    this.state.user = user;
    this.emit("user", user);
  }

  setAdmin(isAdmin) {
    this.state.isAdmin = isAdmin;
    this.emit("isAdmin", isAdmin);
  }

  setMap(mapId) {
    this.state.currentMap = mapId;
    this.emit("currentMap", mapId);
  }

  setMode(mode) {
    this.state.mode = mode;
    this.emit("mode", mode);
  }

  setTimeState(mapId, value) {
    this.state.dayNight[mapId] = value;
    this.emit("dayNight", { mapId, value });
  }

  /* ───────────────
     EVENTS
  ─────────────── */

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    const list = this.listeners[event];
    if (!list) return;

    list.forEach(cb => cb(data));
  }

  /* ───────────────
     HELPERS
  ─────────────── */

  toggleMode() {
    this.setMode(this.state.mode === "view" ? "edit" : "view");
  }

  toggleDayNight(mapId = this.state.currentMap) {
    const current = this.state.dayNight[mapId];
    const next = current === "day" ? "night" : "day";
    this.setTimeState(mapId, next);
  }

  reset() {
    this.state.mode = "view";
    this.emit("mode", "view");
  }
}

/* singleton */
export const stateManager = new StateManager();
