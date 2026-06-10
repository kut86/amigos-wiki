export class EventBus {
  constructor() {
    this.events = new Map();
  }

  /* ─────────────────────────
     SUBSCRIBE
  ───────────────────────── */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /* ─────────────────────────
     UNSUBSCRIBE
  ───────────────────────── */
  off(event, callback) {
    const set = this.events.get(event);
    if (!set) return;

    set.delete(callback);

    if (set.size === 0) {
      this.events.delete(event);
    }
  }

  /* ─────────────────────────
     EMIT (STABLE)
  ───────────────────────── */
  emit(event, data) {
    const set = this.events.get(event);
    if (!set) return;

    for (const cb of set) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus error] ${event}`, err);
      }
    }
  }

  /* ─────────────────────────
     CLEAR
  ───────────────────────── */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /* ─────────────────────────
     ONCE
  ───────────────────────── */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };

    this.on(event, wrapper);
  }
}

/* singleton */
export const eventBus = new EventBus();
