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
  CheckCircle,
  Clock,
  FileText,
  Search,
  XCircle,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

const STATUS_FILTERS = [
  { key: "", label: "Todas" },
  { key: "PENDING", label: "En revisión" },
  { key: "APPROVED", label: "Aprobadas" },
  { key: "REJECTED", label: "Rechazadas" },
  { key: "DRAFT", label: "Borradores" },
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "authenticated" && isAdmin) fetchData();
  }, [status, isAdmin, statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/inscripciones?${params.toString()}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
      setTotal(data.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const filtered = registrations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.organization?.name?.toLowerCase().includes(q) ||
      r.organization?.rut?.toLowerCase().includes(q) ||
      r.organization?.legalRep?.name?.toLowerCase().includes(q)
    );
  });

  // Conteos por estado
  const counts = registrations.reduce(
    (acc: Record<string, number>, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
        <p className="text-gray-500 mt-1">
          Gestión de inscripciones de receptores de fondos públicos
        </p>
      </div>

      {/* Resumen estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} label="En revisión" value={counts["PENDING"] || 0} color="blue" />
        <StatCard icon={CheckCircle} label="Aprobadas" value={counts["APPROVED"] || 0} color="green" />
        <StatCard icon={XCircle} label="Rechazadas" value={counts["REJECTED"] || 0} color="red" />
        <StatCard icon={FileText} label="Borradores" value={counts["DRAFT"] || 0} color="gray" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={statusFilter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre u organización..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de inscripciones */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay inscripciones que mostrar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((reg) => (
            <Card key={reg.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                        {reg.organization?.name}
                      </h3>
                      <StatusBadge status={reg.status} />
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 space-y-0.5">
                      <p>RUT: {reg.organization?.rut} · {reg.organization?.type}</p>
                      <p>
                        Rep.: {reg.organization?.legalRep?.name}{" "}
                        <span className="hidden sm:inline">({reg.organization?.legalRep?.email})</span>
                      </p>
                      <p>
                        Docs: {reg.documents?.length || 0}/7 ·
                        Actualizado: {formatDate(reg.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <Link href={`/admin/inscripciones/${reg.id}`}>
                      <Button variant="outline" size="sm">
                        Revisar
                      </Button>
                    </Link>
                    {reg.status === "APPROVED" && (
                      <a
                        href={`/api/certificado/${reg.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50">
                          <Download className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    gray: "text-gray-600 bg-gray-100",
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
