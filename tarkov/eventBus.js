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

    // unsubscribe функция
    return () => this.off(event, callback);
  }

  /* ─────────────────────────
     UNSUBSCRIBE
  ───────────────────────── */

  off(event, callback) {
    this.events.get(event)?.delete(callback);
  }

  /* ─────────────────────────
     EMIT
  ───────────────────────── */

  emit(event, payload) {
    this.events.get(event)?.forEach(cb => cb(payload));
  }

  /* ─────────────────────────
     ONCE (одноразовое событие)
  ───────────────────────── */

  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };

    this.on(event, wrapper);
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
}

/* singleton */
export const bus = new EventBus();
