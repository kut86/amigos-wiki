// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  onValue,
  update,
  remove,
  get,
  set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ─────────────────────────────
   Firebase config
───────────────────────────── */

const firebaseConfig = {
  apiKey: "AIzaSyA7GnUlFkDcDKAv4ntXC6UZDjAkpaEgPMs",
  authDomain: "tarkovmap-376d0.firebaseapp.com",
  projectId: "tarkovmap-376d0",
  storageBucket: "tarkovmap-376d0.firebasestorage.app",
  messagingSenderId: "693794844907",
  appId: "1:693794844907:web:bb020ca896ae7b07acceae",
  databaseURL:
    "https://tarkovmap-376d0-default-rtdb.europe-west1.firebasedatabase.app"
};

/* ─────────────────────────────
   Init
───────────────────────────── */

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

/* ─────────────────────────────
   DB helpers
───────────────────────────── */

export {
  ref,
  push,
  onValue,
  update,
  remove,
  get,
  set
};

/* ─────────────────────────────
   AUTH
───────────────────────────── */

export function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function logout() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/* ─────────────────────────────
   USER SYSTEM (РОЛИ)
───────────────────────────── */

/**
 * создаёт пользователя если его нет
 */
export async function ensureUser(user) {
  if (!user) return;

  const userRef = ref(db, `users/${user.uid}`);

  const snap = await new Promise((resolve) => {
    onValue(userRef, resolve, { onlyOnce: true });
  });

  if (!snap.exists()) {
    await set(userRef, {
      uid: user.uid,
      name: user.displayName || "unknown",
      photoURL: user.photoURL || null,
      role: "user",
      createdAt: Date.now()
    });
  }
}

/**
 * получить роль пользователя
 */
export async function getUserRole(uid) {
  if (!uid) return "user";

  const roleRef = ref(db, `users/${uid}/role`);

  const snap = await new Promise((resolve) => {
    onValue(roleRef, resolve, { onlyOnce: true });
  });

  return snap.exists() ? snap.val() : "user";
}

/**
 * обновить роль (ТОЛЬКО ДЛЯ ADMIN LOGIC)
 */
export async function setUserRole(uid, role) {
  if (!uid) return;

  await update(ref(db, `users/${uid}`), {
    role
  });
    }
