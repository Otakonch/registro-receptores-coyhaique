import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

// GET — Organizaciones aprobadas con directorio próximo a vencer (≤ 60 días) o ya vencido
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    const hoy = new Date();
    const en60dias = new Date();
    en60dias.setDate(hoy.getDate() + 60);

    // Organizaciones con directorioVigencia <= hoy+60 días (incluye ya vencidas)
    const orgs = await db.organization.findMany({
      where: {
        directorioVigencia: {
          lte: en60dias,
        },
        registration: {
          status: "APPROVED",
        },
      },
      select: {
        id: true,
        name: true,
        rut: true,
        type: true,
        commune: true,
        email: true,
        phone: true,
        directorioVigencia: true,
        registration: {
          select: { id: true, status: true },
        },
        legalRep: {
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { directorioVigencia: "asc" },
    });

    // Agregar días restantes a cada registro
    const result = orgs.map((org) => {
      const vigencia = org.directorioVigencia!;
      const diffMs = vigencia.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...org, diasRestantes };
    });

    return NextResponse.json({ vigencias: result, total: result.length });
  } catch (error) {
    console.error("Error al obtener vigencias:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
