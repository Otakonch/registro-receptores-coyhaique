import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { hasAdminAccess } from "@/lib/roles";
import { z } from "zod";
import { organizationSchema } from "@/lib/inscripcion-schema";

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

/** El representante puede actualizar datos solo en borrador o rechazada. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, response } = await requireAuth(req);
    if (response) return response;

    const registration = await db.registration.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!registration) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    if (registration.organization.legalRepId !== user!.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (registration.status !== "DRAFT" && registration.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Solo puedes editar los datos si la inscripción está en borrador o fue rechazada." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = organizationSchema.parse(body);

    if (data.rut !== registration.organization.rut) {
      const existingRut = await db.organization.findUnique({ where: { rut: data.rut } });
      if (existingRut) {
        return NextResponse.json(
          { error: "El RUT de esta organización ya está registrado" },
          { status: 400 }
        );
      }
    }

    const orgId = registration.organizationId;

    await db.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: orgId },
        data: {
          name: data.name,
          rut: data.rut,
          type: data.type,
          address: data.address,
          commune: data.commune,
          phone: data.phone,
          email: data.email,
          registroNacional: data.registroNacional,
          bankName: data.bankName,
          bankAccountType: data.bankAccountType,
          bankAccountNumber: data.bankAccountNumber,
          directorioVigencia: data.directorioVigencia
            ? new Date(data.directorioVigencia)
            : undefined,
        },
      });

      await tx.directoryMember.deleteMany({ where: { organizationId: orgId } });
      await tx.directoryMember.createMany({
        data: data.members.map((m) => ({
          organizationId: orgId,
          name: m.name,
          rut: m.rut,
          role: m.role,
          email: m.email,
          phone: m.phone,
          address: m.address,
        })),
      });
    });

    return NextResponse.json({ message: "Datos actualizados correctamente" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error al actualizar inscripción:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
