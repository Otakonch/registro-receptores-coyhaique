import { NextRequest, NextResponse } from "next/server";
import { decode, getToken } from "next-auth/jwt";
import { hasAdminAccess, isSuperAdmin } from "@/lib/roles";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

async function readJwtToken(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return decode({ token: bearer.slice(7), secret });
  }

  return getToken({ req, secret });
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = await readJwtToken(req);
  // ClaveÚnica autentica por RUN; el email se completa en /registro y puede
  // no estar aún en sesiones antiguas. Basta con id de usuario en BD.
  if (!token?.id || token.needsRegistration) return null;

  return {
    id: token.id as string,
    email: (token.email as string) ?? "",
    name: (token.name as string | null) ?? null,
    role: (token.role as string) ?? "USER",
  };
}

export function unauthorized(message = "No autenticado") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Sin permisos") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, response: unauthorized() };
  return { user, response: null };
}

export async function requireAdmin(req: NextRequest) {
  const { user, response } = await requireAuth(req);
  if (response) return { user: null, response };
  if (!hasAdminAccess(user!.role)) {
    return { user: null, response: forbidden() };
  }
  return { user, response: null };
}

export async function requireSuperAdmin(req: NextRequest) {
  const { user, response } = await requireAuth(req);
  if (response) return { user: null, response };
  if (!isSuperAdmin(user!.role)) {
    return { user: null, response: forbidden() };
  }
  return { user, response: null };
}
