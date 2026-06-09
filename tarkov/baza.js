import {
  auth,
  loginWithGoogle,
  onUserChanged,
  getUserRole,
  ensureUser
} from "./firebase.js";

/* ─────────────────────────
   LOGIN BUTTON
───────────────────────── */

document.getElementById("loginBtn").addEventListener("click", async () => {
  await loginWithGoogle();
});

/* ─────────────────────────
   AUTH LISTENER
───────────────────────── */

onUserChanged(async (user) => {
  if (!user) return;

  await ensureUser(user);

  const role = await getUserRole(user.uid);

  console.log("ROLE:", role);

  /* ─────────────────────────
     ROUTING
  ───────────────────────── */

  if (role === "admin") {
    localStorage.setItem("role", "admin");
    window.location.href = "map.html";
  } else {
    localStorage.setItem("role", "user");
    window.location.href = "map.html";
  }
});
