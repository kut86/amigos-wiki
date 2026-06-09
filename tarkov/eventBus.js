class EventBus {
  constructor() {
    this.events = {};
  }

  /* ───────────────
     SUBSCRIBE
  ─────────────── */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);
  }

  /* ───────────────
     UNSUBSCRIBE
  ─────────────── */
  off(event, callback) {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /* ───────────────
     EMIT
  ─────────────── */
  emit(event, data) {
    const listeners = this.events[event];
    if (!listeners) return;

    listeners.forEach(cb => cb(data));
  }

  /* ───────────────
     CLEAR EVENT
  ─────────────── */
  clear(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

/* singleton */
export const eventBus = new EventBus();
