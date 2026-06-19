import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  enviarCorreoAprobado,
  enviarCorreoRechazado,
  enviarCorreoEnviado,
} from "@/lib/email";
import { createAdminLog } from "@/lib/adminLog";
import { hasAdminAccess } from "@/lib/roles";

const estadoSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  observations: z.string().optional(),
});

// PATCH - Actualizar estado (solo admin): APPROVED o REJECTED
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isAdmin = hasAdminAccess((session.user as any).role);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Solo los administradores pueden cambiar el estado" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, observations } = estadoSchema.parse(body);

    const registration = await db.registration.update({
      where: { id: params.id },
      data: {
        status,
        observations,
        reviewedAt: new Date(),
        reviewedBy: session.user.email ?? undefined,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
      },
      include: {
        organization: {
          include: { legalRep: true },
        },
      },
    });

    // Registrar acción en el log de administrador
    await createAdminLog({
      adminId:        (session.user as any).id,
      adminName:      session.user.name  ?? "Admin",
      adminEmail:     session.user.email ?? "",
      action:         status === "APPROVED" ? "APROBADA" : "RECHAZADA",
      orgName:        registration.organization.name,
      orgRut:         registration.organization.rut,
      registrationId: params.id,
      details:        observations ?? null,
    });

    // Enviar correo al representante legal
    const repNombre = registration.organization.legalRep?.name ?? "";
    const repEmail = registration.organization.legalRep?.email ?? "";
    const orgNombre = registration.organization.name;

    if (repEmail) {
      if (status === "APPROVED") {
        enviarCorreoAprobado(repNombre, repEmail, orgNombre, params.id).catch((e) =>
          console.error("Error correo aprobación:", e)
        );
      } else if (status === "REJECTED") {
        enviarCorreoRechazado(repNombre, repEmail, orgNombre, observations).catch((e) =>
          console.error("Error correo rechazo:", e)
        );
      }
    }

    return NextResponse.json({
      message: `Inscripción ${status === "APPROVED" ? "aprobada" : "rechazada"} exitosamente`,
      registration,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error al actualizar estado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Usuario envía a revisión (DRAFT/REJECTED → PENDING)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const registration = await db.registration.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          include: { legalRep: true },
        },
        documents: {
          select: { type: true },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    if (registration.organization.legalRepId !== userId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (registration.status !== "DRAFT" && registration.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Solo puedes enviar inscripciones en borrador o rechazadas" },
        { status: 400 }
      );
    }

    // Verificar que los 7 documentos requeridos estén subidos
    const REQUIRED_DOC_TYPES = [
      "RUT_ORGANIZACION",
      "CERTIFICADO_DIRECTORIO",
      "CERTIFICADO_LEY_19862",
      "CERTIFICADO_VIGENCIA",
      "CEDULAS_DIRECTIVOS",
      "ESTATUTOS",
      "CERTIFICADO_BANCARIO",
    ];
    const uploadedTypes = new Set(registration.documents.map((d: any) => d.type));
    const missingDocs = REQUIRED_DOC_TYPES.filter((t) => !uploadedTypes.has(t));
    if (missingDocs.length > 0) {
      return NextResponse.json(
        {
          error: `Faltan ${missingDocs.length} documento${missingDocs.length !== 1 ? "s" : ""} requerido${missingDocs.length !== 1 ? "s" : ""}. Debes subir todos los documentos antes de enviar a revisión.`,
        },
        { status: 400 }
      );
    }

    const updated = await db.registration.update({
      where: { id: params.id },
      data: {
        status: "PENDING",
        submittedAt: new Date(),
        observations: null,
      },
    });

    // Correo de confirmación de envío
    const repNombre = registration.organization.legalRep?.name ?? "";
    const repEmail = registration.organization.legalRep?.email ?? "";
    const orgNombre = registration.organization.name;

    if (repEmail) {
      enviarCorreoEnviado(repNombre, repEmail, orgNombre).catch((e) =>
        console.error("Error correo envío:", e)
      );
    }

    return NextResponse.json({
      message: "Inscripción enviada a revisión exitosamente",
      registration: updated,
    });
  } catch (error) {
    console.error("Error al enviar inscripción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
