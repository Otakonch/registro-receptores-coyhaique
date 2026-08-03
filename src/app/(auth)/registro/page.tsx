"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, UserPlus } from "lucide-react";
import { ClaveUnicaButton } from "@/components/claveunica-button";
import { getPostLoginPath } from "@/lib/post-login-path";

function RegisterForm() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [form, setForm] = useState({ email: "", phone: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && session?.user && !session.user.needsRegistration) {
      router.replace(
        getPostLoginPath({
          needsRegistration: false,
          role: session.user.role,
        })
      );
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrar usuario");
        setLoading(false);
        return;
      }

      await update({ registered: true });
      setSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
    } catch {
      setError("Ocurrió un error. Inténtalo nuevamente.");
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session?.user?.needsRegistration) {
    return null;
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Cuenta creada!</h2>
            <p className="text-gray-500">
              Redirigiendo a tu panel de inscripción...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { name, rut } = session.user;

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <Card className="w-full max-w-lg shadow-md">
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
          <CardTitle className="text-xl">Completar Registro</CardTitle>
          <CardDescription>
            Identidad verificada con ClaveÚnica — completa tus datos de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={name ?? ""} readOnly disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400">Verificado con ClaveÚnica</p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rut">RUT</Label>
                <Input id="rut" value={rut ?? ""} readOnly disabled className="bg-gray-50" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@ejemplo.cl"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-400">
                  Podrás modificarlo después desde tu panel.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Cuenta
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Inicia sesión con ClaveÚnica
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegisterUnauthenticated() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Registro en el sistema</CardTitle>
          <CardDescription>
            Primero debes autenticarte con ClaveÚnica para completar tu registro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClaveUnicaButton callbackUrl="/api/auth/post-login" />
        </CardContent>
      </Card>
    </div>
  );
}

function RegisterPageContent() {
  const { status } = useSession();

  if (status === "unauthenticated") {
    return <RegisterUnauthenticated />;
  }

  return <RegisterForm />;
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
