import { NextAuthOptions } from "next-auth";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";
import { db } from "./db";
import {
  CLAVEUNICA_TOKEN_URL,
  CLAVEUNICA_USERINFO_URL,
  ClaveUnicaUserInfo,
  getClaveUnicaConfig,
  getClaveUnicaRedirectUri,
  nameFromClaveUnica,
  rutFromClaveUnica,
} from "./claveunica";
import { getPostLoginPath } from "./post-login-path";

export { getPostLoginPath };

const RECHECK_INTERVAL = 15 * 60 * 1000;

function ClaveUnicaProvider(
  options: OAuthUserConfig<ClaveUnicaUserInfo>
): OAuthConfig<ClaveUnicaUserInfo> {
  return {
    id: "claveunica",
    name: "ClaveÚnica",
    type: "oauth",
    authorization: {
      url: "https://accounts.claveunica.gob.cl/openid/authorize/",
      params: {
        scope: "openid run name",
        response_type: "code",
        redirect_uri: getClaveUnicaRedirectUri(),
      },
    },
    token: {
      url: CLAVEUNICA_TOKEN_URL,
      async request({ params, provider, checks }) {
        const config = getClaveUnicaConfig();
        const body = new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: getClaveUnicaRedirectUri(),
          grant_type: "authorization_code",
          code: params.code ?? "",
          state: (params.state as string) ?? checks.state ?? "",
        });

        const res = await fetch(CLAVEUNICA_TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: body.toString(),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("ClaveÚnica token error:", res.status, text);
          throw new Error("Error al obtener token de ClaveÚnica");
        }

        const tokens = await res.json();
        return { tokens };
      },
    },
    userinfo: {
      url: CLAVEUNICA_USERINFO_URL,
      async request({ tokens }) {
        const res = await fetch(CLAVEUNICA_USERINFO_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("ClaveÚnica userinfo error:", res.status, text);
          throw new Error("Error al obtener datos del ciudadano");
        }

        return res.json();
      },
    },
    profile(profile) {
      const rut = rutFromClaveUnica(profile.RolUnico);
      const name = nameFromClaveUnica(profile.name);
      return {
        id: rut,
        name,
        email: null,
        rut,
      };
    },
    options,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    ClaveUnicaProvider({
      clientId: process.env.CLAVEUNICA_CLIENT_ID ?? "",
      clientSecret: process.env.CLAVEUNICA_CLIENT_SECRET ?? "",
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "claveunica" || !profile) {
        return false;
      }
      return true;
    },

    async jwt({ token, user, account, profile, trigger, session }) {
      // Actualizar sesión tras completar registro en /registro
      if (trigger === "update" && session?.registered && token.rut) {
        const dbUser = await db.user.findUnique({
          where: { rut: token.rut as string },
          select: { id: true, role: true, email: true, name: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.email = dbUser.email;
          if (dbUser.name) token.name = dbUser.name;
          token.needsRegistration = false;
          token.lastChecked = Date.now();
        }
        return token;
      }

      // Primer ingreso con ClaveÚnica
      if (account?.provider === "claveunica" && profile && user) {
        const cuProfile = profile as unknown as ClaveUnicaUserInfo;
        const rut = rutFromClaveUnica(cuProfile.RolUnico);
        const name = nameFromClaveUnica(cuProfile.name);

        token.rut = rut;
        token.name = name;

        const dbUser = await db.user.findUnique({
          where: { rut },
          select: { id: true, role: true, email: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.email = dbUser.email;
          token.needsRegistration = false;
        } else {
          token.needsRegistration = true;
          delete token.id;
          delete token.role;
          delete token.email;
        }

        token.lastChecked = Date.now();
        return token;
      }

      // Re-verificar usuario registrado contra la BD
      if (token.id && !token.needsRegistration) {
        const lastChecked = (token.lastChecked as number) ?? 0;
        if (Date.now() - lastChecked > RECHECK_INTERVAL) {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, email: true },
          });
          if (!dbUser) return null as any;
          token.role = dbUser.role;
          token.email = dbUser.email;
          token.lastChecked = Date.now();
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string | undefined;
        session.user.role = token.role as string | undefined;
        session.user.rut = token.rut as string | undefined;
        session.user.email = (token.email as string | undefined) ?? null;
        session.user.needsRegistration = Boolean(token.needsRegistration);
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
