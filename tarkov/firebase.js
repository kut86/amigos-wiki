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
   FIREBASE CONFIG
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
   INIT
───────────────────────────── */

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

/* ─────────────────────────────
   DB EXPORTS
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

export async function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export async function logout() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/* ─────────────────────────────
   USER SYSTEM
───────────────────────────── */

/**
 * Создать пользователя если отсутствует
 */
export async function ensureUser(user) {
  if (!user) return null;

  try {
    const userRef = ref(db, `users/${user.uid}`);

    const snap = await get(userRef);

    if (snap.exists()) {
      await update(userRef, {
        lastLogin: Date.now()
      });

      return snap.val();
    }

    const userData = {
      uid: user.uid,

      email: user.email || null,

      name: user.displayName || "unknown",

      photoURL: user.photoURL || null,

      role: "user",

      createdAt: Date.now(),
      lastLogin: Date.now()
    };

    await set(userRef, userData);

    return userData;
  } catch (err) {
    console.error(
      "[FIREBASE] ensureUser error",
      err
    );

    throw err;
  }
}

/**
 * Получить профиль пользователя
 */
export async function getUser(uid) {
  if (!uid) return null;

  try {
    const snap = await get(
      ref(db, `users/${uid}`)
    );

    if (!snap.exists()) {
      return null;
    }

    return snap.val();
  } catch (err) {
    console.error(
      "[FIREBASE] getUser error",
      err
    );

    return null;
  }
}

/**
 * Получить роль пользователя
 */
export async function getUserRole(uid) {
  if (!uid) return "user";

  try {
    const snap = await get(
      ref(db, `users/${uid}/role`)
    );

    if (!snap.exists()) {
      return "user";
    }

    return snap.val();
  } catch (err) {
    console.error(
      "[FIREBASE] getUserRole error",
      err
    );

    return "user";
  }
}

/**
 * Проверка администратора
 */
export async function isAdmin(uid) {
  const role = await getUserRole(uid);

  return role === "admin";
}

/**
 * Изменить роль пользователя
 */
export async function setUserRole(uid, role) {
  if (!uid) return;

  try {
    await update(
      ref(db, `users/${uid}`),
      {
        role
      }
    );

    console.log(
      `[FIREBASE] role updated: ${uid} -> ${role}`
    );
  } catch (err) {
    console.error(
      "[FIREBASE] setUserRole error",
      err
    );

    throw err;
  }
}

/**
 * Обновить дату входа
 */
export async function updateLastLogin(uid) {
  if (!uid) return;

  try {
    await update(
      ref(db, `users/${uid}`),
      {
        lastLogin: Date.now()
      }
    );
  } catch (err) {
    console.error(
      "[FIREBASE] updateLastLogin error",
      err
    );
  }
        }
