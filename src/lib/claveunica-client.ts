"use client";

/**
 * Cierre de sesión según manual ClaveÚnica (GET a pantalla completa).
 * El servidor limpia la sesión y redirige a accounts.claveunica…/logout,
 * que luego vuelve al inicio (Logout URI). Evita el flash de /login.
 */
export function signOutWithClaveUnica() {
  window.location.assign("/api/auth/claveunica-logout");
}
