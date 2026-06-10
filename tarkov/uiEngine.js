import { state } from "./stateManager.js";
import { bus } from "./eventBus.js";

/* ─────────────────────────
   UI ENGINE (STABLE)
───────────────────────── */

export function initUIEngine() {
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

  if (!modal) {
    console.warn("[UI] modal not found");
    return {};
  }

  let currentMarker = null;
  let isEditMode = false;
  let ignoreStateSync = false;

  /* ─────────────────────────
     RENDER
───────────────────────── */

  function render(marker) {
    modalTitle.textContent = marker.text || "Маркер";
    modalBadge.textContent = marker.type || "unknown";
    modalDesc.textContent = marker.text || "";

    if (marker.imgUrl) {
      modalPhoto.style.display = "";
      modalPhoto.src = marker.imgUrl;
    } else {
      modalPhoto.style.display = "none";
    }
  }

  /* ─────────────────────────
     OPEN
───────────────────────── */

  function openModal(marker) {
    if (!marker) return;
    if (currentMarker?.id === marker.id) return;

    currentMarker = marker;

    ignoreStateSync = true;
    state.setCurrentMarker(marker);
    ignoreStateSync = false;

    render(marker);

    isEditMode = false;
    toggleEdit(false);

    modal.classList.add("open");

    bus.emit("ui:modalOpen", marker);
  }

  /* ─────────────────────────
     CLOSE
───────────────────────── */

  function closeModal() {
    if (!modal.classList.contains("open")) return;

    modal.classList.remove("open");

    currentMarker = null;

    ignoreStateSync = true;
    state.setCurrentMarker(null);
    ignoreStateSync = false;

    exitEditMode();

    bus.emit("ui:modalClose");
  }

  /* ─────────────────────────
     EDIT
───────────────────────── */

  function enterEditMode() {
    if (!currentMarker || isEditMode) return;

    isEditMode = true;

    editText.value = currentMarker.text || "";
    editType.value = currentMarker.type || "loot";
    editImgUrl.value = currentMarker.imgUrl || "";
    editIcon.value = currentMarker.iconUrl || "";

    toggleEdit(true);

    bus.emit("ui:editMode", currentMarker);
  }

  function exitEditMode() {
    if (!isEditMode) return;

    isEditMode = false;

    toggleEdit(false);

    bus.emit("ui:editCancel");
  }

  function toggleEdit(on) {
    editForm.style.display = on ? "flex" : "none";
    editBtn.style.display = on ? "none" : "";
    saveBtn.style.display = on ? "" : "none";
    cancelEdit.style.display = on ? "" : "none";
  }

  /* ─────────────────────────
     SAVE
───────────────────────── */

  function saveEdit() {
    if (!currentMarker) return;

    bus.emit("marker:updateRequest", {
      id: currentMarker.id,
      data: {
        text: editText.value.trim(),
        type: editType.value,
        imgUrl: editImgUrl.value.trim() || null,
        iconUrl: editIcon.value.trim() || null
      }
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

  function openAddForm(pos) {
    bus.emit("ui:addOpen", pos);
  }

  function closeAddForm() {
    bus.emit("ui:addClose");
  }

  /* ─────────────────────────
     EVENTS
───────────────────────── */

  editBtn?.addEventListener("click", enterEditMode);
  cancelEdit?.addEventListener("click", exitEditMode);
  saveBtn?.addEventListener("click", saveEdit);
  delBtn?.addEventListener("click", deleteMarker);
  modalClose?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  /* ─────────────────────────
     STATE SYNC SAFE
───────────────────────── */

  state.on("currentMarker", (m) => {
    if (ignoreStateSync) return;
    if (!m) return;

    if (currentMarker?.id === m.id) return;

    openModal(m);
  });

  console.log("[UI] engine initialized");

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
