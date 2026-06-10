let currentMarker = null;
let isAdmin = false;

/* ── DOM ── */
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalType = document.getElementById("modalType");
const modalImage = document.getElementById("modalImage");
const modalText = document.getElementById("modalText");

const modalClose = document.getElementById("modalClose");

const modalAdminPanel = document.getElementById("modalAdminPanel");

const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");

const editForm = document.getElementById("editForm");

const editTitle = document.getElementById("editTitle");
const editType = document.getElementById("editType");
const editIconUrl = document.getElementById("editIconUrl");
const editDescription = document.getElementById("editDescription");

const saveBtn = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");

/* ── INIT ADMIN ── */
export function setAdmin(state) {
  isAdmin = state;
}

/* ── OPEN MODAL (VIEW) ── */
export function openModal(marker, onEdit, onDelete, onSave) {
  currentMarker = marker;

  modalTitle.textContent = marker.title || "Без названия";
  modalType.textContent = marker.type || "";
  modalText.textContent = marker.description || "";

  if (marker.imgUrl) {
    modalImage.style.display = "block";
    modalImage.src = marker.imgUrl;
  } else {
    modalImage.style.display = "none";
  }

  modal.classList.add("open");

  /* ── ADMIN UI ── */
  if (isAdmin) {
    modalAdminPanel.style.display = "block";
  } else {
    modalAdminPanel.style.display = "none";
  }

  /* ── EDIT ── */
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

  saveBtn.onclick = () => {
    const updated = {
      ...marker,
      title: editTitle.value.trim(),
      type: editType.value,
      iconUrl: editIconUrl.value.trim() || null,
      description: editDescription.value.trim()
    };

    onSave(marker.id, updated);
    editForm.style.display = "none";
    modal.classList.remove("open");
  };

  deleteBtn.onclick = () => {
    if (!confirm("Удалить маркер?")) return;
    onDelete(marker.id);
    modal.classList.remove("open");
  };
}

/* ── CLOSE ── */
modalClose.onclick = () => {
  modal.classList.remove("open");
  editForm.style.display = "none";
};

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("open");
    editForm.style.display = "none";
  }
});
