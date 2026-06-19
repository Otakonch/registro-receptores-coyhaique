import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createAdminLog } from "@/lib/adminLog";
import { hasAdminAccess } from "@/lib/roles";
import { rm } from "fs/promises";
import path from "path";

const editSchema = z.object({
  organization: z
    .object({
      name: z.string().min(1).optional(),
      rut: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      address: z.string().min(1).optional(),
      commune: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().nullable(),
      registroNacional: z.string().optional().nullable(),
      bankName: z.string().optional().nullable(),
      bankAccountType: z.string().optional().nullable(),
      bankAccountNumber: z.string().optional().nullable(),
      directorioVigencia: z.string().optional().nullable(),
    })
    .optional(),
  legalRep: z
    .object({
      name: z.string().min(1).optional(),
      rut: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().nullable(),
    })
    .optional(),
  members: z
    .array(
      z.object({
        id: z.string().optional(), // si existe, se actualiza; si no, se crea
        name: z.string().min(1),
        rut: z.string().min(1),
        role: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
      })
    )
    .optional(),
  deletedMemberIds: z.array(z.string()).optional(),
});

// PATCH — Admin edita datos de organización, representante y/o directorio
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasAdminAccess((session.user as any).role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Buscar la inscripción para obtener el organizationId y legalRepId
    const registration = await db.registration.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          include: { legalRep: true, members: true },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    const body = await req.json();
    const data = editSchema.parse(body);

    const orgId = registration.organization.id;
    const legalRepId = registration.organization.legalRepId;

    await db.$transaction(async (tx) => {
      // 1. Actualizar datos de la organización
      if (data.organization) {
        const { directorioVigencia, ...orgFields } = data.organization;
        await tx.organization.update({
          where: { id: orgId },
          data: {
            ...orgFields,
            directorioVigencia: directorioVigencia
              ? new Date(directorioVigencia)
              : directorioVigencia === null
              ? null
              : undefined,
          },
        });
      }

      // 2. Actualizar representante legal
      if (data.legalRep && legalRepId) {
        await tx.user.update({
          where: { id: legalRepId },
          data: data.legalRep,
        });
      }

      // 3. Eliminar miembros marcados para borrar
      if (data.deletedMemberIds?.length) {
        await tx.directoryMember.deleteMany({
          where: {
            id: { in: data.deletedMemberIds },
            organizationId: orgId,
          },
        });
      }

      // 4. Upsert miembros del directorio
      if (data.members) {
        for (const member of data.members) {
          const { id: memberId, ...memberData } = member;
          if (memberId) {
            // Actualizar miembro existente
            await tx.directoryMember.update({
              where: { id: memberId },
              data: memberData,
            });
          } else {
            // Crear nuevo miembro
            await tx.directoryMember.create({
              data: { ...memberData, organizationId: orgId },
            });
          }
        }
      }
    });

    // Devolver la inscripción actualizada
    const updated = await db.registration.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          include: {
            legalRep: { select: { id: true, name: true, email: true, phone: true, rut: true } },
            members: true,
          },
        },
        documents: true,
      },
    });

    // Registrar acción en el log de administrador
    await createAdminLog({
      adminId:        (session.user as any).id,
      adminName:      session.user.name  ?? "Admin",
      adminEmail:     session.user.email ?? "",
      action:         "MODIFICADA",
      orgName:        registration.organization.name,
      orgRut:         registration.organization.rut,
      registrationId: params.id,
      details:        "Datos editados por administrador",
    });

    return NextResponse.json({
      message: "Datos actualizados correctamente",
      registration: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error al editar inscripción:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE — Admin elimina una inscripción completa (organización + documentos + registro)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasAdminAccess((session.user as any).role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Obtener datos antes de eliminar (para el log)
    const registration = await db.registration.findUnique({
      where: { id: params.id },
      include: { organization: true },
    });

    if (!registration) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    const { name: orgName, rut: orgRut } = registration.organization;

    // Eliminar organización (cascade elimina Registration, DirectoryMember y Document)
    await db.organization.delete({
      where: { id: registration.organizationId },
    });

    // Eliminar archivos físicos de la inscripción
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", params.id);
      await rm(uploadsDir, { recursive: true, force: true });
    } catch { /* no es crítico si la carpeta no existía */ }

    // Registrar eliminación en el log
    await createAdminLog({
      adminId:        (session.user as any).id,
      adminName:      session.user.name  ?? "Admin",
      adminEmail:     session.user.email ?? "",
      action:         "ELIMINADA",
      orgName,
      orgRut,
      registrationId: null, // ya no existe
      details:        `Inscripción eliminada por administrador`,
    });

    return NextResponse.json({ message: "Inscripción eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar inscripción:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
