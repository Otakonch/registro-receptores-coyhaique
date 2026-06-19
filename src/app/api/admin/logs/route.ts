/**
 * GET /api/admin/logs
 * Devuelve el historial de acciones de administrador, ordenado del más reciente al más antiguo.
 * Solo accesible por admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { db }                        from "@/lib/db";
import { hasAdminAccess }            from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasAdminAccess((session.user as any).role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Parámetro opcional: cuántos registros traer (por defecto 200)
    const url    = new URL(req.url);
    const limit  = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

    const logs = await db.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error al obtener logs:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
