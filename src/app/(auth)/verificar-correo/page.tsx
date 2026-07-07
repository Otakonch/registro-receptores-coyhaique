"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Enlace inválido.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "No se pudo verificar el correo.");
        } else {
          setStatus("ok");
          setMessage(data.message);
          setTimeout(() => router.push("/login"), 3000);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Error de conexión. Inténtalo nuevamente.");
      });
  }, [token, router]);

  return (
    <Card className="w-full max-w-md shadow-md text-center">
      <CardContent className="py-12">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Verificando tu correo...</p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <p className="font-medium text-gray-800">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirigiendo al inicio de sesión...</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
            <p className="text-red-700">{message}</p>
            <Link href="/login" className="text-primary text-sm font-medium hover:underline mt-4 inline-block">
              Ir al inicio de sesión
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
