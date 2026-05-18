let gameData = null;

async function loadData() {
  const res = await fetch("data/game.json");
  gameData = await res.json();
}

function calculate(structure, weaponKey) {
  const hp = gameData.structures[structure];
  const w = gameData.weapons[weaponKey];

  const hits = Math.ceil(hp / w.damage);
  const cost = hits * w.cost;

  return {
    weapon: w.name,
    hits,
    cost
  };
}

function calculateAll() {
  const structure = document.getElementById("structure").value;

  let results = [];

  for (let key in gameData.weapons) {
    results.push(calculate(structure, key));
  }

  results.sort((a, b) => a.cost - b.cost);

  const best = results[0];

  let html = `<h3>📊 Результаты</h3>`;

  results.forEach(r => {
    html += `
      <div style="margin:8px;padding:8px;background:${r===best?'#1f3':'#222'}">
        ${r.weapon} | Hits: ${r.hits} | Cost: ${r.cost}
      </div>
    `;
  });

  html += `<h3>🏆 Лучший: ${best.weapon}</h3>`;

  document.getElementById("result").innerHTML = html;
}

loadData();