import { NextResponse } from "next/server";
import { buildClaveUnicaLogoutUrl } from "@/lib/claveunica";

/** Cookies típicas de NextAuth (http y https). */
const AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

/**
 * Cierre de sesión alineado al manual ClaveÚnica:
 * 1) Limpia cookies de sesión local
 * 2) Redirige con GET a pantalla completa al logout de ClaveÚnica
 * 3) ClaveÚnica vuelve a la Logout URI (inicio del sitio)
 *
 * Se hace en el servidor para no pasar por /login al quedar sin sesión en /dashboard.
 */
export async function GET() {
  const response = NextResponse.redirect(buildClaveUnicaLogoutUrl());

  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
    });
  }

  return response;
}
