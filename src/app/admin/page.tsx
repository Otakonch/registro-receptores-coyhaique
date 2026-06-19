"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { VigenciasBanner } from "@/components/vigencias-banner";
import {
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileDown,
  FileText,
  Search,
  XCircle,
  Download,
  Trash2,
  ScrollText,
  ShieldCheck,
  ShieldX,
  Pencil,
  Users,
  ShieldAlert,
  User,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { hasAdminAccess, isSuperAdmin } from "@/lib/roles";

const STATUS_FILTERS = [
  { key: "",         label: "Todas"       },
  { key: "PENDING",  label: "En revisión" },
  { key: "APPROVED", label: "Aprobadas"   },
  { key: "REJECTED", label: "Rechazadas"  },
  { key: "DRAFT",    label: "Borradores"  },
  { key: "LOG",      label: "LOG"         },
  { key: "USUARIOS", label: "Usuarios"    },
];

const PAGE_SIZES = [20, 50, 100, 500, 1000];

// Etiquetas e íconos por tipo de acción del log
const ACTION_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  APROBADA:   { label: "Aprobada",   color: "text-green-700 bg-green-50 border-green-200", Icon: ShieldCheck },
  RECHAZADA:  { label: "Rechazada",  color: "text-red-700 bg-red-50 border-red-200",       Icon: ShieldX    },
  ELIMINADA:  { label: "Eliminada",  color: "text-gray-700 bg-gray-100 border-gray-300",   Icon: Trash2     },
  MODIFICADA: { label: "Modificada", color: "text-blue-700 bg-blue-50 border-blue-200",    Icon: Pencil     },
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT:    "Borrador",
  PENDING:  "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [statusFilter, setStatusFilter]   = useState("PENDING");
  const [search, setSearch]               = useState("");

  // Paginación
  const [pageSize, setPageSize]       = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal]             = useState(0);

  // Conteos reales (fetch sin filtro de estado)
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Estado para la pestaña LOG
  const [logs, setLogs]               = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Estado para la pestaña USUARIOS
  const [users, setUsers]               = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [roleError, setRoleError]       = useState<string>("");

  // Estado para confirmar eliminación de inscripción
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError]     = useState<string>("");

  // USUARIOS — paginación y búsqueda
  const [usersTotal, setUsersTotal]     = useState(0);
  const [userPage, setUserPage]         = useState(1);
  const [userPageSize, setUserPageSize] = useState(20);
  const [userSearch, setUserSearch]     = useState("");
  // USUARIOS — modales
  const [createUserOpen, setCreateUserOpen]       = useState(false);
  const [modifyUser, setModifyUser]               = useState<any>(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId]       = useState<string | null>(null);
  const [userActionError, setUserActionError]     = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);
  // Formularios de los modales
  const [createForm, setCreateForm] = useState({ name: "", email: "", rut: "", phone: "", password: "", role: "USER" });
  const [modifyForm, setModifyForm] = useState({ name: "", email: "", rut: "", phone: "", role: "USER", organizationId: "" });
  // Organizaciones para el dropdown de reasignación
  const [allOrgs, setAllOrgs] = useState<any[]>([]);

  const role    = (session?.user as any)?.role;
  const isAdmin = hasAdminAccess(role);
  const isSA    = isSuperAdmin(role);

  // Carga inicial y cuando cambia el filtro de estado
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "authenticated" && isAdmin) {
      fetchCounts();
      if (statusFilter === "LOG") {
        fetchLogs();
      } else if (statusFilter === "USUARIOS") {
        fetchUsers();
        fetchAllOrgs();
      } else {
        fetchData(currentPage, pageSize);
      }
    }
  }, [status, isAdmin, statusFilter]);

  // Re-cargar USUARIOS al cambiar búsqueda, página o tamaño de página
  useEffect(() => {
    if (status === "authenticated" && isAdmin && statusFilter === "USUARIOS") {
      fetchUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage, userPageSize, userSearch]);

  // Re-cargar al cambiar página o cantidad por página
  useEffect(() => {
    if (status === "authenticated" && isAdmin &&
        statusFilter !== "LOG" && statusFilter !== "USUARIOS") {
      fetchData(currentPage, pageSize);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  // Obtiene conteos totales por estado (fetch sin filtro, limit pequeño solo para contar)
  async function fetchCounts() {
    try {
      const res  = await fetch("/api/inscripciones?limit=1000");
      const data = await res.json();
      const all: any[] = data.registrations || [];
      const c = all.reduce((acc: Record<string, number>, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
      setCounts(c);
    } catch {}
  }

  async function fetchData(page = 1, limit = pageSize) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      params.append("page",  String(page));
      params.append("limit", String(limit));
      const res  = await fetch(`/api/inscripciones?${params.toString()}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
      setTotal(data.total ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set("q", userSearch);
      params.set("page",  String(userPage));
      params.set("limit", String(userPageSize));
      const res  = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
      setUsersTotal(data.total ?? 0);
    } catch {
    } finally {
      setUsersLoading(false);
    }
  }

  async function fetchAllOrgs() {
    try {
      const res  = await fetch("/api/admin/orgs");
      const data = await res.json();
      setAllOrgs(data.orgs || []);
    } catch {}
  }

  async function handleCreateUser(formData: typeof createForm) {
    setUserActionLoading(true);
    setUserActionError("");
    try {
      const res = await fetch("/api/admin/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      if (res.ok) {
        setCreateUserOpen(false);
        fetchUsers();
      } else {
        const d = await res.json();
        setUserActionError(d.error || "Error al crear usuario");
      }
    } catch {
      setUserActionError("Error de conexión");
    } finally {
      setUserActionLoading(false);
    }
  }

  async function handleModifyUser(userId: string, data: Record<string, unknown>) {
    setUserActionLoading(true);
    setUserActionError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      if (res.ok) {
        setModifyUser(null);
        fetchUsers();
      } else {
        const d = await res.json();
        setUserActionError(d.error || "Error al modificar usuario");
      }
    } catch {
      setUserActionError("Error de conexión");
    } finally {
      setUserActionLoading(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    setDeletingUserId(userId);
    setUserActionError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteUserConfirm(null);
        fetchUsers();
      } else {
        const d = await res.json();
        setUserActionError(d.error || "Error al eliminar usuario");
      }
    } catch {
      setUserActionError("Error de conexión");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: "USER" | "ADMIN") {
    setRoleChanging(userId);
    setRoleError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        const data = await res.json();
        setRoleError(data.error || "Error al cambiar el rol");
      }
    } catch {
      setRoleError("Error de conexión");
    } finally {
      setRoleChanging(null);
    }
  }

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const res  = await fetch("/api/admin/logs?limit=200");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
    } finally {
      setLogsLoading(false);
    }
  }

  // Eliminar inscripción — requiere doble confirmación
  async function handleDelete(regId: string) {
    if (deleteConfirm !== regId) {
      setDeleteConfirm(regId);
      setDeleteError("");
      return;
    }
    setDeletingId(regId);
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/inscripciones/${regId}`, { method: "DELETE" });
      if (res.ok) {
        setRegistrations((prev) => prev.filter((r) => r.id !== regId));
        setTotal((t) => Math.max(0, t - 1));
        fetchCounts();
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Error al eliminar");
      }
    } catch {
      setDeleteError("Error de conexión al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  // Exportar a CSV (compatible con Excel — BOM UTF-8 para caracteres en español)
  async function handleExport() {
    // Obtener TODOS los registros del filtro activo (sin paginación)
    let allRegs = registrations;
    if (total > registrations.length) {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.append("status", statusFilter);
        params.append("limit", "10000");
        params.append("page", "1");
        const res  = await fetch(`/api/inscripciones?${params.toString()}`);
        const data = await res.json();
        allRegs = data.registrations || registrations;
      } catch {
        allRegs = registrations;
      }
    }

    // Aplicar búsqueda si hay texto en el buscador
    const toExport = allRegs.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.organization?.name?.toLowerCase().includes(q) ||
        r.organization?.rut?.toLowerCase().includes(q) ||
        r.organization?.legalRep?.name?.toLowerCase().includes(q)
      );
    });

    if (toExport.length === 0) return;

    const headers = [
      "Nombre organización",
      "RUT",
      "Tipo",
      "Comuna",
      "Dirección",
      "Teléfono org.",
      "Correo org.",
      "Registro N°19.862",
      "Banco",
      "Tipo cuenta",
      "N° cuenta",
      "Representante legal",
      "Correo rep.",
      "Teléfono rep.",
      "Estado",
      "Fecha envío",
      "Fecha aprobación",
      "Observaciones",
      "Documentos subidos",
    ];

    const rows = toExport.map((reg: any) => [
      reg.organization?.name            ?? "",
      reg.organization?.rut             ?? "",
      reg.organization?.type            ?? "",
      reg.organization?.commune         ?? "",
      reg.organization?.address         ?? "",
      reg.organization?.phone           ?? "",
      reg.organization?.email           ?? "",
      reg.organization?.registroNacional ?? "",
      reg.organization?.bankName        ?? "",
      reg.organization?.bankAccountType ?? "",
      reg.organization?.bankAccountNumber ?? "",
      reg.organization?.legalRep?.name  ?? "",
      reg.organization?.legalRep?.email ?? "",
      reg.organization?.legalRep?.phone ?? "",
      STATUS_LABELS[reg.status]         ?? reg.status,
      reg.submittedAt ? formatDate(reg.submittedAt) : "",
      reg.approvedAt  ? formatDate(reg.approvedAt)  : "",
      reg.observations ?? "",
      `${reg.documents?.length ?? 0}/7`,
    ]);

    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(";"),
      ...rows.map((r) => r.map(escape).join(";")),
    ].join("\r\n");

    // BOM UTF-8 para que Excel abra correctamente los tildes y ñ
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const label = statusFilter ? (STATUS_LABELS[statusFilter] ?? statusFilter) : "Todas";
    a.href     = url;
    a.download = `inscripciones_${label}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
        <p className="text-gray-500 mt-1">
          Gestión de inscripciones de receptores de fondos públicos
        </p>
      </div>

      {/* Banner de vigencias próximas a vencer */}
      <VigenciasBanner />

      {/* Resumen estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock}       label="En revisión" value={counts["PENDING"]  || 0} color="blue"  />
        <StatCard icon={CheckCircle} label="Aprobadas"   value={counts["APPROVED"] || 0} color="green" />
        <StatCard icon={XCircle}     label="Rechazadas"  value={counts["REJECTED"] || 0} color="red"   />
        <StatCard icon={FileText}    label="Borradores"  value={counts["DRAFT"]    || 0} color="gray"  />
      </div>

      {/* Filtros + buscador + exportar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.filter((f) => f.key !== "USUARIOS" || isSA).map((f) => (
            <Button
              key={f.key}
              variant={statusFilter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSearch("");
                setDeleteConfirm(null);
                setDeleteError("");
                setRoleError("");
                setCurrentPage(1);
                setStatusFilter(f.key);
              }}
              className={(f.key === "LOG" || f.key === "USUARIOS") ? "gap-1.5" : ""}
            >
              {f.key === "LOG"      && <ScrollText className="h-3.5 w-3.5" />}
              {f.key === "USUARIOS" && <Users className="h-3.5 w-3.5" />}
              {f.label}
            </Button>
          ))}
        </div>

        {statusFilter !== "LOG" && statusFilter !== "USUARIOS" && (
          <>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre u organización..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Botón exportar */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={loading || registrations.length === 0}
              className="text-green-700 border-green-300 hover:bg-green-50 gap-1.5"
            >
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
          </>
        )}
      </div>

      {/* ── VISTA LOG ─────────────────────────────────────────────────────── */}
      {statusFilter === "LOG" && (
        logsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ScrollText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay acciones registradas aún</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] ?? {
                label: log.action, color: "text-gray-700 bg-gray-100 border-gray-300", Icon: ScrollText,
              };
              const { Icon } = cfg;
              return (
                <div key={log.id} className="flex items-start gap-3 bg-white border rounded-lg px-4 py-3 text-sm">
                  <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 border ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="font-medium text-gray-800 truncate">{log.orgName}</span>
                      {log.orgRut && <span className="text-gray-400 text-xs">{log.orgRut}</span>}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Por <strong>{log.adminName}</strong> ({log.adminEmail})
                    </p>
                    {log.details && (
                      <p className="text-gray-400 text-xs mt-0.5 italic">"{log.details}"</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── VISTA USUARIOS ────────────────────────────────────────────────── */}
      {statusFilter === "USUARIOS" && (
        <div className="space-y-4">
          {/* Toolbar: búsqueda + botón crear */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Buscar por nombre, correo o RUT…"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                className="pl-9"
              />
            </div>
            {isSA && (
              <Button
                onClick={() => {
                  setCreateForm({ name: "", email: "", rut: "", phone: "", password: "", role: "USER" });
                  setUserActionError("");
                  setCreateUserOpen(true);
                }}
                className="gap-1.5 shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                Crear usuario
              </Button>
            )}
          </div>

          {/* Error global (fuera de modales) */}
          {userActionError && !createUserOpen && !modifyUser && !deleteUserConfirm && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {userActionError}
              <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setUserActionError("")}>✕</button>
            </div>
          )}
          {roleError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {roleError}
              <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setRoleError("")}>✕</button>
            </div>
          )}

          {/* Lista de usuarios */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                {usersTotal} usuario{usersTotal !== 1 ? "s" : ""} encontrado{usersTotal !== 1 ? "s" : ""}.
                {" "}Los cambios de rol quedan registrados en el LOG.
              </p>
              {users.map((u) => {
                const isCurrentUser = u.id === (session?.user as any)?.id;
                const isUserSA      = u.role === "SUPER_ADMIN";
                const isUserAdmin   = u.role === "ADMIN";
                return (
                  <Card key={u.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full flex-shrink-0 ${
                          isUserSA    ? "bg-purple-100 text-purple-700" :
                          isUserAdmin ? "bg-green-100 text-green-700"   :
                                        "bg-gray-100 text-gray-500"
                        }`}>
                          {isUserSA    ? <ShieldCheck className="h-4 w-4" /> :
                           isUserAdmin ? <ShieldAlert className="h-4 w-4" /> :
                                         <User className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {u.name}
                            {isCurrentUser && <span className="ml-2 text-xs text-gray-400">(tú)</span>}
                          </p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                          {u.rut   && <p className="text-xs text-gray-400">RUT: {u.rut}</p>}
                          {u.phone && <p className="text-xs text-gray-400">Tel: {u.phone}</p>}
                          {u.organizations?.[0] && (
                            <p className="text-xs text-gray-400">Org: {u.organizations[0].name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-11 sm:pl-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          isUserSA    ? "bg-purple-50 text-purple-700 border-purple-200" :
                          isUserAdmin ? "bg-green-50 text-green-700 border-green-200"    :
                                        "bg-gray-100 text-gray-600 border-gray-200"
                        }`}>
                          {isUserSA ? "SUPER ADMIN" : isUserAdmin ? "ADMIN" : "USUARIO"}
                        </span>
                        {!isCurrentUser && !isUserSA && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={roleChanging === u.id}
                              onClick={() => handleRoleChange(u.id, isUserAdmin ? "USER" : "ADMIN")}
                              className={isUserAdmin
                                ? "text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                : "text-green-700 border-green-300 hover:bg-green-50 text-xs"
                              }
                            >
                              {roleChanging === u.id ? "…" : isUserAdmin ? "Quitar admin" : "Hacer admin"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs gap-1"
                              onClick={() => {
                                setModifyForm({
                                  name:           u.name  || "",
                                  email:          u.email || "",
                                  rut:            u.rut   || "",
                                  phone:          u.phone || "",
                                  role:           u.role  || "USER",
                                  organizationId: u.organizations?.[0]?.id || "",
                                });
                                setUserActionError("");
                                setModifyUser(u);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                              Modificar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1"
                              onClick={() => { setUserActionError(""); setDeleteUserConfirm(u.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Paginación USUARIOS */}
          {!usersLoading && usersTotal > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Mostrar</span>
                <div className="flex gap-1">
                  {PAGE_SIZES.map((n) => (
                    <button
                      key={n}
                      onClick={() => { setUserPageSize(n); setUserPage(1); }}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        userPageSize === n
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span>por página</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">
                  {((userPage - 1) * userPageSize) + 1}–{Math.min(userPage * userPageSize, usersTotal)} de {usersTotal}
                </span>
                <Button
                  variant="outline" size="sm"
                  disabled={userPage === 1}
                  onClick={() => setUserPage((p) => p - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-gray-600 font-medium text-xs">
                  {userPage} / {Math.ceil(usersTotal / userPageSize)}
                </span>
                <Button
                  variant="outline" size="sm"
                  disabled={userPage >= Math.ceil(usersTotal / userPageSize)}
                  onClick={() => setUserPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Modal: Crear usuario ─────────────────────────────────────── */}
          {createUserOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 text-lg">Crear usuario</h2>
                  <button onClick={() => setCreateUserOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>
                {userActionError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">{userActionError}</div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Nombre completo *</label>
                    <Input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre Apellido" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Correo electrónico *</label>
                    <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.cl" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">RUT</label>
                      <Input value={createForm.rut} onChange={(e) => setCreateForm((f) => ({ ...f, rut: e.target.value }))} placeholder="12.345.678-9" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono</label>
                      <Input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+56 9 …" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Contraseña *</label>
                    <Input type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Rol</label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                      value={createForm.role}
                      onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                    >
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setCreateUserOpen(false)} disabled={userActionLoading}>Cancelar</Button>
                  <Button onClick={() => handleCreateUser(createForm)} disabled={userActionLoading}>
                    {userActionLoading ? "Creando…" : "Crear usuario"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal: Modificar usuario ─────────────────────────────────── */}
          {modifyUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 text-lg">Modificar usuario</h2>
                  <button onClick={() => setModifyUser(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>
                {userActionError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">{userActionError}</div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Nombre completo</label>
                    <Input value={modifyForm.name} onChange={(e) => setModifyForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Correo electrónico</label>
                    <Input type="email" value={modifyForm.email} onChange={(e) => setModifyForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">RUT</label>
                      <Input value={modifyForm.rut} onChange={(e) => setModifyForm((f) => ({ ...f, rut: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono</label>
                      <Input value={modifyForm.phone} onChange={(e) => setModifyForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Rol</label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                      value={modifyForm.role}
                      onChange={(e) => setModifyForm((f) => ({ ...f, role: e.target.value }))}
                    >
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Organización vinculada</label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                      value={modifyForm.organizationId}
                      onChange={(e) => setModifyForm((f) => ({ ...f, organizationId: e.target.value }))}
                    >
                      <option value="">— Sin cambiar —</option>
                      {allOrgs.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}{o.rut ? ` (${o.rut})` : ""}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Al seleccionar una organización, este usuario pasará a ser su representante legal.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setModifyUser(null)} disabled={userActionLoading}>Cancelar</Button>
                  <Button
                    onClick={() => handleModifyUser(modifyUser.id, {
                      name:  modifyForm.name  || undefined,
                      email: modifyForm.email || undefined,
                      rut:   modifyForm.rut,
                      phone: modifyForm.phone,
                      role:  modifyForm.role !== modifyUser.role ? modifyForm.role : undefined,
                      // Solo enviar si el admin eligió una org distinta a la actual
                      organizationId:
                        modifyForm.organizationId &&
                        modifyForm.organizationId !== (modifyUser.organizations?.[0]?.id ?? "")
                          ? modifyForm.organizationId
                          : undefined,
                    })}
                    disabled={userActionLoading}
                  >
                    {userActionLoading ? "Guardando…" : "Guardar cambios"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal: Confirmar eliminar usuario ───────────────────────── */}
          {deleteUserConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h2 className="font-bold text-gray-800 text-lg">Eliminar usuario</h2>
                {userActionError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">{userActionError}</div>
                )}
                <p className="text-sm text-gray-600">
                  ¿Seguro que deseas eliminar a{" "}
                  <strong>{users.find((u) => u.id === deleteUserConfirm)?.name}</strong>?
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setDeleteUserConfirm(null); setUserActionError(""); }}
                    disabled={!!deletingUserId}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteUser(deleteUserConfirm)}
                    disabled={!!deletingUserId}
                  >
                    {deletingUserId ? "Eliminando…" : "Sí, eliminar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VISTA INSCRIPCIONES ────────────────────────────────────────────── */}
      {statusFilter !== "LOG" && statusFilter !== "USUARIOS" && (
        <>
          {deleteError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm mb-4">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {deleteError}
              <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setDeleteError("")}>✕</button>
            </div>
          )}

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
                          <Button variant="outline" size="sm">Revisar</Button>
                        </Link>

                        {reg.status === "APPROVED" && (
                          <a href={`/api/certificado/${reg.id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50">
                              <Download className="h-3.5 w-3.5 mr-1" />
                              PDF
                            </Button>
                          </a>
                        )}

                        {deleteConfirm === reg.id ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === reg.id}
                            onClick={() => handleDelete(reg.id)}
                            className="text-xs px-2"
                          >
                            {deletingId === reg.id ? "Eliminando..." : "¿Confirmar?"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === reg.id}
                            onClick={() => handleDelete(reg.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Controles de paginación ─────────────────────────────────── */}
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Mostrar</span>
                <div className="flex gap-1">
                  {PAGE_SIZES.map((n) => (
                    <button
                      key={n}
                      onClick={() => { setPageSize(n); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        pageSize === n
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span>por página</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">
                  {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, total)} de {total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-gray-600 font-medium text-xs">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color,
}: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:  "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    red:   "text-red-600 bg-red-50",
    gray:  "text-gray-600 bg-gray-100",
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
