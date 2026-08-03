import { NextResponse } from "next/server";
import { getClaveUnicaRedirectUri } from "@/lib/claveunica";

/** Solo desarrollo: muestra la Redirect URI que envía la app a ClaveÚnica */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const clientId = process.env.CLAVEUNICA_CLIENT_ID ?? "";
  const redirectUri = getClaveUnicaRedirectUri();

  return NextResponse.json({
    redirectUri,
    clientIdPreview: clientId ? `${clientId.slice(0, 8)}…` : "(vacío)",
    nextauthUrl: process.env.NEXTAUTH_URL ?? "(vacío)",
    logoutRedirect: process.env.CLAVEUNICA_LOGOUT_REDIRECT ?? "(vacío)",
    note:
      "Esta redirectUri debe coincidir EXACTAMENTE con la registrada en Cerofilas para el mismo client_id (sandbox/QA/prod).",
  });
}
