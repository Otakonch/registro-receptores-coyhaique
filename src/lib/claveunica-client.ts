"use client";

/** URL de logout de ClaveÚnica (GET a pantalla completa, sin iframe/popup). */
export function buildClaveUnicaLogoutUrl(): string {
  const redirect =
    process.env.NEXT_PUBLIC_CLAVEUNICA_LOGOUT_REDIRECT ?? window.location.origin;
  return `https://accounts.claveunica.gob.cl/api/v1/accounts/app/logout?redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Cierre de sesión según manual ClaveÚnica:
 * 1) Cierra la sesión local (NextAuth)
 * 2) Redirige con GET a pantalla completa al logout de ClaveÚnica
 * 3) ClaveÚnica vuelve a la Logout URI registrada (inicio del sitio)
 */
export async function signOutWithClaveUnica() {
  const logoutUrl = buildClaveUnicaLogoutUrl();

  try {
    // Fetch directo: evita que React re-renderice /login antes de salir
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
    if (csrfToken) {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, json: "true" }),
      });
    }
  } catch {
    // Continuar al logout de ClaveÚnica aunque falle el signOut local
  }

  // GET a pantalla completa (manual: no usar popup ni iframe)
  window.location.assign(logoutUrl);
}
