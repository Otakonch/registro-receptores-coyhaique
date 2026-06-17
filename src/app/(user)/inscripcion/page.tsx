"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Building2,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { formatRut, ORGANIZATION_TYPES, DIRECTORY_ROLES } from "@/lib/utils";

interface Member {
  name: string;
  rut: string;
  role: string;
  email: string;
  phone: string;
  address: string;
}

export default function InscripcionPage() {
  const { status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Datos de la organización
  const [org, setOrg] = useState({
    name: "",
    rut: "",
    type: "",
    address: "",
    commune: "",
    phone: "",
    email: "",
    registroNacional: "",
    bankName: "",
    bankAccountType: "",
    bankAccountNumber: "",
  });

  // Miembros del directorio
  const [members, setMembers] = useState<Member[]>([
    { name: "", rut: "", role: "Presidente/a", email: "", phone: "", address: "" },
  ]);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  function handleOrgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === "rut") {
      setOrg((p) => ({ ...p, rut: formatRut(value) }));
    } else {
      setOrg((p) => ({ ...p, [name]: value }));
    }
  }

  function handleMemberChange(
    index: number,
    field: keyof Member,
    value: string
  ) {
    setMembers((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        if (field === "rut") return { ...m, rut: formatRut(value) };
        return { ...m, [field]: value };
      })
    );
  }

  function addMember() {
    setMembers((prev) => [
      ...prev,
      { name: "", rut: "", role: "Director/a", email: "", phone: "", address: "" },
    ]);
  }

  function removeMember(index: number) {
    if (members.length === 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/inscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...org, members }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al guardar la inscripción");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Inscripción de Organización
        </h1>
        <p className="text-gray-500 mt-1">
          Completa los datos para registrar tu organización
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-8">
        <StepIndicator n={1} current={step} label="Datos organización" />
        <div className="flex-1 h-px bg-gray-200" />
        <StepIndicator n={2} current={step} label="Directorio" />
        <div className="flex-1 h-px bg-gray-200" />
        <StepIndicator n={3} current={step} label="Datos bancarios" />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-6">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* PASO 1: Datos de la organización */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de la Organización
            </CardTitle>
            <CardDescription>
              Información general de tu institución
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la organización *</Label>
              <Input
                name="name"
                value={org.name}
                onChange={handleOrgChange}
                placeholder="Club Deportivo Los Andes"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RUT de la organización *</Label>
                <Input
                  name="rut"
                  value={org.rut}
                  onChange={handleOrgChange}
                  placeholder="12.345.678-9"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de organización *</Label>
                <Select
                  value={org.type}
                  onValueChange={(v) => setOrg((p) => ({ ...p, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección *</Label>
              <Input
                name="address"
                value={org.address}
                onChange={handleOrgChange}
                placeholder="Calle Prat 123"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Comuna *</Label>
                <Input
                  name="commune"
                  value={org.commune}
                  onChange={handleOrgChange}
                  placeholder="Coyhaique"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  name="phone"
                  value={org.phone}
                  onChange={handleOrgChange}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Correo de la organización *</Label>
              <Input
                name="email"
                type="email"
                value={org.email}
                onChange={handleOrgChange}
                placeholder="contacto@miorganizacion.cl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>N° Registro Nacional (Ley 19.862)</Label>
              <Input
                name="registroNacional"
                value={org.registroNacional}
                onChange={handleOrgChange}
                placeholder="Número en www.registros19862.cl (si ya lo tienes)"
              />
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={() => {
                  if (!org.name || !org.rut || !org.type || !org.address || !org.commune || !org.email) {
                    setError("Completa todos los campos obligatorios (*) antes de continuar.");
                  } else {
                    setError("");
                    setStep(2);
                  }
                }}
              >
                Siguiente: Directorio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 2: Miembros del directorio */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Miembros del Directorio
              </CardTitle>
              <CardDescription>
                Ingresa los datos de todos los miembros del directorio (mínimo 1)
              </CardDescription>
            </CardHeader>
          </Card>

          {members.map((member, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Miembro {i + 1}
                  </CardTitle>
                  {members.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-600"
                      onClick={() => removeMember(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre completo *</Label>
                    <Input
                      value={member.name}
                      onChange={(e) => handleMemberChange(i, "name", e.target.value)}
                      placeholder="María González"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RUT *</Label>
                    <Input
                      value={member.rut}
                      onChange={(e) => handleMemberChange(i, "rut", e.target.value)}
                      placeholder="12.345.678-9"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo *</Label>
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleMemberChange(i, "role", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIRECTORY_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Correo *</Label>
                    <Input
                      type="email"
                      value={member.email}
                      onChange={(e) => handleMemberChange(i, "email", e.target.value)}
                      placeholder="correo@ejemplo.cl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={member.phone}
                      onChange={(e) => handleMemberChange(i, "phone", e.target.value)}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                      value={member.address}
                      onChange={(e) => handleMemberChange(i, "address", e.target.value)}
                      placeholder="Calle y número"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addMember} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar otro miembro
          </Button>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Volver
            </Button>
            <Button onClick={() => {
              const invalid = members.some(m => !m.name || !m.rut || !m.role || !m.email);
              if (invalid) {
                setError("Completa los campos obligatorios de todos los miembros del directorio.");
              } else {
                setError("");
                setStep(3);
              }
            }}>
              Siguiente: Datos Bancarios
            </Button>
          </div>
        </div>
      )}

      {/* PASO 3: Datos bancarios */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Bancarios</CardTitle>
            <CardDescription>
              Cuenta bancaria de la organización para recibir fondos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del banco</Label>
              <Input
                name="bankName"
                value={org.bankName}
                onChange={handleOrgChange}
                placeholder="Banco Estado, BancoChile, etc."
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de cuenta</Label>
                <Select
                  value={org.bankAccountType}
                  onValueChange={(v) => setOrg((p) => ({ ...p, bankAccountType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                    <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                    <SelectItem value="Cuenta de Ahorro">Cuenta de Ahorro</SelectItem>
                    <SelectItem value="CuentaRUT">CuentaRUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número de cuenta</Label>
                <Input
                  name="bankAccountNumber"
                  value={org.bankAccountNumber}
                  onChange={handleOrgChange}
                  placeholder="0000000000"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded p-3">
              <strong>Nota:</strong> También deberás subir un documento bancario
              como respaldo (certificado, captura de pantalla o libreta) en el paso de documentos.
            </p>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Volver
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  "Guardar y continuar con documentos"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ n, current, label }: { n: number; current: number; label: string }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          done
            ? "bg-green-500 text-white"
            : active
            ? "bg-primary text-white"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        {done ? "✓" : n}
      </div>
      <span className={`text-xs ${active ? "text-primary font-medium" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}
