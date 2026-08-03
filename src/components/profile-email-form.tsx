"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, Mail } from "lucide-react";

interface ProfileEmailFormProps {
  initialEmail?: string | null;
  initialPhone?: string | null;
}

export function ProfileEmailForm({ initialEmail, initialPhone }: ProfileEmailFormProps) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al actualizar");
      } else {
        setSuccess("Datos de contacto actualizados.");
      }
    } catch {
      setError("Ocurrió un error. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Mis datos de contacto
        </CardTitle>
        <CardDescription>
          Puedes actualizar tu correo electrónico y teléfono.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile-email">Correo electrónico</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
