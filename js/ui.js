export function renderTable(results) {

  const best = results[0];

  let html = `
    <table>
      <tr>
        <th>Weapon</th>
        <th>Hits</th>
        <th>Sulfur</th>
        <th>Time</th>
      </tr>
  `;

  results.forEach(r => {

    html += `
      <tr class="${r===best?'best':''}">
        <td>${r.name}</td>
        <td>${r.hits}</td>
        <td>${r.sulfur}</td>
        <td>${r.time}</td>
      </tr>
    `;
  });

  html += "</table>";

  return html;
}