import { startRealtime, weapons, targets } from "./realtime.js";

const targetSelect = document.getElementById("target");
const modeSelect = document.getElementById("mode");
const calcBtn = document.getElementById("calcBtn");
const output = document.getElementById("output");
const categorySelect = document.getElementById("category");
const searchInput = document.getElementById("search");


// =========================
// SAFE STRING
// =========================
function safeString(v){
    return (v ?? "").toString().trim();
}


// =========================
// NORMALIZE
// =========================
function normalize(str){
    return safeString(str).toLowerCase();
}


// =========================
// FIX CATEGORY
// =========================
function fixCategory(cat){

    cat = normalize(cat);

    if(cat.includes("door")) return "door";
    if(cat.includes("wall")) return "wall";
    if(cat.includes("window")) return "window";
    if(cat.includes("deploy")) return "deployable";

    return cat;
}


// =========================
// TIER COLORS
// =========================
function getTierClass(tier){

    switch(normalize(tier)){

        case "wood":
            return "tier-wood";

        case "stone":
            return "tier-stone";

        case "metal":
            return "tier-metal";

        case "armored":
            return "tier-armored";

        default:
            return "";
    }
}


// =========================
// RENDER TARGETS
// =========================
function renderTargets(){

    const currentValue = targetSelect.value;

    targetSelect.innerHTML = "";

    const selectedCategory = normalize(categorySelect.value);
    const search = normalize(searchInput.value);

    let found = 0;
    let firstKey = null;

    Object.entries(targets).forEach(([id, target]) => {

        const cat = fixCategory(target.category);

        const name =
            normalize(target.name_ru) +
            " " +
            normalize(target.name_en);

        // CATEGORY FILTER
        if(selectedCategory !== "all" && cat !== selectedCategory){
            return;
        }

        // SEARCH FILTER
        if(search && !name.includes(search)){
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

        // FIRST ITEM
        if(firstKey === null){
            firstKey = id;
        }

        found++;
    });

    // EMPTY
    if(found === 0){

        const option = document.createElement("option");

        option.value = "";

        option.textContent = "Нет структур";

        targetSelect.appendChild(option);

        output.innerHTML = `
            <div style="padding:20px;color:#999">
                Ничего не найдено
            </div>
        `;

        return;
    }

    // RESTORE SELECT
    if(targets[currentValue]){
        targetSelect.value = currentValue;
    } else {
        targetSelect.value = firstKey;
    }
}


// =========================
// CALCULATE REAL DAMAGE
// =========================
function calculate(){

    const targetId = targetSelect.value;

    const mode = modeSelect.value;

    const target = targets[targetId];

    if(!target){

        output.innerHTML = `
            <div style="padding:20px;color:#999">
                Нет выбранной структуры
            </div>
        `;

        return;
    }

    let results = [];

    Object.entries(weapons).forEach(([id, weapon]) => {

        // REAL DAMAGE SYSTEM
        const damage = weapon.damage?.[targetId] || 0;

        // если оружие не дамажит объект
        if(damage <= 0){
            return;
        }

        const amount = Math.ceil(target.hp / damage);

        const totalCost = amount * (weapon.cost || 0);

        const totalTime = amount * (weapon.time || 0);

        results.push({
            id,
            ...weapon,
            damage,
            amount,
            totalCost,
            totalTime
        });
    });

    // SORT
    if(mode === "cost"){
        results.sort((a,b)=> a.totalCost - b.totalCost);
    } else {
        results.sort((a,b)=> a.totalTime - b.totalTime);
    }

    renderResults(target, results);
}


// =========================
// RENDER RESULTS
// =========================
function renderResults(target, results){

    output.innerHTML = "";

    // NOTHING FOUND
    if(results.length === 0){

        output.innerHTML = `
            <div style="padding:20px;color:#999">
                Нет оружия для этой структуры
            </div>
        `;

        return;
    }

    results.forEach((weapon, index) => {

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <div class="badge ${getTierClass(target.tier)}">
                ${target.category || "structure"}
            </div>

            <h2>
                ${target.name_ru || target.name_en || "Unknown"}
            </h2>

            <div class="weapon-row">

                <div>

                    <div class="weapon-name">
                        ${weapon.name_ru || weapon.name_en || "Unknown"}
                    </div>

                    <div class="hp">
                        Нужно: ${weapon.amount} шт.
                    </div>

                </div>

                <div>

                    ${
                        index === 0
                        ? `<div class="best">BEST</div>`
                        : ``
                    }

                </div>

            </div>

            <div class="weapon-row">

                <span class="cost">
                    💰 ${weapon.totalCost} Серная руда
                </span>

                <span class="fast">
                    ⚡ ${weapon.totalTime.toFixed(1)} sec
                </span>

            </div>

            <div class="weapon-row">

                <span class="hp">
                    💥 Урон: ${weapon.damage}
                </span>

            </div>

            <div class="hp">
                HP структуры: ${target.hp}
            </div>
        `;

        output.appendChild(card);
    });
}


// =========================
// EVENTS
// =========================

// BUTTON
calcBtn.addEventListener("click", calculate);

// CATEGORY
categorySelect.addEventListener("change", () => {

    renderTargets();
    calculate();

});

// SEARCH
searchInput.addEventListener("input", () => {

    renderTargets();
    calculate();

});

// MANUAL SELECT
targetSelect.addEventListener("change", () => {

    calculate();

});


// =========================
// REALTIME FIREBASE
// =========================
startRealtime(() => {

    renderTargets();
    calculate();

});


// =========================
// INIT
// =========================
renderTargets();
calculate();
