"use client";

import { useState, useEffect } from "react";
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
import { formatRut, validateRut, validateRutBody, validateEmail, calculateDv, ORGANIZATION_TYPES, DIRECTORY_ROLES } from "@/lib/utils";

interface Member {
  name: string;
  rut: string;
  role: string;
  email: string;
  phone: string;
  address: string;
}

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const raw = typeof value === "string" ? value : value.toISOString();
  return raw.slice(0, 10);
}

export default function InscripcionPage() {
  const { status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  // Errores de campo individuales
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});
  const [memberErrors, setMemberErrors] = useState<Record<string, string>[]>([{}]);

  const defaultOrg = { name: "", rut: "", type: "", address: "", commune: "", phone: "", email: "", registroNacional: "", bankName: "", bankAccountType: "", bankAccountNumber: "", directorioVigencia: "" };
  const defaultMembers: Member[] = [{ name: "", rut: "", role: "Presidente/a", email: "", phone: "", address: "" }];

  // Datos de la organización
  const [org, setOrg] = useState(defaultOrg);

  // Miembros del directorio
  const [members, setMembers] = useState<Member[]>(defaultMembers);

  // ── Persistencia automática en localStorage ───────────────────────────────
  // Permite que el usuario cierre el navegador y regrese sin perder datos.
  // localStorage persiste entre sesiones (a diferencia de sessionStorage).
  //
  // IMPORTANTE: usamos el flag isInitialized para evitar una condición de
  // carrera. Sin él, los effects de "guardar" correrían en el primer render
  // con los valores por defecto y sobrescribirían el borrador guardado antes
  // de que el effect de "restaurar" tuviera tiempo de aplicar los datos.
  // Con el flag, los effects de guardar ignoran la primera ejecución.
  const [isInitialized, setIsInitialized] = useState(false);

  // Carga inscripción existente (rechazada/borrador) o restaura borrador local
  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/inscripciones");
        const data = await res.json();
        const existing = data.organization;
        const regStatus = existing?.registration?.status as string | undefined;

        if (existing && (regStatus === "PENDING" || regStatus === "APPROVED")) {
          router.replace("/dashboard");
          return;
        }

        if (existing && (regStatus === "DRAFT" || regStatus === "REJECTED") && existing.registration?.id) {
          if (cancelled) return;
          setEditMode(true);
          setRegistrationId(existing.registration.id);
          setOrg({
            name: existing.name ?? "",
            rut: existing.rut ?? "",
            type: existing.type ?? "",
            address: existing.address ?? "",
            commune: existing.commune ?? "",
            phone: existing.phone ?? "",
            email: existing.email ?? "",
            registroNacional: existing.registroNacional ?? "",
            bankName: existing.bankName ?? "",
            bankAccountType: existing.bankAccountType ?? "",
            bankAccountNumber: existing.bankAccountNumber ?? "",
            directorioVigencia: toDateInput(existing.directorioVigencia),
          });
          const loadedMembers: Member[] =
            existing.members?.length > 0
              ? existing.members.map((m: Member) => ({
                  name: m.name ?? "",
                  rut: m.rut ?? "",
                  role: m.role ?? "",
                  email: m.email ?? "",
                  phone: m.phone ?? "",
                  address: m.address ?? "",
                }))
              : defaultMembers;
          setMembers(loadedMembers);
          setMemberErrors(loadedMembers.map(() => ({})));
          setIsInitialized(true);
          return;
        }
      } catch {
        // Si falla la carga, se intenta el borrador local
      }

      if (cancelled) return;
      try {
        const savedOrg = localStorage.getItem("inscripcion_org");
        const savedMembers = localStorage.getItem("inscripcion_members");
        const savedStep = localStorage.getItem("inscripcion_step");
        if (savedOrg) setOrg(JSON.parse(savedOrg));
        if (savedMembers) setMembers(JSON.parse(savedMembers));
        if (savedStep) setStep(Number(savedStep));
      } catch {}
      setIsInitialized(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  // Guardar datos en localStorage cuando cambien (solo después de la restauración inicial)
  useEffect(() => {
    if (!isInitialized || editMode) return;
    try {
      localStorage.setItem("inscripcion_org", JSON.stringify(org));
    } catch {}
  }, [org, isInitialized, editMode]);

  useEffect(() => {
    if (!isInitialized || editMode) return;
    try {
      localStorage.setItem("inscripcion_members", JSON.stringify(members));
    } catch {}
  }, [members, isInitialized, editMode]);

  useEffect(() => {
    if (!isInitialized || editMode) return;
    try {
      localStorage.setItem("inscripcion_step", String(step));
    } catch {}
  }, [step, isInitialized, editMode]);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Formatea solo el cuerpo del RUT con puntos
  function formatRutBody(digits: string): string {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Extrae el cuerpo del RUT (sin DV) desde el valor almacenado
  function getRutBody(rut: string): string {
    return rut.includes("-") ? rut.split("-")[0] : rut;
  }

  // Extrae el DV desde el valor almacenado
  function getRutDv(rut: string): string {
    return rut.includes("-") ? rut.split("-")[1] : "";
  }

  // Calcula el error del cuerpo del RUT
  function getRutBodyError(digits: string): string {
    if (!digits) return "";
    if (digits.length < 6) return "RUT demasiado corto (mínimo 6 dígitos)";
    if (digits.length > 9) return "RUT demasiado largo (máximo 9 dígitos)";
    return "";
  }

  // Valida RUT completo: longitud correcta + DV coincide con Módulo 11
  function isRutValid(rut: string): boolean {
    const body = getRutBody(rut).replace(/[^0-9]/g, "");
    const dv = getRutDv(rut).toUpperCase();
    if (!body || !dv) return false;
    if (!validateRutBody(body)) return false;
    return calculateDv(body) === dv;
  }

  // Maneja cambio en el campo DV de la organización (editable por usuario)
  function handleOrgRutDvChange(value: string) {
    const dv = value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 1);
    const body = getRutBody(org.rut);
    const bodyDigits = body.replace(/[^0-9]/g, "");
    const newRut = dv ? `${body}-${dv}` : body;
    setOrg((p) => ({ ...p, rut: newRut }));
    if (dv && bodyDigits.length >= 6) {
      const expected = calculateDv(bodyDigits);
      setOrgErrors((e) => ({
        ...e,
        rut: dv !== expected ? `Dígito verificador incorrecto (el correcto es ${expected})` : "",
      }));
    }
  }

  // Maneja cambio en el campo DV de un miembro (editable por usuario)
  function handleMemberRutDvChange(index: number, value: string) {
    const dv = value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 1);
    const body = getRutBody(members[index].rut);
    const bodyDigits = body.replace(/[^0-9]/g, "");
    const newRut = dv ? `${body}-${dv}` : body;
    setMembers((prev) => prev.map((m, i) => i === index ? { ...m, rut: newRut } : m));
    if (dv && bodyDigits.length >= 6) {
      const expected = calculateDv(bodyDigits);
      setMemberErrors((prev) => {
        const next = [...prev];
        if (!next[index]) next[index] = {};
        next[index] = { ...next[index], rut: dv !== expected ? `Dígito verificador incorrecto (el correcto es ${expected})` : "" };
        return next;
      });
    }
  }

  // Maneja cambio en el campo cuerpo del RUT (organización)
  function handleOrgRutBodyChange(value: string) {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 9);
    const body = formatRutBody(digits);
    const currentDv = getRutDv(org.rut);
    const fullRut = currentDv ? `${body}-${currentDv}` : body;
    setOrg((p) => ({ ...p, rut: fullRut }));
    // Revalida si ya hay DV ingresado
    if (currentDv && digits.length >= 6) {
      const expected = calculateDv(digits);
      setOrgErrors((e) => ({ ...e, rut: currentDv !== expected ? `Dígito verificador incorrecto (el correcto es ${expected})` : "" }));
    } else {
      setOrgErrors((e) => ({ ...e, rut: getRutBodyError(digits) }));
    }
  }

  // Maneja cambio en campo cuerpo del RUT (miembro)
  function handleMemberRutBodyChange(index: number, value: string) {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 9);
    const body = formatRutBody(digits);
    const currentDv = getRutDv(members[index].rut);
    const fullRut = currentDv ? `${body}-${currentDv}` : body;
    setMembers((prev) => prev.map((m, i) => i === index ? { ...m, rut: fullRut } : m));
    const error = currentDv && digits.length >= 6
      ? (calculateDv(digits) !== currentDv ? `Dígito verificador incorrecto (el correcto es ${calculateDv(digits)})` : "")
      : getRutBodyError(digits);
    setMemberErrors((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = {};
      next[index] = { ...next[index], rut: error };
      return next;
    });
  }

  function handleOrgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === "email") {
      setOrg((p) => ({ ...p, email: value }));
      setOrgErrors((e) => ({ ...e, email: "" }));
    } else {
      setOrg((p) => ({ ...p, [name]: value }));
    }
  }

  function handleOrgBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === "email") {
      if (value && !validateEmail(value)) {
        setOrgErrors((e) => ({ ...e, email: "Correo inválido. Ej: contacto@organizacion.cl" }));
      } else {
        setOrgErrors((e) => ({ ...e, email: "" }));
      }
    }
  }

  function handleMemberChange(
    index: number,
    field: keyof Member,
    value: string
  ) {
    setMembers((prev) => prev.map((m, i) => i !== index ? m : { ...m, [field]: value }));
    setMemberErrors((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = {};
      next[index] = { ...next[index], [field]: "" };
      return next;
    });
  }

  // Valida campo de miembro al perder el foco (blur).
  // El RUT se valida en tiempo real vía handleMemberRutBodyChange/handleMemberRutDvChange.
  function handleMemberBlur(index: number, field: keyof Member, value: string) {
    if (field === "email") {
      const error = value && !validateEmail(value) ? "Correo inválido. Ej: nombre@ejemplo.cl" : "";
      setMemberErrors((prev) => {
        const next = [...prev];
        if (!next[index]) next[index] = {};
        next[index] = { ...next[index], email: error };
        return next;
      });
    }
  }

  function addMember() {
    setMembers((prev) => [
      ...prev,
      { name: "", rut: "", role: "Director/a", email: "", phone: "", address: "" },
    ]);
    setMemberErrors((prev) => [...prev, {}]);
  }

  // Botón "Guardar borrador" — los datos ya se persisten automáticamente en
  // localStorage vía useEffects; aquí solo mostramos confirmación visual.
  function handleGuardar() {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  }

  // Elimina un miembro del directorio (mínimo 1 debe quedar)
  function removeMember(index: number) {
    if (members.length === 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  // Envía la inscripción completa (org + miembros + datos bancarios) a la API.
  // En caso de éxito limpia el borrador de localStorage y redirige al dashboard.
  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        editMode && registrationId
          ? `/api/inscripciones/${registrationId}`
          : "/api/inscripciones",
        {
          method: editMode && registrationId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...org, members }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al guardar la inscripción");
      } else {
        // Limpiar borrador guardado y mostrar pantalla de éxito
        localStorage.removeItem("inscripcion_org");
        localStorage.removeItem("inscripcion_members");
        localStorage.removeItem("inscripcion_step");
        setSubmitted(true);
        setTimeout(() => router.push("/dashboard"), 4000);
      }
    } catch {
      setError("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  // Pantalla de éxito
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce">
          <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          {editMode ? "¡Datos actualizados!" : "¡Datos guardados con éxito!"}
        </h2>
        <p className="text-gray-500 mb-2">
          {editMode
            ? "Los datos de tu organización fueron actualizados correctamente."
            : "Los datos de tu organización fueron registrados correctamente."}
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Ahora debes subir los documentos requeridos desde tu panel. Cuando estén todos listos,
          podrás enviar tu solicitud a revisión. Serás redirigido en unos segundos...
        </p>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-green-500 h-1.5 rounded-full animate-[progress_4s_linear_forwards]" style={{ animation: "width 4s linear forwards", width: "100%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          {editMode ? "Actualizar datos de la organización" : "Inscripción de Organización"}
        </h1>
        <p className="text-gray-500 mt-1">
          {editMode
            ? "Corrige la información de tu organización y directorio. Luego podrás reemplazar documentos y volver a enviar a revisión."
            : "Completa los datos para registrar tu organización"}
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
                <div className="flex items-center gap-2">
                  <Input
                    value={getRutBody(org.rut)}
                    onChange={(e) => handleOrgRutBodyChange(e.target.value)}
                    placeholder="Ej: 12.345.678"
                    maxLength={11}
                    className={orgErrors.rut ? "border-red-400 focus-visible:ring-red-400" : isRutValid(org.rut) ? "border-green-500 focus-visible:ring-green-500" : ""}
                  />
                  <span className="text-gray-500 font-semibold text-lg">-</span>
                  <Input
                    value={getRutDv(org.rut)}
                    onChange={(e) => handleOrgRutDvChange(e.target.value)}
                    placeholder="DV"
                    maxLength={1}
                    className={`w-16 text-center font-mono uppercase ${orgErrors.rut ? "border-red-400 focus-visible:ring-red-400" : isRutValid(org.rut) ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                  />
                </div>
                {orgErrors.rut && <p className="text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{orgErrors.rut}</p>}
                {!orgErrors.rut && isRutValid(org.rut) && <p className="text-xs text-green-600 flex items-center gap-1"><span>✓</span>RUT válido</p>}
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
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
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
                <Label>Teléfono *</Label>
                <Input
                  name="phone"
                  value={org.phone}
                  onChange={handleOrgChange}
                  placeholder="+56 9 1234 5678"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Correo de la organización *</Label>
              <Input
                name="email"
                value={org.email}
                onChange={handleOrgChange}
                onBlur={handleOrgBlur}
                placeholder="contacto@miorganizacion.cl"
                className={orgErrors.email ? "border-red-400 focus-visible:ring-red-400" : org.email && !orgErrors.email && validateEmail(org.email) ? "border-green-500 focus-visible:ring-green-500" : ""}
                required
              />
              {orgErrors.email && <p className="text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{orgErrors.email}</p>}
              {!orgErrors.email && org.email && validateEmail(org.email) && <p className="text-xs text-green-600 flex items-center gap-1"><span>✓</span>Correo válido</p>}
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

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
              <Button variant="outline" onClick={() => router.back()}>
                Volver
              </Button>
              <div className="flex gap-2">
                {!editMode && (
                <Button variant="outline" onClick={handleGuardar} className="text-green-700 border-green-300 hover:bg-green-50">
                  Guardar borrador
                </Button>
                )}
                <Button
                  onClick={() => {
                    if (!org.name || !org.rut || !org.type || !org.address || !org.commune || !org.phone || !org.email) {
                      setError("Completa todos los campos obligatorios (*) antes de continuar.");
                      return;
                    }
                    if (!isRutValid(org.rut)) {
                      setError("El RUT de la organización no es válido.");
                      setOrgErrors((e) => ({ ...e, rut: "RUT inválido" }));
                      return;
                    }
                    if (!validateEmail(org.email)) {
                      setError("El correo electrónico no tiene un formato válido.");
                      setOrgErrors((e) => ({ ...e, email: "Correo inválido" }));
                      return;
                    }
                    setError("");
                    setStep(2);
                  }}
                >
                  Siguiente: Directorio
                </Button>
              </div>
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
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Label htmlFor="directorioVigencia">
                  Vigencia del directorio *
                </Label>
                <Input
                  id="directorioVigencia"
                  type="date"
                  name="directorioVigencia"
                  value={org.directorioVigencia}
                  onChange={handleOrgChange}
                  min={new Date().toISOString().split("T")[0]}
                  className={
                    org.directorioVigencia
                      ? new Date(org.directorioVigencia) < new Date()
                        ? "border-red-400 focus-visible:ring-red-400"
                        : "border-green-500 focus-visible:ring-green-500"
                      : ""
                  }
                  aria-describedby="vigencia-ayuda"
                />
                <p id="vigencia-ayuda" className="text-xs text-gray-400">
                  Fecha de vencimiento que figura en el Certificado de Directorio de Persona Jurídica (vigencia ≤ 60 días desde emisión).
                </p>
                {org.directorioVigencia && new Date(org.directorioVigencia) < new Date() && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <span>⚠</span> Esta fecha ya venció. Debes renovar el certificado de directorio.
                  </p>
                )}
              </div>
            </CardContent>
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
                    <div className="flex items-center gap-2">
                      <Input
                        value={getRutBody(member.rut)}
                        onChange={(e) => handleMemberRutBodyChange(i, e.target.value)}
                        placeholder="Ej: 12.345.678"
                        maxLength={11}
                        className={memberErrors[i]?.rut ? "border-red-400 focus-visible:ring-red-400" : isRutValid(member.rut) ? "border-green-500 focus-visible:ring-green-500" : ""}
                      />
                      <span className="text-gray-500 font-semibold text-lg">-</span>
                      <Input
                        value={getRutDv(member.rut)}
                        onChange={(e) => handleMemberRutDvChange(i, e.target.value)}
                        placeholder="DV"
                        maxLength={1}
                        className={`w-16 text-center font-mono uppercase ${memberErrors[i]?.rut ? "border-red-400 focus-visible:ring-red-400" : isRutValid(member.rut) ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                      />
                    </div>
                    {memberErrors[i]?.rut && <p className="text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{memberErrors[i].rut}</p>}
                    {!memberErrors[i]?.rut && isRutValid(member.rut) && <p className="text-xs text-green-600 flex items-center gap-1"><span>✓</span>RUT válido</p>}
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
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                        {DIRECTORY_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Correo *</Label>
                    <Input
                      value={member.email}
                      onChange={(e) => handleMemberChange(i, "email", e.target.value)}
                      onBlur={(e) => handleMemberBlur(i, "email", e.target.value)}
                      placeholder="correo@ejemplo.cl"
                      className={memberErrors[i]?.email ? "border-red-400 focus-visible:ring-red-400" : member.email && !memberErrors[i]?.email && validateEmail(member.email) ? "border-green-500 focus-visible:ring-green-500" : ""}
                      required
                    />
                    {memberErrors[i]?.email && <p className="text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{memberErrors[i].email}</p>}
                    {!memberErrors[i]?.email && member.email && validateEmail(member.email) && <p className="text-xs text-green-600 flex items-center gap-1"><span>✓</span>Correo válido</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono *</Label>
                    <Input
                      value={member.phone}
                      onChange={(e) => handleMemberChange(i, "phone", e.target.value)}
                      placeholder="+56 9 1234 5678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección *</Label>
                    <Input
                      value={member.address}
                      onChange={(e) => handleMemberChange(i, "address", e.target.value)}
                      placeholder="Calle y número"
                      required
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Volver
            </Button>
            <div className="flex gap-2">
              {!editMode && (
              <Button variant="outline" onClick={handleGuardar} className="text-green-700 border-green-300 hover:bg-green-50">
                Guardar borrador
              </Button>
              )}
              <Button onClick={() => {
                const invalid = members.some(m => !m.name || !m.rut || !m.role || !m.email || !m.phone || !m.address);
                if (invalid) {
                  setError("Completa todos los campos obligatorios de todos los miembros del directorio.");
                  return;
                }
                if (!org.directorioVigencia) {
                  setError("Debes ingresar la fecha de vigencia del directorio.");
                  return;
                }
                setError("");
                setStep(3);
              }}>
                Siguiente: Datos Bancarios
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de guardado */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Borrador guardado. Puedes continuar más tarde.
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
              <Label>Nombre del banco *</Label>
              <Input
                name="bankName"
                value={org.bankName}
                onChange={handleOrgChange}
                placeholder="Banco Estado, BancoChile, etc."
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de cuenta *</Label>
                <Select
                  value={org.bankAccountType}
                  onValueChange={(v) => setOrg((p) => ({ ...p, bankAccountType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                    <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                    <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                    <SelectItem value="Cuenta de Ahorro">Cuenta de Ahorro</SelectItem>
                    <SelectItem value="CuentaRUT">CuentaRUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número de cuenta *</Label>
                <Input
                  name="bankAccountNumber"
                  value={org.bankAccountNumber}
                  onChange={handleOrgChange}
                  placeholder="0000000000"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded p-3">
              <strong>Nota:</strong> También deberás subir un documento bancario
              como respaldo (certificado, captura de pantalla o libreta) en el paso de documentos.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Volver
              </Button>
              <div className="flex gap-2">
                {!editMode && (
                <Button variant="outline" onClick={handleGuardar} className="text-green-700 border-green-300 hover:bg-green-50">
                  Guardar borrador
                </Button>
                )}
                <Button
                  onClick={() => {
                    if (!org.bankName || !org.bankAccountType || !org.bankAccountNumber) {
                      setError("Completa todos los datos bancarios (*) antes de continuar.");
                      return;
                    }
                    setError("");
                    handleSubmit();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    editMode ? "Guardar cambios" : "Guardar y continuar"
                  )}
                </Button>
              </div>
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
