import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { hasAdminAccess } from "@/lib/roles";

// GET - Obtener inscripción por ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, response } = await requireAuth(req);
    if (response) return response;

    const registration = await db.registration.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            legalRep: {
              select: { id: true, name: true, email: true, phone: true, rut: true },
            },
            members: true,
          },
        },
        documents: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }

    const userId = user!.id;
    const isAdmin = hasAdminAccess(user!.role);

    // Solo el dueño o un admin puede ver la inscripción
    if (!isAdmin && registration.organization.legalRepId !== userId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    return NextResponse.json({ registration });
  } catch (error) {
    console.error("Error al obtener inscripción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
