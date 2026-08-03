"use client";

import { signOut } from "next-auth/react";

/** URL de logout de ClaveÚnica con redirect a la app */
export function buildClaveUnicaLogoutUrl(): string {
  const redirect =
    process.env.NEXT_PUBLIC_CLAVEUNICA_LOGOUT_REDIRECT ?? window.location.origin;
  return `https://accounts.claveunica.gob.cl/api/v1/accounts/app/logout?redirect=${encodeURIComponent(redirect)}`;
}

/** Cierra sesión local y redirige al logout de ClaveÚnica */
export async function signOutWithClaveUnica() {
  await signOut({ redirect: false });
  window.location.href = buildClaveUnicaLogoutUrl();
}
