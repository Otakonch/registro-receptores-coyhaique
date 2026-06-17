"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  FileText,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { formatDate, DOCUMENT_TYPE_LABELS } from "@/lib/utils";

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

  const isAdmin = (session?.user as any)?.role === "ADMIN";

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
            RUT {org.rut} · Enviada el {formatDate(registration.submittedAt || registration.createdAt)}
          </p>
        </div>
      </div>

      {actionDone && (
        <div className={`p-4 rounded-lg border text-sm font-medium ${
          actionDone === "aprobada"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          ✓ Inscripción {actionDone} exitosamente.
        </div>
      )}

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
            {org.legalRep?.phone && <Row label="Teléfono" value={org.legalRep?.phone} />}
          </CardContent>
        </Card>
      </div>

      {/* Directorio */}
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

      {/* Documentos */}
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
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
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
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleAction("APPROVED")}
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
                    alert("Debes ingresar observaciones para rechazar la inscripción.");
                    return;
                  }
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

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 min-w-[100px]">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
