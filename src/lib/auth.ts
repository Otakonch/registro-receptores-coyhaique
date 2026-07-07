import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { rateLimit } from "./rateLimit";

// Cada cuántos ms se re-valida el usuario contra la BD sin forzar re-login
const RECHECK_INTERVAL = 15 * 60 * 1000; // 15 minutos

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db as Parameters<typeof PrismaAdapter>[0]),

  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email:    { label: "Correo electrónico", type: "email"    },
        password: { label: "Contraseña",          type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Correo y contraseña son requeridos");
        }

        // Limitar intentos fallidos por email: 10 intentos en 15 minutos
        const key = `login:${credentials.email.toLowerCase()}`;
        if (!rateLimit(key, 10, 15 * 60 * 1000)) {
          throw new Error("Cuenta bloqueada temporalmente por múltiples intentos fallidos. Inténtalo en 15 minutos.");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        // Mismo mensaje para email y contraseña incorrectos — evita enumeración
        if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
          throw new Error("Correo o contraseña incorrectos");
        }

        if (!user.emailVerified && user.role === "USER") {
          throw new Error("Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.");
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   8 * 60 * 60,  // 8 horas
    updateAge: 60 * 60,     // renovar cookie cada hora mientras el usuario esté activo
  },

  // Las cookies se configuran automáticamente según el protocolo:
  //   HTTP  → next-auth.session-token
  //   HTTPS → __Secure-next-auth.session-token (secure, httpOnly, sameSite=lax)
  // Esto garantiza que el middleware y el handler usen siempre el mismo nombre.

  callbacks: {
    async jwt({ token, user }) {
      // Primera vez: poblar el token con los datos del usuario
      if (user) {
        token.id          = user.id;
        token.role        = (user as any).role;
        token.lastChecked = Date.now();
        return token;
      }

      // Re-verificar contra la BD cada RECHECK_INTERVAL
      const lastChecked = (token.lastChecked as number) ?? 0;
      if (Date.now() - lastChecked > RECHECK_INTERVAL) {
        const dbUser = await db.user.findUnique({
          where:  { id: token.id as string },
          select: { id: true, role: true },
        });

        // Si el usuario fue eliminado, invalidar la sesión
        if (!dbUser) return null as any;

        token.role        = dbUser.role;
        token.lastChecked = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id   = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
