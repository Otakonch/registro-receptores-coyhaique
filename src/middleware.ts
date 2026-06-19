import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/roles";

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    const { pathname } = req.nextUrl;

    // Rutas exclusivas para administradores (ADMIN o SUPER_ADMIN)
    if (pathname.startsWith("/admin") && !hasAdminAccess(token?.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Solo pasa el middleware si hay sesión activa
      authorized({ token }) {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Proteger archivos subidos — cédulas, estatutos, etc. no deben ser públicos
    "/uploads/:path*",
    // Rutas de aplicación protegidas
    "/dashboard/:path*",
    "/inscripcion/:path*",
    "/admin/:path*",
  ],
};
