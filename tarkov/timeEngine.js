import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   TIME ENGINE (DAY / NIGHT)
───────────────────────── */

export function initTimeEngine() {
  const mapTimes = {
    woods: 6,
    customs: 18,
    interchange: 12
  };

  let currentMap = state.get("mapId") || "woods";
  let time = mapTimes[currentMap] || 6;

  let speed = 1; // скорость времени

  /* ─────────────────────────
     UPDATE LOOP
  ───────────────────────── */

  function tick() {
    time += 0.01 * speed;

    if (time >= 24) time = 0;

    const isNight = time >= 20 || time < 6;

    bus.emit("time:update", {
      mapId: currentMap,
      time,
      isNight
    });

    requestAnimationFrame(tick);
  }

  /* ─────────────────────────
     SWITCH MAP TIME
  ───────────────────────── */

  function switchMap(mapId) {
    currentMap = mapId;
    time = mapTimes[mapId] || 6;
  }

  /* ─────────────────────────
     GETTERS
  ───────────────────────── */

  function getTime() {
    return time;
  }

  function getIsNight() {
    return time >= 20 || time < 6;
  }

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────── */

  tick();

  return {
    switchMap,
    getTime,
    getIsNight,
    setSpeed: (s) => (speed = s)
  };
}
