export function calculate(target, weapons, mode) {

  let results = [];

  for (let key in weapons) {

    const w = weapons[key];

    const hits = Math.ceil(target.hp / w.damage);

    const sulfur = hits * w.cost;

    const time = hits * w.time;

    results.push({
      name: w.name,
      hits,
      sulfur,
      time
    });

  }

  if (mode === "cost") {
    results.sort((a,b)=>a.sulfur-b.sulfur);
  } else {
    results.sort((a,b)=>a.time-b.time);
  }

  return results;
}