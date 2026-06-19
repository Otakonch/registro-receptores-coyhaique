import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/verificar?id=<registrationId>
// Público — verifica si un certificado existe y está vigente
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";

  if (!id || id.length < 4) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  try {
    const registration = await db.registration.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            name: true,
            rut: true,
            type: true,
            commune: true,
          },
        },
      },
    });

    if (!registration || registration.status !== "APPROVED") {
      return NextResponse.json(
        { valid: false, message: "Certificado no encontrado o no vigente" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      organization: {
        name: registration.organization.name,
        rut: registration.organization.rut,
        type: registration.organization.type,
        commune: registration.organization.commune,
      },
      approvedAt: registration.approvedAt,
      registrationId: registration.id,
    });
  } catch (error) {
    console.error("Error al verificar certificado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
