"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Search, ShieldCheck, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

function VerificarContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const verificar = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch(`/api/verificar?id=${encodeURIComponent(id.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setError(data.message ?? "Certificado no encontrado o no vigente.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Error al conectar con el servidor. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-verificar cuando llega ?id= en la URL (desde QR)
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setCode(id);
      verificar(id);
    }
  }, [searchParams, verificar]);

  async function handleVerificar(e: React.FormEvent) {
    e.preventDefault();
    verificar(code);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Encabezado */}
      <div
        className="text-white rounded-xl p-6 sm:p-8 mb-8 text-center"
        style={{ background: "linear-gradient(135deg, #0f3d1a 0%, #1d6b33 100%)" }}
      >
        <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-90" aria-hidden="true" />
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Verificar Certificado</h1>
        <p className="text-white/80 text-sm max-w-md mx-auto">
          Ingresa el código de verificación que aparece en el certificado para
          comprobar su autenticidad.
        </p>
      </div>

      {/* Formulario */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleVerificar} className="space-y-4">
            <div>
              <label htmlFor="codigo-verificacion" className="block text-sm font-medium text-gray-700 mb-1">
                Código de verificación
              </label>
              <Input
                id="codigo-verificacion"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: clxyz123abc456..."
                className="font-mono text-sm"
                autoComplete="off"
                aria-describedby="codigo-ayuda"
              />
              <p id="codigo-ayuda" className="text-xs text-gray-400 mt-1">
                El código aparece en la parte inferior del certificado PDF.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
                  Verificando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Verificar certificado
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultado: VÁLIDO */}
      {result && (
        <Card className="border-green-200 bg-green-50" role="alert" aria-live="polite">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold text-green-800 text-lg">Certificado válido</p>
                <p className="text-sm text-green-700">
                  Este documento es auténtico y está vigente.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-gray-500">Organización</p>
                  <p className="font-semibold text-gray-800">{result.organization.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">RUT</p>
                  <p className="font-mono text-gray-700">{result.organization.rut}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tipo</p>
                  <p className="text-gray-700">{result.organization.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Comuna</p>
                  <p className="text-gray-700">{result.organization.commune ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fecha de certificación</p>
                  <p className="text-gray-700">
                    {result.approvedAt ? formatDate(result.approvedAt) : "—"}
                  </p>
                </div>
              </div>

              <div className="border-t border-green-100 pt-3">
                <p className="text-xs text-gray-400 mt-1">
                  Emitido por la Municipalidad de Coyhaique según Ley N°19.862
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado: INVÁLIDO */}
      {error && (
        <Card className="border-red-200 bg-red-50" role="alert" aria-live="assertive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold text-red-800">Certificado no encontrado</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones */}
      <div className="mt-8 bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-2">¿Cómo encontrar el código?</p>
        <p>
          El código de verificación se encuentra en la sección inferior del certificado PDF,
          bajo el recuadro de datos de la organización. También puede escanear el código QR
          que aparece en la esquina superior derecha del certificado.
        </p>
      </div>
    </div>
  );
}

export default function VerificarPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">Cargando...</div>}>
      <VerificarContent />
    </Suspense>
  );
}
