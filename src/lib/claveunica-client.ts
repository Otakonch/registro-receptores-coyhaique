"use client";

import { signOut } from "next-auth/react";

/** URL de logout de ClaveÚnica con redirect a la app */
export function buildClaveUnicaLogoutUrl(): string {
  const redirect =
    process.env.NEXT_PUBLIC_CLAVEUNICA_LOGOUT_REDIRECT ?? window.location.origin;
  return `https://accounts.claveunica.gob.cl/api/v1/accounts/app/logout?redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Cierra sesión local y redirige al logout de ClaveÚnica.
 * Usa un overlay para no mostrar /login mientras se limpia la sesión.
 */
export async function signOutWithClaveUnica() {
  const logoutUrl = buildClaveUnicaLogoutUrl();

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "status");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#f9fafb;display:flex;align-items:center;justify-content:center;font:14px/1.4 system-ui,sans-serif;color:#4b5563;";
  overlay.textContent = "Cerrando sesión...";
  document.body.appendChild(overlay);

  try {
    await signOut({ redirect: false });
  } catch {
    // Continuar al logout de ClaveÚnica aunque falle el signOut local
  }

  window.location.replace(logoutUrl);
}
