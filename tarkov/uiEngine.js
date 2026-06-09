// uiEngine.js

/* ─────────────────────────────
   STATE
───────────────────────────── */

let modal = null;
let toastContainer = null;

/* ─────────────────────────────
   INIT UI ENGINE
───────────────────────────── */

export function initUIEngine() {
  modal = document.getElementById("modal");
  toastContainer = document.getElementById("toastContainer");

  return {
    openModal,
    closeModal,
    toast,
    bindModalClose
  };
}

/* ─────────────────────────────
   MODAL
───────────────────────────── */

export function openModal(data = {}) {
  if (!modal) return;

  const title = document.getElementById("modalTitle");
  const badge = document.getElementById("modalBadge");
  const desc  = document.getElementById("modalDesc");
  const photo = document.getElementById("modalPhoto");

  modal.classList.add("open");

  if (title) title.textContent = data.title || "Маркер";
  if (badge) badge.textContent = data.type || "";

  if (desc) desc.textContent = data.text || "";

  if (photo) {
    if (data.imgUrl) {
      photo.src = data.imgUrl;
      photo.style.display = "";
    } else {
      photo.style.display = "none";
    }
  }
}

/* ─────────────────────────────
   CLOSE MODAL
───────────────────────────── */

export function closeModal() {
  if (!modal) return;

  modal.classList.remove("open");

  const editForm = document.getElementById("editForm");
  if (editForm) editForm.style.display = "none";
}

/* ─────────────────────────────
   MODAL CLOSE EVENTS
───────────────────────────── */

export function bindModalClose() {
  const closeBtn = document.getElementById("modalClose");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

/* ─────────────────────────────
   TOAST SYSTEM
───────────────────────────── */

export function toast(message, isError = false) {
  if (!toastContainer) return;

  const el = document.createElement("div");

  el.className = "toast" + (isError ? " err" : "");
  el.textContent = message;

  toastContainer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

/* ─────────────────────────────
   FORM HELPERS
───────────────────────────── */

export function showEditForm(show = true) {
  const form = document.getElementById("editForm");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelEdit");

  if (!form) return;

  form.style.display = show ? "flex" : "none";

  if (saveBtn) saveBtn.style.display = show ? "" : "none";
  if (cancelBtn) cancelBtn.style.display = show ? "" : "none";
}
