import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET público — lista organizaciones aprobadas
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  try {
    const where: any = {
      registration: {
        status: "APPROVED",
      },
    };

    if (tipo) where.type = tipo;

    const [orgs, total] = await Promise.all([
      db.organization.findMany({
        where,
        include: {
          registration: {
            select: { approvedAt: true, id: true, status: true },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.organization.count({ where }),
    ]);

    // Filtrar por búsqueda de texto (nombre, rut o comuna)
    const filtered = q
      ? orgs.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.rut.toLowerCase().includes(q) ||
            o.commune?.toLowerCase().includes(q)
        )
      : orgs;

    return NextResponse.json({
      organizations: filtered.map((o) => ({
        id: o.id,
        name: o.name,
        rut: o.rut,
        type: o.type,
        commune: o.commune,
        approvedAt: o.registration?.approvedAt ?? null,
        registrationId: o.registration?.id ?? null,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error al obtener organizaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
