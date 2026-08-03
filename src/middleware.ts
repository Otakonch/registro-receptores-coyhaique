import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/roles";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (token?.needsRegistration) {
      if (pathname.startsWith("/dashboard") || pathname.startsWith("/inscripcion") || pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/registro", req.url));
      }
    }

    if (pathname.startsWith("/admin") && !hasAdminAccess(token?.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith("/registro")) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/uploads/:path*",
    "/dashboard/:path*",
    "/inscripcion/:path*",
    "/admin/:path*",
    "/registro",
  ],
};
