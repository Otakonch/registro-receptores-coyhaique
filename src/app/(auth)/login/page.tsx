"use client";

import { Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { ClaveUnicaButton } from "@/components/claveunica-button";
import { getPostLoginPath } from "@/lib/post-login-path";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace(
        getPostLoginPath({
          needsRegistration: session.user.needsRegistration,
          role: session.user.role,
        })
      );
    }
  }, [status, session, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <img
              src="https://coyhaique.cl/images/logos/logomuni.png"
              alt="Municipalidad de Coyhaique"
              className="h-16 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Registro de Receptores de Fondos Públicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error === "OAuthSignin" || error === "OAuthCallback"
                ? "No fue posible iniciar sesión con ClaveÚnica. Inténtalo nuevamente."
                : "Ocurrió un error al iniciar sesión."}
            </div>
          )}

          <ClaveUnicaButton fullWidth />

          <p className="text-xs text-center text-gray-500">
            Usa tu ClaveÚnica del Estado de Chile para acceder al sistema de forma segura.
          </p>

          <div className="pt-2 text-center text-sm text-gray-500 border-t">
            <p className="mb-1">¿Primera vez en el sistema?</p>
            <p>
              Inicia sesión con ClaveÚnica y completa tu registro si aún no tienes cuenta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
