let currentMarker = null;
let isAdmin = false;

/* ───────── DOM ───────── */
const modal = document.getElementById("modal");

const modalTitle = document.getElementById("modalTitle");
const modalType = document.getElementById("modalType");
const modalImage = document.getElementById("modalImage");
const modalText = document.getElementById("modalText");

const modalClose = document.getElementById("modalClose");

/* admin panel */
const modalAdminPanel = document.getElementById("modalAdminPanel");

const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");

/* edit form */
const editForm = document.getElementById("editForm");

const editTitle = document.getElementById("editTitle");
const editType = document.getElementById("editType");
const editIconUrl = document.getElementById("editIconUrl");
const editDescription = document.getElementById("editDescription");

const saveBtn = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");

/* ───────── ADMIN STATE ───────── */
export function setAdmin(state) {
  isAdmin = !!state;
}

/* ───────── OPEN MODAL ───────── */
export function openModal(marker, handlers = {}) {
  currentMarker = marker;

  const { update, delete: onDelete } = handlers;

  /* ── VIEW ── */
  modalTitle.textContent = marker.title || "Без названия";
  modalType.textContent = marker.type || "";
  modalText.textContent = marker.description || "";

  if (marker.iconUrl) {
    modalImage.style.display = "block";
    modalImage.src = marker.iconUrl;
  } else {
    modalImage.style.display = "none";
  }

  modal.classList.add("open");

  /* ── ADMIN CHECK ── */
  if (!isAdmin) {
    modalAdminPanel.style.display = "none";
    return;
  }

  modalAdminPanel.style.display = "block";

  /* ───────── EDIT ───────── */
  editBtn.onclick = () => {
    editForm.style.display = "block";

    editTitle.value = marker.title || "";
    editType.value = marker.type || "loot";
    editIconUrl.value = marker.iconUrl || "";
    editDescription.value = marker.description || "";
  };

  cancelEdit.onclick = () => {
    editForm.style.display = "none";
  };

  /* ───────── SAVE ───────── */
  saveBtn.onclick = () => {
    if (!currentMarker) return;

    const updated = {
      ...currentMarker,
      title: editTitle.value.trim(),
      type: editType.value,
      iconUrl: editIconUrl.value.trim() || null,
      description: editDescription.value.trim()
    };

    if (typeof update === "function") {
      update(updated);
    }

    closeModal();
  };

  /* ───────── DELETE ───────── */
  deleteBtn.onclick = () => {
    if (!currentMarker) return;
    if (!confirm("Удалить маркер?")) return;

    if (typeof onDelete === "function") {
      onDelete(currentMarker.id);
    }

    closeModal();
  };
}

/* ───────── CLOSE MODAL ───────── */
function closeModal() {
  modal.classList.remove("open");
  editForm.style.display = "none";
  currentMarker = null;
}

/* ───────── EVENTS ───────── */
modalClose.onclick = closeModal;

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});
