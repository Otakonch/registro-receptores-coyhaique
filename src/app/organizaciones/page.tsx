"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Building2, Download, ChevronLeft, ChevronRight, Calendar, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";

// Los valores deben coincidir exactamente con ORGANIZATION_TYPES en src/lib/utils.ts
// para que el filtro funcione correctamente con los datos guardados en la BD.
const TIPOS = [
  { value: "", label: "Todos los tipos" },
  { value: "Club Deportivo", label: "Club Deportivo" },
  { value: "Club Social y Deportivo", label: "Club Social y Deportivo" },
  { value: "Junta de Vecinos", label: "Junta de Vecinos" },
  { value: "Corporación", label: "Corporación" },
  { value: "Fundación", label: "Fundación" },
  { value: "Asociación Gremial", label: "Asoc. Gremial" },
  { value: "Agrupación Cultural", label: "Agrup. Cultural" },
  { value: "Centro de Padres y Apoderados", label: "Centro de Padres" },
  { value: "Organización Comunitaria", label: "Org. Comunitaria" },
  { value: "Centro de Madres", label: "Centro de Madres" },
  { value: "Otra", label: "Otra" },
];

export default function OrganizacionesPage() {
  const { data: session } = useSession();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes((session?.user as any)?.role);
  const userId = (session?.user as any)?.id ?? null;

  const [orgs, setOrgs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (tipo) params.set("tipo", tipo);
      params.set("page", String(page));
      const res = await fetch(`/api/organizaciones?${params}`);
      const data = await res.json();
      setOrgs(data.organizations ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, tipo, page]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => { setSearch(inputValue); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [inputValue]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Encabezado */}
      <div
        className="text-white rounded-xl p-6 sm:p-8 mb-6 text-center"
        style={{ background: "linear-gradient(135deg, #0f3d1a 0%, #1d6b33 100%)" }}
      >
        <Building2 className="h-9 w-9 sm:h-10 sm:w-10 mx-auto mb-2 opacity-80" aria-hidden="true" />
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Organizaciones Inscritas</h1>
        <p className="text-white/80 text-xs sm:text-sm max-w-lg mx-auto">
          Registro público de organizaciones privadas sin fines de lucro certificadas
          por la Municipalidad de Coyhaique según Ley N°19.862
        </p>
        <div className="mt-3 inline-block bg-white/20 rounded-full px-4 py-1 text-sm font-semibold">
          {total} organización{total !== 1 ? "es" : ""} registrada{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5" role="search" aria-label="Filtros de búsqueda">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            placeholder="Buscar por nombre, RUT o comuna..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9"
            aria-label="Buscar organización por nombre, RUT o comuna"
          />
        </div>
        <select
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
          aria-label="Filtrar por tipo de organización"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20" role="status" aria-label="Cargando organizaciones">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" aria-hidden="true" />
        </div>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron organizaciones</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vista desktop: tabla */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Cabecera */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">Organización</div>
              <div className="col-span-2">RUT</div>
              <div className="col-span-3">Representante Legal</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-1">Fecha certif.</div>
              <div className="col-span-1 text-center">PDF</div>
            </div>

            {orgs.map((org, i) => (
              <div
                key={org.id}
                className={`grid grid-cols-12 gap-2 px-5 py-4 items-center text-sm ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                } border-b last:border-0 hover:bg-green-50/40 transition-colors`}
              >
                <div className="col-span-3">
                  <p className="font-medium text-gray-800 leading-tight">{org.name}</p>
                  {org.commune && (
                    <p className="text-xs text-gray-400 mt-0.5">{org.commune}</p>
                  )}
                </div>
                <div className="col-span-2 text-gray-600 font-mono text-xs">{org.rut}</div>
                <div className="col-span-3">
                  {org.legalRep ? (
                    <p className="text-gray-700 text-xs font-medium leading-tight">{org.legalRep.name}</p>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    {org.type?.split(" ").slice(0, 2).join(" ")}
                  </span>
                </div>
                <div className="col-span-1 text-gray-500 text-xs">
                  {org.approvedAt ? formatDate(org.approvedAt) : "—"}
                </div>
                <div className="col-span-1 flex justify-center">
                  {org.registrationId && (
                    isAdmin || (session && userId === org.legalRepId) ? (
                      <a
                        href={`/api/certificado/${org.registrationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Descargar certificado PDF"
                      >
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:bg-primary/10">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    ) : (
                      <span title={session ? "Solo el representante legal puede descargar este certificado" : "Inicia sesión para descargar"}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-300 cursor-not-allowed" disabled>
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vista móvil: tarjetas */}
          <div className="sm:hidden space-y-3">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{org.name}</p>
                    {org.commune && (
                      <p className="text-xs text-gray-400 mt-0.5">{org.commune}</p>
                    )}
                  </div>
                  {org.registrationId && (
                    isAdmin || (session && userId === org.legalRepId) ? (
                      <a
                        href={`/api/certificado/${org.registrationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="flex-shrink-0 text-primary border-primary/30 h-8 px-2">
                          <Download className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" className="flex-shrink-0 text-gray-300 border-gray-200 h-8 px-2 cursor-not-allowed" disabled
                        title={session ? "Solo el representante legal puede descargar" : "Inicia sesión para descargar"}>
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    )
                  )}
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{org.rut}</span>
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                      {org.type?.split(" ").slice(0, 2).join(" ")}
                    </span>
                    {org.approvedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(org.approvedAt)}
                      </span>
                    )}
                  </div>
                  {org.legalRep && (
                    <p className="text-xs text-gray-500">
                      <span className="text-gray-400">Rep.: </span>
                      {org.legalRep.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Página {page} de {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
