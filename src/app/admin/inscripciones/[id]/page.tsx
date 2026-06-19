"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  ArrowLeft,
  CheckCircle,
  Edit2,
  ExternalLink,
  FileText,
  Plus,
  Save,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { formatDate, DOCUMENT_TYPE_LABELS } from "@/lib/utils";
import { hasAdminAccess } from "@/lib/roles";

// ——— Tipos ———
interface Member {
  id?: string;
  name: string;
  rut: string;
  role: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  _deleted?: boolean;
}

interface OrgEdit {
  name: string;
  rut: string;
  type: string;
  address: string;
  commune: string;
  email: string;
  phone: string;
  registroNacional: string;
  bankName: string;
  bankAccountType: string;
  bankAccountNumber: string;
  directorioVigencia: string;
}

interface RepEdit {
  name: string;
  rut: string;
  email: string;
  phone: string;
}

// ——— Componente principal ———
export default function InscripcionDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionDone, setActionDone] = useState("");
  const [actionError, setActionError] = useState("");

  // — Estado del modo edición —
  const [editing, setEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const [orgEdit, setOrgEdit] = useState<OrgEdit | null>(null);
  const [repEdit, setRepEdit] = useState<RepEdit | null>(null);
  const [membersEdit, setMembersEdit] = useState<Member[]>([]);
  const [deletedMemberIds, setDeletedMemberIds] = useState<string[]>([]);

  const isAdmin = hasAdminAccess((session?.user as any)?.role);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "authenticated" && isAdmin && id) fetchData();
  }, [status, isAdmin, id]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/inscripciones/${id}`);
      const data = await res.json();
      setRegistration(data.registration);
      setObservations(data.registration?.observations || "");
    } catch {
    } finally {
      setLoading(false);
    }
  }

  // Activa el modo edición: copia todos los datos actuales del registro
  // en los estados de edición (orgEdit, repEdit, membersEdit) para que
  // el admin pueda modificarlos sin afectar la vista hasta guardar.
  function startEditing() {
    const org = registration.organization;
    setOrgEdit({
      name: org.name || "",
      rut: org.rut || "",
      type: org.type || "",
      address: org.address || "",
      commune: org.commune || "",
      email: org.email || "",
      phone: org.phone || "",
      registroNacional: org.registroNacional || "",
      bankName: org.bankName || "",
      bankAccountType: org.bankAccountType || "",
      bankAccountNumber: org.bankAccountNumber || "",
      directorioVigencia: org.directorioVigencia
        ? new Date(org.directorioVigencia).toISOString().split("T")[0]
        : "",
    });
    setRepEdit({
      name: org.legalRep?.name || "",
      rut: org.legalRep?.rut || "",
      email: org.legalRep?.email || "",
      phone: org.legalRep?.phone || "",
    });
    setMembersEdit(
      (org.members || []).map((m: any) => ({
        id: m.id,
        name: m.name || "",
        rut: m.rut || "",
        role: m.role || "",
        email: m.email || "",
        phone: m.phone || "",
        address: m.address || "",
      }))
    );
    setDeletedMemberIds([]);
    setEditError("");
    setEditSuccess("");
    setEditing(true);
  }

  // Cancela el modo edición descartando todos los cambios no guardados
  function cancelEditing() {
    setEditing(false);
    setEditError("");
    setEditSuccess("");
  }

  // Agrega un miembro nuevo vacío al final de la lista (el admin lo completará)
  function addMember() {
    setMembersEdit((prev) => [
      ...prev,
      { name: "", rut: "", role: "", email: "", phone: "", address: "" },
    ]);
  }

  // Elimina un miembro de la lista de edición.
  // Si el miembro ya existe en la BD (tiene id), se registra en deletedMemberIds
  // para que la API lo elimine al guardar. Los miembros nuevos (sin id) se descartan directamente.
  function removeMember(index: number) {
    const member = membersEdit[index];
    if (member.id) {
      setDeletedMemberIds((prev) => [...prev, member.id!]);
    }
    setMembersEdit((prev) => prev.filter((_, i) => i !== index));
  }

  // Actualiza un campo específico de un miembro en el estado de edición
  function updateMember(index: number, field: keyof Member, value: string) {
    setMembersEdit((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  // Envía los cambios al endpoint PATCH /api/admin/inscripciones/[id].
  // Actualiza en una sola transacción: organización, representante legal,
  // nuevos miembros, miembros editados y miembros eliminados.
  async function saveEdits() {
    if (!orgEdit || !repEdit) return;
    setEditSaving(true);
    setEditError("");
    setEditSuccess("");
    try {
      const res = await fetch(`/api/admin/inscripciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: {
            ...orgEdit,
            directorioVigencia: orgEdit.directorioVigencia || null,
          },
          legalRep: repEdit,
          members: membersEdit,
          deletedMemberIds,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setEditError(result.error || "Error al guardar los cambios.");
        return;
      }
      // Actualiza el estado local con los datos recién guardados y sale del modo edición
      setRegistration(result.registration);
      setEditSuccess("Datos actualizados correctamente.");
      setEditing(false);
    } catch {
      setEditError("Error de conexión al guardar.");
    } finally {
      setEditSaving(false);
    }
  }

  // Aprueba o rechaza la inscripción mediante PATCH al endpoint de estado.
  // Envía las observaciones del admin y recarga los datos al terminar.
  async function handleAction(newStatus: "APPROVED" | "REJECTED") {
    setSaving(true);
    try {
      const res = await fetch(`/api/inscripciones/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, observations }),
      });
      if (res.ok) {
        setActionDone(newStatus === "APPROVED" ? "aprobada" : "rechazada");
        await fetchData();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Inscripción no encontrada</p>
        <Link href="/admin">
          <Button variant="outline" className="mt-4">Volver al panel</Button>
        </Link>
      </div>
    );
  }

  const org = registration.organization;
  const docs = registration.documents || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">{org.name}</h1>
            <StatusBadge status={registration.status} />
          </div>
          <p className="text-sm text-gray-500">
            RUT {org.rut} · Enviada el{" "}
            {formatDate(registration.submittedAt || registration.createdAt)}
          </p>
        </div>
        {/* Botón Editar / Cancelar */}
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Editar datos
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              disabled={editSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={saveEdits}
              disabled={editSaving}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-1" />
              {editSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        )}
      </div>

      {/* Mensajes de acción/edición */}
      {actionDone && (
        <div
          className={`p-4 rounded-lg border text-sm font-medium ${
            actionDone === "aprobada"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          ✓ Inscripción {actionDone} exitosamente.
        </div>
      )}
      {editSuccess && !editing && (
        <div className="p-4 rounded-lg border bg-green-50 border-green-200 text-green-700 text-sm font-medium">
          ✓ {editSuccess}
        </div>
      )}
      {editError && (
        <div className="p-4 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
          {editError}
        </div>
      )}

      {/* ——— MODO LECTURA ——— */}
      {!editing && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Datos de la organización */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Datos de la Organización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={org.name} />
                <Row label="RUT" value={org.rut} />
                <Row label="Tipo" value={org.type} />
                <Row label="Dirección" value={org.address} />
                <Row label="Comuna" value={org.commune} />
                <Row label="Correo" value={org.email} />
                {org.phone && <Row label="Teléfono" value={org.phone} />}
                {org.registroNacional && (
                  <Row label="Nro. Reg. 19.862" value={org.registroNacional} />
                )}
                {org.directorioVigencia && (
                  <Row
                    label="Vigencia directorio"
                    value={new Date(org.directorioVigencia).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                )}
                {org.bankName && (
                  <>
                    <hr />
                    <Row label="Banco" value={org.bankName} />
                    <Row label="Tipo cuenta" value={org.bankAccountType} />
                    <Row label="N° cuenta" value={org.bankAccountNumber} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Representante legal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Representante Legal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={org.legalRep?.name} />
                <Row label="RUT" value={org.legalRep?.rut} />
                <Row label="Correo" value={org.legalRep?.email} />
                {org.legalRep?.phone && (
                  <Row label="Teléfono" value={org.legalRep?.phone} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Directorio — solo lectura */}
          {org.members?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Directorio ({org.members.length} miembros)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-500 font-medium">Nombre</th>
                        <th className="text-left py-2 text-gray-500 font-medium">RUT</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Cargo</th>
                        <th className="text-left py-2 text-gray-500 font-medium">Correo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org.members.map((m: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2">{m.name}</td>
                          <td className="py-2">{m.rut}</td>
                          <td className="py-2">{m.role}</td>
                          <td className="py-2">{m.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ——— MODO EDICIÓN ——— */}
      {editing && orgEdit && repEdit && (
        <div className="space-y-6">
          {/* Editar organización */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <FileText className="h-4 w-4" /> Datos de la Organización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nombre" value={orgEdit.name} onChange={(v) => setOrgEdit({ ...orgEdit, name: v })} />
                <Field label="RUT" value={orgEdit.rut} onChange={(v) => setOrgEdit({ ...orgEdit, rut: v })} />
                <Field label="Tipo de organización" value={orgEdit.type} onChange={(v) => setOrgEdit({ ...orgEdit, type: v })} />
                <Field label="Dirección" value={orgEdit.address} onChange={(v) => setOrgEdit({ ...orgEdit, address: v })} />
                <Field label="Comuna" value={orgEdit.commune} onChange={(v) => setOrgEdit({ ...orgEdit, commune: v })} />
                <Field label="Correo" value={orgEdit.email} onChange={(v) => setOrgEdit({ ...orgEdit, email: v })} type="email" />
                <Field label="Teléfono" value={orgEdit.phone} onChange={(v) => setOrgEdit({ ...orgEdit, phone: v })} />
                <Field label="N° Registro 19.862" value={orgEdit.registroNacional} onChange={(v) => setOrgEdit({ ...orgEdit, registroNacional: v })} />
                <Field label="Vigencia del directorio" value={orgEdit.directorioVigencia} onChange={(v) => setOrgEdit({ ...orgEdit, directorioVigencia: v })} type="date" />
                <div className="sm:col-span-2">
                  <hr className="my-2" />
                  <p className="text-xs text-gray-400 mb-3">Datos bancarios (opcional)</p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="Banco" value={orgEdit.bankName} onChange={(v) => setOrgEdit({ ...orgEdit, bankName: v })} />
                    <Field label="Tipo de cuenta" value={orgEdit.bankAccountType} onChange={(v) => setOrgEdit({ ...orgEdit, bankAccountType: v })} />
                    <Field label="N° de cuenta" value={orgEdit.bankAccountNumber} onChange={(v) => setOrgEdit({ ...orgEdit, bankAccountNumber: v })} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editar representante */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" /> Representante Legal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nombre" value={repEdit.name} onChange={(v) => setRepEdit({ ...repEdit, name: v })} />
                <Field label="RUT" value={repEdit.rut} onChange={(v) => setRepEdit({ ...repEdit, rut: v })} />
                <Field label="Correo" value={repEdit.email} onChange={(v) => setRepEdit({ ...repEdit, email: v })} type="email" />
                <Field label="Teléfono" value={repEdit.phone} onChange={(v) => setRepEdit({ ...repEdit, phone: v })} />
              </div>
            </CardContent>
          </Card>

          {/* Editar directorio */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <Users className="h-4 w-4" /> Directorio ({membersEdit.length} miembros)
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMember}
                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar miembro
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {membersEdit.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No hay miembros. Usa "Agregar miembro" para añadir uno.
                </p>
              )}
              {membersEdit.map((m, i) => (
                <div
                  key={i}
                  className="border border-blue-100 rounded-lg p-4 bg-white relative"
                >
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                    title="Eliminar miembro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 pr-6">
                    <Field label="Nombre" value={m.name} onChange={(v) => updateMember(i, "name", v)} />
                    <Field label="RUT" value={m.rut} onChange={(v) => updateMember(i, "rut", v)} />
                    <Field label="Cargo" value={m.role} onChange={(v) => updateMember(i, "role", v)} />
                    <Field label="Correo" value={m.email} onChange={(v) => updateMember(i, "email", v)} type="email" />
                    <Field label="Teléfono" value={m.phone || ""} onChange={(v) => updateMember(i, "phone", v)} />
                    <Field label="Dirección" value={m.address || ""} onChange={(v) => updateMember(i, "address", v)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documentos (siempre visible) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documentos ({docs.length} / 7)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => {
              const doc = docs.find((d: any) => d.type === type);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {doc ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-300 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      {doc && (
                        <p className="text-xs text-gray-400">
                          {doc.fileName} · Subido {formatDate(doc.uploadedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  {doc && (
                    <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Ver
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Acción del admin */}
      {registration.status === "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decisión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Observaciones (obligatorio si rechazas)</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Indica las observaciones o correcciones necesarias..."
                rows={4}
              />
            </div>
            {actionError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {actionError}
              </div>
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => { setActionError(""); handleAction("APPROVED"); }}
                disabled={saving}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar Inscripción
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  if (!observations.trim()) {
                    setActionError("Debes ingresar observaciones para rechazar la inscripción.");
                    return;
                  }
                  setActionError("");
                  handleAction("REJECTED");
                }}
                disabled={saving}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ——— Helpers ———

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 min-w-[130px]">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}
