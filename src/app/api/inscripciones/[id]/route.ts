import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Obtener inscripción por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const registration = await db.registration.findUnique({
      where: { id: params.id },
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

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === "ADMIN";

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
