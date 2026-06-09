import { bus } from "./eventBus.js";
import { state } from "./stateManager.js";

/* ─────────────────────────
   MARKER BUILDER (UI)
───────────────────────── */

export function initMarkerBuilder() {
  const container = document.createElement("div");
  container.id = "markerBuilder";
  container.className = "marker-builder hidden";

  document.body.appendChild(container);

  let fields = {
    text: "",
    type: "loot",
    imgUrl: null,
    iconUrl: null,
    custom: {},
    links: []
  };

  /* ─────────────────────────
     RENDER BUILDER UI
  ───────────────────────── */

  function render() {
    container.innerHTML = `
      <div class="builder-box">

        <h3>Конструктор маркера</h3>

        <!-- TEXT -->
        <input id="b_text" placeholder="Описание" value="${fields.text}" />

        <!-- TYPE -->
        <select id="b_type">
          <option value="loot">Loot</option>
          <option value="boss">Boss</option>
          <option value="quest">Quest</option>
          <option value="exit">Exit</option>
          <option value="structure">Structure</option>
        </select>

        <!-- IMAGE -->
        <input id="b_img" placeholder="Image URL" value="${fields.imgUrl || ""}" />

        <!-- ICON -->
        <input id="b_icon" placeholder="Icon URL" value="${fields.iconUrl || ""}" />

        <!-- CUSTOM FIELDS -->
        <div id="customFields"></div>

        <button id="addField">+ Добавить поле</button>

        <!-- LINKS -->
        <div id="linksBox"></div>

        <button id="addLink">+ Добавить связь</button>

        <hr/>

        <button id="saveMarker">Сохранить</button>
        <button id="closeBuilder">Закрыть</button>

      </div>
    `;

    bind();
    renderCustomFields();
    renderLinks();
  }

  /* ─────────────────────────
     CUSTOM FIELDS UI
  ───────────────────────── */

  function renderCustomFields() {
    const box = container.querySelector("#customFields");
    box.innerHTML = "";

    Object.entries(fields.custom).forEach(([key, val], i) => {
      const row = document.createElement("div");

      row.innerHTML = `
        <input data-key="${key}" class="cf_key" value="${key}" />
        <input data-val="${key}" class="cf_val" value="${val}" />
        <button data-remove="${key}">X</button>
      `;

      box.appendChild(row);
    });
  }

  /* ─────────────────────────
     LINKS UI
  ───────────────────────── */

  function renderLinks() {
    const box = container.querySelector("#linksBox");
    box.innerHTML = "";

    fields.links.forEach((l, i) => {
      const row = document.createElement("div");

      row.innerHTML = `
        <input value="${l.targetId}" data-link="${i}" />
        <button data-remove-link="${i}">X</button>
      `;

      box.appendChild(row);
    });
  }

  /* ─────────────────────────
     BIND EVENTS
  ───────────────────────── */

  function bind() {
    container.querySelector("#b_text").oninput = e => fields.text = e.target.value;
    container.querySelector("#b_type").onchange = e => fields.type = e.target.value;
    container.querySelector("#b_img").oninput = e => fields.imgUrl = e.target.value;
    container.querySelector("#b_icon").oninput = e => fields.iconUrl = e.target.value;

    container.querySelector("#addField").onclick = () => {
      const key = prompt("Key:");
      if (!key) return;
      fields.custom[key] = "";
      render();
    };

    container.querySelector("#addLink").onclick = () => {
      const id = prompt("Target marker ID:");
      if (!id) return;
      fields.links.push({ targetId: id });
      render();
    };

    container.querySelector("#saveMarker").onclick = () => {
      bus.emit("marker:addRequest", {
        ...fields
      });

      close();
    };

    container.querySelector("#closeBuilder").onclick = close;
  }

  /* ─────────────────────────
     OPEN / CLOSE
───────────────────────── */

  function open(position) {
    state.set("addMode", true);
    container.classList.remove("hidden");
    render();
  }

  function close() {
    state.set("addMode", false);
    container.classList.add("hidden");
  }

  /* ─────────────────────────
     API
  ───────────────────────── */

  return {
    open,
    close
  };
}
