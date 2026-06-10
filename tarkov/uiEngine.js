import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   UI ENGINE (FEATURE-LEVEL)
───────────────────────── */

export function initUIEngine() {
  /* ─────────────────────────
     DOM
  ───────────────────────── */

  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBadge = document.getElementById("modalBadge");
  const modalDesc = document.getElementById("modalDesc");
  const modalPhoto = document.getElementById("modalPhoto");

  const editForm = document.getElementById("editForm");
  const editText = document.getElementById("editText");
  const editType = document.getElementById("editType");
  const editImgUrl = document.getElementById("editImgUrl");
  const editIcon = document.getElementById("editIcon");

  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const cancelEdit = document.getElementById("cancelEdit");

  const delBtn = document.getElementById("delBtn");
  const modalClose = document.getElementById("modalClose");

  let currentMarker = null;

  /* ─────────────────────────
     SAFETY
  ───────────────────────── */

  if (!modal) {
    console.warn("[UI] modal not found");
    return {};
  }

  /* ─────────────────────────
     OPEN MODAL
  ───────────────────────── */

  function openModal(marker) {
    if (!marker) return;

    currentMarker = marker;
    state.setCurrentMarker(marker);

    modalTitle.textContent = marker.text || "Маркер";
    modalBadge.textContent = marker.type || "unknown";
    modalDesc.textContent = marker.text || "";

    if (marker.imgUrl) {
      modalPhoto.style.display = "";
      modalPhoto.src = marker.imgUrl;
    } else {
      modalPhoto.style.display = "none";
    }

    exitEditMode(false);

    modal.classList.add("open");

    bus.emit("ui:modal:open", marker);
  }

  /* ─────────────────────────
     CLOSE MODAL
  ───────────────────────── */

  function closeModal() {
    modal.classList.remove("open");

    currentMarker = null;
    state.setCurrentMarker(null);

    exitEditMode(false);

    bus.emit("ui:modal:close");
  }

  /* ─────────────────────────
     EDIT MODE
  ───────────────────────── */

  function enterEditMode() {
    if (!currentMarker) return;

    editText.value = currentMarker.text || "";
    editType.value = currentMarker.type || "loot";
    editImgUrl.value = currentMarker.imgUrl || "";
    editIcon.value = currentMarker.iconUrl || "";

    editForm.style.display = "flex";
    editBtn.style.display = "none";
    saveBtn.style.display = "";
    cancelEdit.style.display = "";

    state.set("editMode", true);

    bus.emit("ui:edit:start", currentMarker);
  }

  function exitEditMode(emit = true) {
    editForm.style.display = "none";
    editBtn.style.display = "";
    saveBtn.style.display = "none";
    cancelEdit.style.display = "none";

    state.set("editMode", false);

    if (emit) {
      bus.emit("ui:edit:cancel");
    }
  }

  /* ─────────────────────────
     SAVE EDIT
  ───────────────────────── */

  function saveEdit() {
    if (!currentMarker) return;

    const updated = {
      text: editText.value.trim(),
      type: editType.value,
      imgUrl: editImgUrl.value.trim() || null,
      iconUrl: editIcon.value.trim() || null
    };

    bus.emit("marker:updateRequest", {
      id: currentMarker.id,
      data: updated
    });

    exitEditMode();
    closeModal();
  }

  /* ─────────────────────────
     DELETE
  ───────────────────────── */

  function deleteMarker() {
    if (!currentMarker) return;

    if (!confirm("Удалить маркер?")) return;

    bus.emit("marker:deleteRequest", currentMarker.id);

    closeModal();
  }

  /* ─────────────────────────
     ADD MODE
  ───────────────────────── */

  function openAddForm(position) {
    state.set("addMode", true);
    bus.emit("ui:add:open", position);
  }

  function closeAddForm() {
    state.set("addMode", false);
    bus.emit("ui:add:close");
  }

  /* ─────────────────────────
     EVENTS
  ───────────────────────── */

  editBtn.onclick = enterEditMode;
  cancelEdit.onclick = () => exitEditMode();
  saveBtn.onclick = saveEdit;
  delBtn.onclick = deleteMarker;
  modalClose.onclick = closeModal;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────── */

  return {
    openModal,
    closeModal,
    enterEditMode,
    exitEditMode,
    saveEdit,
    deleteMarker,
    openAddForm,
    closeAddForm
  };
      }
