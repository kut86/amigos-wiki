import { startRealtime, weapons, targets } from "./realtime.js";
import { calculate } from "./calc.js";
import { renderTable } from "./ui.js";

const targetEl = document.getElementById("target");
const output = document.getElementById("output");

function updateTargets() {

  targetEl.innerHTML = "";

  for (let key in targets) {

    let opt = document.createElement("option");

    opt.value = key;
    opt.textContent = targets[key].name;

    targetEl.appendChild(opt);
  }
}

startRealtime(() => {
  updateTargets();
});

document.getElementById("calcBtn").onclick = () => {

  const target = targets[targetEl.value];

  const mode = document.getElementById("mode").value;

  const results = calculate(target, weapons, mode);

  output.innerHTML = renderTable(results);

};