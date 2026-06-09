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

    // вернуть функцию отписки
    return () => this.off(event, callback);
  }

  /* ─────────────────────────
     UNSUBSCRIBE
  ───────────────────────── */

  off(event, callback) {
    this.events.get(event)?.delete(callback);

    if (this.events.get(event)?.size === 0) {
      this.events.delete(event);
    }
  }

  /* ─────────────────────────
     EMIT
  ───────────────────────── */

  emit(event, data) {
    this.events.get(event)?.forEach(cb => cb(data));
  }

  /* ─────────────────────────
     CLEAR (редко нужно)
  ───────────────────────── */

  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /* ─────────────────────────
     HELPERS (для архитектуры)
  ───────────────────────── */

  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };

    this.on(event, wrapper);
  }
}

/* singleton (ОДИН на всё приложение) */
export const eventBus = new EventBus();
