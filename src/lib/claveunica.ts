import { formatRut } from "./utils";

/** Respuesta del endpoint userinfo de ClaveÚnica */
export interface ClaveUnicaUserInfo {
  sub: string;
  RolUnico: {
    numero: number;
    DV: string;
    tipo: string;
  };
  name: {
    nombres: string[];
    apellidos: string[];
  };
}

export const CLAVEUNICA_AUTHORIZE_URL =
  "https://accounts.claveunica.gob.cl/openid/authorize/";
export const CLAVEUNICA_TOKEN_URL =
  "https://accounts.claveunica.gob.cl/openid/token/";
export const CLAVEUNICA_USERINFO_URL =
  "https://accounts.claveunica.gob.cl/openid/userinfo/";
export const CLAVEUNICA_LOGOUT_URL =
  "https://accounts.claveunica.gob.cl/api/v1/accounts/app/logout";

export function getClaveUnicaConfig() {
  const clientId = process.env.CLAVEUNICA_CLIENT_ID;
  const clientSecret = process.env.CLAVEUNICA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltan CLAVEUNICA_CLIENT_ID o CLAVEUNICA_CLIENT_SECRET en las variables de entorno"
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getClaveUnicaRedirectUri(),
    logoutRedirect:
      process.env.CLAVEUNICA_LOGOUT_REDIRECT ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000",
  };
}

/** Debe coincidir carácter a carácter con la Redirect URI registrada en Cerofilas */
export function getClaveUnicaRedirectUri(): string {
  const explicit = process.env.CLAVEUNICA_REDIRECT_URI?.replace(/\/$/, "");
  if (explicit) return explicit;

  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}/api/auth/callback/claveunica`;
}

/** Convierte RolUnico de ClaveÚnica al formato RUT del sistema (12.345.678-9) */
export function rutFromClaveUnica(rolUnico: ClaveUnicaUserInfo["RolUnico"]): string {
  const body = String(rolUnico.numero);
  const dv = rolUnico.DV.toUpperCase();
  return formatRut(`${body}${dv}`);
}

/** Nombre completo desde la respuesta userinfo */
export function nameFromClaveUnica(name: ClaveUnicaUserInfo["name"]): string {
  return [...name.nombres, ...name.apellidos].join(" ").trim();
}

/** URL de cierre de sesión en ClaveÚnica (GET, pantalla completa) */
export function buildClaveUnicaLogoutUrl(redirectUri?: string): string {
  const { logoutRedirect } = getClaveUnicaConfig();
  const redirect = redirectUri ?? logoutRedirect;
  return `${CLAVEUNICA_LOGOUT_URL}?redirect=${encodeURIComponent(redirect)}`;
}
