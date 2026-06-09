import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

export class UIEngine {
  constructor() {
    /* MODAL */
    this.modal = document.getElementById("modal");
    this.modalTitle = document.getElementById("modalTitle");
    this.modalBadge = document.getElementById("modalBadge");
    this.modalPhoto = document.getElementById("modalPhoto");
    this.modalDesc = document.getElementById("modalDesc");

    this.editForm = document.getElementById("editForm");
    this.editBtn = document.getElementById("editBtn");
    this.delBtn = document.getElementById("delBtn");

    this.current = null;
  }

  /* ─────────────────────────
     INIT
  ───────────────────────── */

  init() {
    this._bindEvents();
    this._bindBus();
  }

  /* ─────────────────────────
     EVENTS
  ───────────────────────── */

  _bindEvents() {
    document.getElementById("modalClose")
      .addEventListener("click", () => this.closeModal());

    this.editBtn?.addEventListener("click", () => this.openEdit());

    this.delBtn?.addEventListener("click", () => {
      if (!this.current) return;

      bus.emit("marker:delete", this.current.id);
      this.closeModal();
    });

    document.getElementById("saveBtn")
      ?.addEventListener("click", () => this.saveEdit());
  }

  /* ─────────────────────────
     EVENT BUS
  ───────────────────────── */

  _bindBus() {
    bus.on("marker:open", (marker) => {
      this.openModal(marker);
    });

    bus.on("auth:update", (user) => {
      state.setUser(user, user?.isAdmin);
    });
  }

  /* ─────────────────────────
     MODAL
  ───────────────────────── */

  openModal(marker) {
    this.current = marker;
    state.setCurrentMarker(marker);

    this.modalTitle.textContent = marker.text || "Marker";
    this.modalDesc.textContent = marker.text || "";

    this.modalBadge.textContent = marker.type || "unknown";
    this.modalBadge.className = `modal-type-badge badge-${marker.type}`;

    if (marker.imgUrl) {
      this.modalPhoto.style.display = "";
      this.modalPhoto.src = marker.imgUrl;
    } else {
      this.modalPhoto.style.display = "none";
    }

    this.modal.classList.add("open");
  }

  closeModal() {
    this.modal.classList.remove("open");
    this.current = null;
    state.setCurrentMarker(null);
  }

  /* ─────────────────────────
     EDIT MODE (заготовка конструктора)
  ───────────────────────── */

  openEdit() {
    if (!this.current) return;

    this.editForm.style.display = "flex";
    this.editBtn.style.display = "none";

    document.getElementById("editText").value = this.current.text || "";
    document.getElementById("editType").value = this.current.type || "loot";
  }

  saveEdit() {
    if (!this.current) return;

    const updated = {
      text: document.getElementById("editText").value,
      type: document.getElementById("editType").value,
      imgUrl: document.getElementById("editImgUrl")?.value || null,
      iconUrl: document.getElementById("editIcon")?.value || null,
    };

    bus.emit("marker:update", {
      id: this.current.id,
      data: updated
    });

    this.closeModal();
  }
}

/* ─────────────────────────
   INIT HELPER
───────────────────────── */

export function initUIEngine() {
  const ui = new UIEngine();
  ui.init();
  return ui;
      }
