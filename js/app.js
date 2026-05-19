import { startRealtime, weapons, targets } from "./realtime.js";

const targetSelect = document.getElementById("target");
const modeSelect = document.getElementById("mode");
const calcBtn = document.getElementById("calcBtn");
const output = document.getElementById("output");
const categorySelect = document.getElementById("category");


// =========================
// НОРМАЛИЗАЦИЯ ТЕКСТА
// =========================
function normalize(str){
    return (str || "")
        .toString()
        .trim()
        .toLowerCase();
}


// =========================
// TIER ЦВЕТА
// =========================
function getTierClass(tier) {
    switch(normalize(tier)){
        case "wood": return "tier-wood";
        case "stone": return "tier-stone";
        case "metal": return "tier-metal";
        case "armored": return "tier-armored";
        default: return "";
    }
}


// =========================
// ОТРИСОВКА СТРУКТУР
// =========================
function renderTargets() {
    targetSelect.innerHTML = "";

    const selectedCategory = normalize(categorySelect.value);

    let firstKey = null;
    let found = 0;

    Object.entries(targets).forEach(([id, target]) => {

        const cat = normalize(target.category);

        // фильтр категорий
        if(selectedCategory !== "all" && cat !== selectedCategory){
            return;
        }

        const option = document.createElement("option");
        option.value = id;
        option.textContent =
            target.name_ru ||
            target.name_en ||
            target.name ||
            id;

        targetSelect.appendChild(option);

        if(firstKey === null){
            firstKey = id;
        }

        found++;
    });

    // если ничего не найдено
    if(found === 0){
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Нет структур в этой категории";
        targetSelect.appendChild(option);
        return;
    }

    // выбираем первую структуру
    targetSelect.value = firstKey;
}


// =========================
// РАСЧЁТ
// =========================
function calculate() {

    const targetId = targetSelect.value;
    const mode = modeSelect.value;

    const target = targets[targetId];

    if(!target){
        output.innerHTML = "<p style='color:#aaa'>Нет выбранной структуры</p>";
        return;
    }

    let results = [];

    Object.entries(weapons).forEach(([id, weapon]) => {

        const damage = weapon.damage || 1;

        const amount = Math.ceil(target.hp / damage);

        const totalCost = amount * (weapon.cost || 0);
        const totalTime = amount * (weapon.time || 0);

        results.push({
            id,
            ...weapon,
            amount,
            totalCost,
            totalTime
        });
    });

    // сортировка
    if(mode === "cost"){
        results.sort((a,b)=> a.totalCost - b.totalCost);
    } else {
        results.sort((a,b)=> a.totalTime - b.totalTime);
    }

    renderResults(target, results);
}


// =========================
// ОТРИСОВКА КАРТОЧЕК
// =========================
function renderResults(target, results) {

    output.innerHTML = "";

    results.forEach((weapon, index) => {

        const card = document.createElement("div");
        card.className = "card";

        const bestClass = index === 0 ? getTierClass(target.tier) : "";

        card.innerHTML = `
            <div class="badge ${getTierClass(target.tier)}">
                ${target.category || "structure"}
            </div>

            <h2>
                ${target.name_ru || target.name_en || target.name || "Unknown"}
            </h2>

            <div class="weapon-row">

                <div>
                    <div class="weapon-name">
                        ${weapon.name_ru || weapon.name_en || weapon.name || "Unknown"}
                    </div>

                    <div class="hp">
                        Нужно: ${weapon.amount} шт.
                    </div>
                </div>

                <div>
                    ${index === 0 ? `<div class="best ${bestClass}">BEST</div>` : ""}
                </div>

            </div>

            <div class="weapon-row">
                <span class="cost">💰 ${weapon.totalCost} sulfur</span>
                <span class="fast">⚡ ${weapon.totalTime.toFixed(1)} sec</span>
            </div>

            <div class="hp">
                HP структуры: ${target.hp}
            </div>
        `;

        output.appendChild(card);
    });
}


// =========================
// СОБЫТИЯ
// =========================

// кнопка
calcBtn.addEventListener("click", calculate);

// категории
categorySelect.addEventListener("change", () => {
    renderTargets();
    calculate();
});


// realtime Firebase
startRealtime(() => {
    renderTargets();
    calculate();
});


// =========================
// ИНИЦИАЛИЗАЦИЯ
// =========================
renderTargets();
calculate();
