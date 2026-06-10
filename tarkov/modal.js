let currentMarker = null;
let isAdmin = false;

/* ── DOM ── */
const modal = document.getElementById("modal");

const titleEl = document.getElementById("modalTitle");
const typeEl = document.getElementById("modalType");
const imageEl = document.getElementById("modalImage");
const textEl = document.getElementById("modalText");

const closeBtn = document.getElementById("modalClose");

const adminPanel = document.getElementById("modalAdminPanel");

const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");

const editForm = document.getElementById("editForm");

const editTitle = document.getElementById("editTitle");
const editType = document.getElementById("editType");
const editIcon = document.getElementById("editIconUrl");
const editDesc = document.getElementById("editDescription");

const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelEdit");

/* ── ADMIN STATE ── */
export function setAdmin(state) {
  isAdmin = state;
}

/* ── OPEN MODAL (VIEW MODE) ── */
export function openModal(marker, actions = {}) {
  currentMarker = marker;

  renderView(marker);

  modal.classList.add("open");

  adminPanel.style.display = isAdmin ? "block" : "none";

  bindActions(actions);
}

/* ── VIEW RENDER ── */
function renderView(marker) {
  titleEl.textContent = marker.title || "Без названия";
  typeEl.textContent = marker.type || "";
  textEl.textContent = marker.description || "";

  if (marker.imgUrl) {
    imageEl.style.display = "block";
    imageEl.src = marker.imgUrl;
  } else {
    imageEl.style.display = "none";
  }

  editForm.style.display = "none";
}

/* ── ACTIONS BIND ── */
function bindActions(actions) {
  const { update, delete: del } = actions;

  /* ── EDIT MODE ── */
  editBtn.onclick = () => {
    if (!isAdmin || !currentMarker) return;

    editForm.style.display = "block";

    editTitle.value = currentMarker.title || "";
    editType.value = currentMarker.type || "loot";
    editIcon.value = currentMarker.iconUrl || "";
    editDesc.value = currentMarker.description || "";
  };

  /* ── SAVE ── */
  saveBtn.onclick = () => {
    if (!isAdmin || !currentMarker) return;

    const updated = {
      title: editTitle.value.trim(),
      type: editType.value,
      iconUrl: editIcon.value.trim() || null,
      description: editDesc.value.trim()
    };

    if (typeof update === "function") {
      update(updated);
    }

    closeModal();
  };

  /* ── DELETE ── */
  deleteBtn.onclick = () => {
    if (!isAdmin || !currentMarker) return;

    if (!confirm("Удалить маркер?")) return;

    if (typeof del === "function") {
      del();
    }

    closeModal();
  };
}

/* ── CLOSE MODAL ── */
export function closeModal() {
  modal.classList.remove("open");
  editForm.style.display = "none";
  currentMarker = null;
}

/* ── UI CLOSE EVENTS ── */
closeBtn.onclick = closeModal;

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

/* ── CANCEL EDIT ── */
cancelBtn.onclick = () => {
  editForm.style.display = "none";
};
