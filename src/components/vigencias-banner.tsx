"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VigenciaItem {
  id: string;
  name: string;
  rut: string;
  type: string;
  commune: string;
  email: string;
  phone?: string | null;
  directorioVigencia: string;
  diasRestantes: number;
  registration: { id: string };
  legalRep: { name: string; email: string; phone?: string | null };
}

function getBadge(dias: number) {
  if (dias < 0)
    return { label: "Vencido", className: "bg-red-100 text-red-700 border border-red-300" };
  if (dias <= 15)
    return { label: `Vence en ${dias} día${dias === 1 ? "" : "s"}`, className: "bg-orange-100 text-orange-700 border border-orange-300" };
  return { label: `Vence en ${dias} días`, className: "bg-yellow-100 text-yellow-700 border border-yellow-300" };
}

function getRowBg(dias: number) {
  if (dias < 0) return "bg-red-50 border-red-200";
  if (dias <= 15) return "bg-orange-50 border-orange-200";
  return "bg-yellow-50 border-yellow-200";
}

export function VigenciasBanner() {
  const [vigencias, setVigencias] = useState<VigenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/vigencias")
      .then((r) => r.json())
      .then((data) => {
        setVigencias(data.vigencias ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || vigencias.length === 0) return null;

  const vencidas = vigencias.filter((v) => v.diasRestantes < 0);
  const criticas = vigencias.filter((v) => v.diasRestantes >= 0 && v.diasRestantes <= 15);
  const proximas = vigencias.filter((v) => v.diasRestantes > 15);

  // Mostrar siempre las vencidas y críticas; las próximas solo si está expandido
  const visibles = expanded ? vigencias : [...vencidas, ...criticas];
  const hayMas = proximas.length > 0;

  return (
    <div className="mb-8">
      {/* Encabezado del banner */}
      <div
        className="flex items-center justify-between rounded-t-xl px-4 py-3"
        style={{
          background: vencidas.length > 0
            ? "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)"
            : criticas.length > 0
            ? "linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)"
            : "linear-gradient(135deg, #78350f 0%, #d97706 100%)",
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span className="font-semibold text-sm">
            Vigencias de directorio próximas a vencer
          </span>
          <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">
            {vigencias.length} organización{vigencias.length !== 1 ? "es" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 text-white/80 text-xs">
          {vencidas.length > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {vencidas.length} vencida{vencidas.length !== 1 ? "s" : ""}
            </span>
          )}
          {criticas.length > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {criticas.length} crítica{criticas.length !== 1 ? "s" : ""}
            </span>
          )}
          {proximas.length > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {proximas.length} próxima{proximas.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Lista de organizaciones */}
      <Card className="rounded-t-none border-t-0 shadow-md">
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {visibles.map((v) => {
              const badge = getBadge(v.diasRestantes);
              const rowBg = getRowBg(v.diasRestantes);
              const fechaStr = new Date(v.directorioVigencia).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              });
              return (
                <div
                  key={v.id}
                  className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-4 py-3 border-l-4 ${rowBg}`}
                >
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm truncate">{v.name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      RUT: {v.rut} · {v.type} · {v.commune}
                    </p>
                    <p className="text-xs text-gray-400">
                      Rep.: {v.legalRep.name} — Vigencia: {fechaStr}
                    </p>
                  </div>

                  {/* Contacto */}
                  <div className="flex flex-col gap-1 text-xs flex-shrink-0 sm:text-right">
                    {/* Correo organización */}
                    <a
                      href={`mailto:${v.email}`}
                      className="flex items-center gap-1 text-gray-600 hover:text-primary sm:justify-end"
                      title="Correo de la organización"
                    >
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{v.email}</span>
                    </a>
                    {/* Correo rep. legal (si es distinto) */}
                    {v.legalRep.email !== v.email && (
                      <a
                        href={`mailto:${v.legalRep.email}`}
                        className="flex items-center gap-1 text-gray-500 hover:text-primary sm:justify-end"
                        title={`Correo del representante: ${v.legalRep.name}`}
                      >
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{v.legalRep.email}</span>
                      </a>
                    )}
                    {/* Teléfono rep. legal */}
                    {v.legalRep.phone && (
                      <a
                        href={`tel:${v.legalRep.phone}`}
                        className="flex items-center gap-1 text-gray-500 hover:text-primary sm:justify-end"
                        title={`Teléfono: ${v.legalRep.name}`}
                      >
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{v.legalRep.phone}</span>
                      </a>
                    )}
                    {/* Teléfono de la organización (si es distinto o no tiene el rep.) */}
                    {v.phone && v.phone !== v.legalRep.phone && (
                      <a
                        href={`tel:${v.phone}`}
                        className="flex items-center gap-1 text-gray-500 hover:text-primary sm:justify-end"
                        title="Teléfono de la organización"
                      >
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{v.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón para expandir/colapsar proximas */}
          {hayMas && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  Ver también {proximas.length} organización{proximas.length !== 1 ? "es" : ""} con vencimiento entre 16 y 60 días
                </>
              )}
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
