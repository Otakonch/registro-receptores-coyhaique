"use client";

/** URL de logout de ClaveÚnica con redirect a la app */
export function buildClaveUnicaLogoutUrl(): string {
  const redirect =
    process.env.NEXT_PUBLIC_CLAVEUNICA_LOGOUT_REDIRECT ?? window.location.origin;
  return `https://accounts.claveunica.gob.cl/api/v1/accounts/app/logout?redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Cierra sesión: navega de inmediato a /logout (spinner)
 * para no mostrar /login mientras se limpia la sesión.
 */
export function signOutWithClaveUnica() {
  window.location.assign("/logout");
}
