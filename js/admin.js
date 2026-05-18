import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";

document.getElementById("saveBtn").onclick = async () => {

  const id = document.getElementById("id").value;

  await setDoc(doc(db, "weapons", id), {

    name: document.getElementById("name").value,

    damage: Number(document.getElementById("damage").value),

    cost: Number(document.getElementById("cost").value),

    time: Number(document.getElementById("time").value)

  });

  alert("Saved!");

};