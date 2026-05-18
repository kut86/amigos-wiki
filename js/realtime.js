import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";

export let weapons = {};
export let targets = {};

export function startRealtime(callback) {

  onSnapshot(collection(db, "weapons"), snap => {
    weapons = {};

    snap.forEach(doc => {
      weapons[doc.id] = doc.data();
    });

    callback();
  });

  onSnapshot(collection(db, "targets"), snap => {
    targets = {};

    snap.forEach(doc => {
      targets[doc.id] = doc.data();
    });

    callback();
  });

}