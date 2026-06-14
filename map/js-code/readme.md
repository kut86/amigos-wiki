 const textVal  = (editQuill && editQuill.getText().trim()) ? textHTML : null;
  const extraFields = collectExtraFields(editExtraFields);
  update(ref(db, `maps/${currentMap}/markers/${current.id}`), {
    x: current.x, y: current.y,
    name,
    text:        textVal,
    type:        editType.value,
    emoji:       editEmojiInput.value.trim()  || null,
    imgUrl:      editImgUrl.value.trim()      || null,
    iconUrl:     editIconUrl.value.trim()     || null,
    extraFields: extraFields.length ? extraFields : null,
  }).then(() => { toast("Сохранено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

document.getElementById("editExtraFieldBtn").addEventListener("click", () => {
  addExtraFieldRow(editExtraFields);
});

/* ── Delete ── */
delBtn.onclick = () => {
  if (!current) return;
  if (!confirm("Удалить маркер?")) return;
  remove(ref(db, `maps/${currentMap}/markers/${current.id}`))
    .then(() => { toast("Удалено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

/* ── Extra fields helpers ── */
function addExtraFieldRow(container, label = "", value = "") {
  const row = document.createElement("div");
  row.className = "extra-field-row";
  row.innerHTML = `
    <input type="text" class="extra-field-label" placeholder="Название поля" value="${esc(label)}">
    <input type="text" class="extra-field-value" placeholder="Значение"       value="${esc(value)}">
    <button type="button" class="extra-field-remove btn btn-sm btn-danger">✕</button>`;
  row.querySelector(".extra-field-remove").onclick = () => row.remove();
  container.appendChild(row);
}

function collectExtraFields(container) {
  const result = [];
  container.querySelectorAll(".extra-field-row").forEach(row => {
    const label = row.querySelector(".extra-field-label").value.trim();
    const value = row.querySelector(".extra-field-value").value.trim();
    if (label || value) result.push({ label, value });
  });
  return result;
}

/* ── URL hash ── */
function waitAndOpen(id, m) {
  if (pz) { openModal(id, m); }
  else setTimeout(() => waitAndOpen(id, m), 200);
}

function checkUrlHash() {
  const hash = location.hash;
  if (!hash.startsWith("#marker=")) return;
  const id = hash.slice(8);
  const unsub = onValue(ref(db, `maps/${currentMap}/markers`), snap => {
    unsub();
    snap.forEach(i => { allMarkers[i.key] = i.val(); });
    const m = allMarkers[id];
    if (m) { render(); waitAndOpen(id, m); }
    else toast("Маркер не найден", true);
  });
}

/* ── Init ── */
const savedMap = localStorage.getItem("lastMap");
const startMap = (savedMap && MAPS[savedMap]) ? savedMap : "groundzero";
mapSelect.value = startMap;
switchMap(startMap);
checkUrlHash();


/* ── Quill — последними ── */
addQuill = new Quill("#addQuillEditor", {
  theme: "snow",
  placeholder: "Подробное описание...",
  modules: { toolbar: "#addQuillToolbar" }
});

editQuill = new Quill("#editQuillEditor", {
  theme: "snow",
  placeholder: "Описание...",
  modules: { toolbar: "#editQuillToolbar" }
});
