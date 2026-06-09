import { eventBus } from "./eventBus.js";

export function initUIEngine() {
  const modal = document.getElementById("modal");
  const title = document.getElementById("modalTitle");
  const desc  = document.getElementById("modalDesc");
  const photo = document.getElementById("modalPhoto");

  const closeBtn = document.getElementById("modalClose");

  /* ─────────────────────────────
     OPEN MODAL (EVENT)
  ───────────────────────────── */
  function openModal(marker) {
    modal.classList.add("open");

    title.textContent = marker.type || "marker";
    desc.textContent  = marker.text || "";

    if (marker.imgUrl) {
      photo.style.display = "";
      photo.src = marker.imgUrl;
    } else {
      photo.style.display = "none";
    }
  }

  /* ─────────────────────────────
     CLOSE MODAL
  ───────────────────────────── */
  function closeModal() {
    modal.classList.remove("open");

    eventBus.emit("modal:closed", {});
  }

  /* ─────────────────────────────
     EVENTS
  ───────────────────────────── */

  eventBus.on("marker:open", ({ marker }) => {
    openModal(marker);
  });

  eventBus.on("marker:close", () => {
    closeModal();
  });

  /* ─────────────────────────────
     UI EVENTS (click)
  ───────────────────────────── */

  closeBtn?.addEventListener("click", () => {
    eventBus.emit("marker:close");
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      eventBus.emit("marker:close");
    }
  });

  /* ─────────────────────────────
     API (если понадобится напрямую)
  ───────────────────────────── */
  return {
    openModal,
    closeModal
  };
}
