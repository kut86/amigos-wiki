import { db, ref, push, onValue, update, remove } from "./firebase.js";
import { eventBus } from "./eventBus.js";

export function initMarkerEngine({
  db,
  mapId,
  container,
  filterFn = () => "all",
  isMobile = () => false
}) {
  const currentRef = ref(db, `maps/${mapId}/markers`);

  let markers = {};
  let unsubscribe = null;

  /* ───────────────
     SUBSCRIBE FIREBASE
  ─────────────── */
  function subscribe() {
    unsubscribe = onValue(currentRef, snap => {
      markers = {};

      snap.forEach(i => {
        markers[i.key] = i.val();
      });

      render();
    });
  }

  /* ───────────────
     RENDER MARKERS
  ─────────────── */
  function render() {
    container.querySelectorAll(".marker").forEach(m => m.remove());

    const filter = filterFn();

    Object.entries(markers).forEach(([id, m]) => {
      if (filter !== "all" && m.type !== filter) return;

      const div = document.createElement("div");
      div.className = "marker";
      div.dataset.id = id;

      div.style.left = m.x + "%";
      div.style.top = m.y + "%";

      if (isMobile()) div.classList.add("no-hover");

      if (m.imgUrl) {
        div.innerHTML = `
          <div class="marker-photo">
            <img src="${m.imgUrl}" draggable="false">
          </div>
          <div class="marker-tooltip">${m.text}</div>
        `;
      } else {
        div.innerHTML = `
          <div class="marker-icon">${m.text}</div>
        `;
      }

      /* ───────────────
         CLICK → EVENTBUS
      ─────────────── */
      div.addEventListener("click", (e) => {
        e.stopPropagation();

        eventBus.emit("marker:open", {
          id,
          marker: m
        });
      });

      container.appendChild(div);
    });
  }

  /* ───────────────
     PUBLIC API
  ─────────────── */
  function add(marker) {
    return push(currentRef, marker);
  }

  function updateMarker(id, data) {
    return update(ref(db, `maps/${mapId}/markers/${id}`), data);
  }

  function deleteMarker(id) {
    return remove(ref(db, `maps/${mapId}/markers/${id}`));
  }

  function destroy() {
    if (unsubscribe) unsubscribe();
    container.innerHTML = "";
  }

  /* init */
  subscribe();

  return {
    add,
    update: updateMarker,
    delete: deleteMarker,
    destroy
  };
       }
