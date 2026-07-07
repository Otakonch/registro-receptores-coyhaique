/**
 * GET /api/admin/logs
 * Devuelve el historial de acciones de administrador, ordenado del más reciente al más antiguo.
 * Solo accesible por admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

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
