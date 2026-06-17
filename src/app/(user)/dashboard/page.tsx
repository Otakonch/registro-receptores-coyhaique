"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  Building2,
  FileText,
  Plus,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  Download,
} from "lucide-react";
import { formatDate, DOCUMENT_TYPE_LABELS } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if ((session?.user as any)?.role === "ADMIN") router.push("/admin");
      else fetchData();
    }
  }, [status, session]);

  async function fetchData() {
    try {
      const res = await fetch("/api/inscripciones");
      const json = await res.json();
      setData(json.organization);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleEnviar() {
    if (!data?.registration) return;
    const res = await fetch(
      `/api/inscripciones/${data.registration.id}/estado`,
      { method: "POST" }
    );
    if (res.ok) fetchData();
  }

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Mi Inscripción</h1>
        <p className="text-gray-500 mt-1">
          Bienvenido/a, {session?.user?.name}
        </p>
      </div>

      {/* Sin organización todavía */}
      {!data && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Aún no tienes una organización registrada
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
              Para comenzar la inscripción, completa los datos de tu organización
              y los miembros del directorio.
            </p>
            <Link href="/inscripcion">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Inscribir mi Organización
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Con organización registrada */}
      {data && (
        <div className="space-y-6">
          {/* Estado de la inscripción */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {data.name}
                </CardTitle>
                {data.registration && (
                  <StatusBadge status={data.registration.status} />
                )}
              </div>
              <CardDescription>RUT: {data.rut}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mensajes según estado */}
              {data.registration?.status === "DRAFT" && (
                <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700 text-sm">Inscripción en borrador</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Sube todos los documentos requeridos y luego envía tu solicitud para revisión.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {data.registration?.status === "PENDING" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-700 text-sm">En revisión</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Tu solicitud está siendo revisada por el equipo municipal.
                        Te notificaremos el resultado a tu correo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {data.registration?.status === "APPROVED" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-700 text-sm">¡Inscripción aprobada!</p>
                      <p className="text-sm text-green-600 mt-1">
                        Tu organización está certificada y puede postular a fondos municipales.
                        {data.registration.approvedAt && (
                          <span className="block mt-1">
                            Aprobada el {formatDate(data.registration.approvedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/certificado/${data.registration.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button size="sm" className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white">
                      <Download className="h-4 w-4 mr-1.5" />
                      Descargar Certificado
                    </Button>
                  </a>
                </div>
              )}

              {data.registration?.status === "REJECTED" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-700 text-sm">Inscripción rechazada</p>
                      {data.registration.observations && (
                        <p className="text-sm text-red-600 mt-1">
                          <strong>Observaciones:</strong> {data.registration.observations}
                        </p>
                      )}
                      <p className="text-sm text-red-600 mt-1">
                        Corrige los problemas indicados y vuelve a enviar tu solicitud.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Datos de la organización */}
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Tipo:</span>
                  <span className="ml-2 text-gray-700">{data.type}</span>
                </div>
                <div>
                  <span className="text-gray-400">Comuna:</span>
                  <span className="ml-2 text-gray-700">{data.commune}</span>
                </div>
                <div>
                  <span className="text-gray-400">Correo:</span>
                  <span className="ml-2 text-gray-700">{data.email}</span>
                </div>
                <div>
                  <span className="text-gray-400">Directivos:</span>
                  <span className="ml-2 text-gray-700">{data.members?.length || 0} personas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          {data.registration && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos Requeridos
                </CardTitle>
                <CardDescription>
                  Sube todos los documentos en formato PDF, JPG o PNG (máx. 10 MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => {
                    const doc = data.registration.documents?.find(
                      (d: any) => d.type === type
                    );
                    return (
                      <div
                        key={type}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          {doc ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 leading-tight">{label}</p>
                            {doc && (
                              <p className="text-xs text-gray-400 truncate max-w-[220px]">{doc.fileName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-8 sm:pl-0 flex-shrink-0">
                          {doc && (
                            <a
                              href={doc.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Ver
                            </a>
                          )}
                          {data.registration.status !== "APPROVED" &&
                            data.registration.status !== "PENDING" && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadDoc(file, type, data.registration.id, fetchData);
                                  }}
                                />
                                <Button variant="outline" size="sm" asChild>
                                  <span>
                                    <Upload className="h-3.5 w-3.5 mr-1" />
                                    {doc ? "Reemplazar" : "Subir"}
                                  </span>
                                </Button>
                              </label>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón enviar a revisión */}
                {(data.registration.status === "DRAFT" || data.registration.status === "REJECTED") && (
                  <div className="mt-6 pt-4 border-t">
                    <Button
                      onClick={handleEnviar}
                      className="w-full"
                      size="lg"
                    >
                      Enviar a Revisión
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Asegúrate de haber subido todos los documentos antes de enviar.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Función para subir documentos
async function uploadDoc(
  file: File,
  documentType: string,
  registrationId: string,
  onSuccess: () => void
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("registrationId", registrationId);
  formData.append("documentType", documentType);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      alert(data.error || "Error al subir el archivo");
    }
  } catch {
    alert("Error al subir el archivo. Inténtalo nuevamente.");
  }
}
