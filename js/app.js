import { startRealtime, weapons, targets } from "./realtime.js";

const targetSelect = document.getElementById("target");
const modeSelect = document.getElementById("mode");
const calcBtn = document.getElementById("calcBtn");
const output = document.getElementById("output");

function getTierClass(tier){

    switch(tier){

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

function renderTargets(){

    targetSelect.innerHTML = "";

    Object.entries(targets).forEach(([id,target]) => {

        const option = document.createElement("option");

        option.value = id;

        option.textContent =
            target.name_ru || target.name_en || id;

        targetSelect.appendChild(option);

    });

}

function calculate(){

    const targetId = targetSelect.value;
    const mode = modeSelect.value;

    const target = targets[targetId];

    if(!target) return;

    let results = [];

    Object.entries(weapons).forEach(([id,weapon]) => {

        const amount =
            Math.ceil(target.hp / weapon.damage);

        const totalCost =
            amount * weapon.cost;

        const totalTime =
            amount * weapon.time;

        results.push({

            id,
            ...weapon,

            amount,
            totalCost,
            totalTime

        });

    });

    if(mode === "cost"){

        results.sort((a,b)=>
            a.totalCost - b.totalCost
        );

    }else{

        results.sort((a,b)=>
            a.totalTime - b.totalTime
        );

    }

    renderResults(target,results);

}

function renderResults(target,results){

    output.innerHTML = "";

    results.forEach((weapon,index)=>{

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `

            <div class="badge ${getTierClass(target.tier)}">
                ${target.category || "structure"}
            </div>

            <h2>
                ${target.name_ru || target.name_en}
            </h2>

            <div class="weapon-row">

                <div>
                    <div class="weapon-name">
                        ${weapon.name_ru || weapon.name_en}
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
                    💰 ${weapon.totalCost} sulfur
                </span>

                <span class="fast">
                    ⚡ ${weapon.totalTime.toFixed(1)} sec
                </span>

            </div>

            <div class="hp">
                HP структуры: ${target.hp}
            </div>

        `;

        output.appendChild(card);

    });

}

calcBtn.addEventListener("click",calculate);

startRealtime(()=>{

    renderTargets();
    calculate();

});
