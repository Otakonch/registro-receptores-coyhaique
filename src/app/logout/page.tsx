"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { buildClaveUnicaLogoutUrl } from "@/lib/claveunica-client";

/**
 * Cierre de sesión en dos pasos sin flash de /login:
 * 1) limpia la sesión NextAuth
 * 2) redirige a logout de ClaveÚnica (vuelve a la home configurada)
 */
export default function LogoutPage() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await signOut({ redirect: false });
      } catch {
        // Continuar al logout de ClaveÚnica aunque falle el signOut local
      }
      if (!cancelled) {
        window.location.replace(buildClaveUnicaLogoutUrl());
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3 px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-gray-600">Cerrando sesión...</p>
    </div>
  );
}
