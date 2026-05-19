// js/app.js
import { startRealtime, weapons, targets } from "./realtime.js";

const targetSelect = document.getElementById("target");
const modeSelect = document.getElementById("mode");
const calcBtn = document.getElementById("calcBtn");
const output = document.getElementById("output");
const categorySelect = document.getElementById("category");

// Получаем класс цвета для tier структуры
function getTierClass(tier) {
    switch(tier){
        case "wood": return "tier-wood";
        case "stone": return "tier-stone";
        case "metal": return "tier-metal";
        case "armored": return "tier-armored";
        default: return "";
    }
}

// Отрисовка списка структур в select с учетом категории
function renderTargets() {
    targetSelect.innerHTML = "";

    const selectedCategory = categorySelect.value || "all";

    Object.entries(targets).forEach(([id, target]) => {
        if(selectedCategory !== "all" && target.category !== selectedCategory){
            return;
        }

        const option = document.createElement("option");
        option.value = id;
        option.textContent = target.name_ru || target.name_en || target.name || id;
        targetSelect.appendChild(option);
    });

    // Сбрасываем выбор на первую структуру в списке
    if(targetSelect.options.length > 0){
        targetSelect.selectedIndex = 0;
    }
}

// Основная функция расчета
function calculate() {
    const targetId = targetSelect.value;
    const mode = modeSelect.value;

    const target = targets[targetId];
    if(!target) {
        output.innerHTML = "<p>Нет выбранной структуры</p>";
        return;
    }

    let results = [];

    Object.entries(weapons).forEach(([id, weapon]) => {
        const damage = weapon.damage || 1; // защита от нуля
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

    // Сортировка по выбранному режиму
    if(mode === "cost"){
        results.sort((a,b)=> a.totalCost - b.totalCost);
    } else {
        results.sort((a,b)=> a.totalTime - b.totalTime);
    }

    renderResults(target, results);
}

// Отрисовка карточек с подсветкой BEST оружия
function renderResults(target, results) {
    output.innerHTML = "";

    results.forEach((weapon, index) => {
        const card = document.createElement("div");
        card.className = "card";

        // Цвет BEST оружия = tier структуры
        const bestClass = index === 0 ? getTierClass(target.tier) : "";

        card.innerHTML = `
            <div class="badge ${getTierClass(target.tier)}">
                ${target.category || "structure"}
            </div>

            <h2>${target.name_ru || target.name_en || target.name || "Unknown"}</h2>

            <div class="weapon-row">
                <div>
                    <div class="weapon-name">
                        ${weapon.name_ru || weapon.name_en || weapon.name || "Unknown"}
                    </div>
                    <div class="hp">Нужно: ${weapon.amount} шт.</div>
                </div>
                <div>
                    ${index === 0 ? `<div class="best ${bestClass}">BEST</div>` : ""}
                </div>
            </div>

            <div class="weapon-row">
                <span class="cost">💰 ${weapon.totalCost} sulfur</span>
                <span class="fast">⚡ ${weapon.totalTime.toFixed(1)} sec</span>
            </div>

            <div class="hp">HP структуры: ${target.hp}</div>
        `;

        output.appendChild(card);
    });
}

// События
calcBtn.addEventListener("click", calculate);
categorySelect.addEventListener("change", () => {
    renderTargets();
    calculate();
});

// Realtime обновление
startRealtime(() => {
    renderTargets();
    calculate();
});

// Инициализация страницы при загрузке
renderTargets();
calculate();
