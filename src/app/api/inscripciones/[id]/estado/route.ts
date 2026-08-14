import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  enviarCorreoAprobado,
  enviarCorreoRechazado,
  enviarCorreoEnviado,
  enviarCorreoNuevaInscripcionAdmin,
} from "@/lib/email";
import { getAdminNotificationEmails } from "@/lib/admin-users";
import { createAdminLog } from "@/lib/adminLog";

const estadoSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  observations: z.string().optional(),
});

// PATCH - Actualizar estado (solo admin): APPROVED o REJECTED
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, response } = await requireAdmin(req);
    if (response) return response;

    const body = await req.json();
    const { status, observations } = estadoSchema.parse(body);

    const registration = await db.registration.update({
      where: { id },
      data: {
        status,
        observations,
        reviewedAt: new Date(),
        reviewedBy: user!.email,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
      },
      include: {
        organization: {
          include: { legalRep: true },
        },
      },
    });

    await createAdminLog({
      adminId:        user!.id,
      adminName:      user!.name ?? "Admin",
      adminEmail:     user!.email,
      action:         status === "APPROVED" ? "APROBADA" : "RECHAZADA",
      orgName:        registration.organization.name,
      orgRut:         registration.organization.rut,
      registrationId: id,
      details:        observations ?? null,
    });

    const repNombre = registration.organization.legalRep?.name ?? "";
    const repEmail = registration.organization.legalRep?.email ?? "";
    const orgNombre = registration.organization.name;

    let emailNotified = false;
    let emailError: string | null = null;

    if (!repEmail) {
      emailError = "El representante no tiene correo registrado.";
      console.error("No se envió correo de resultado: representante sin email", id);
    } else {
      try {
        if (status === "APPROVED") {
          await enviarCorreoAprobado(repNombre, repEmail, orgNombre, id);
        } else if (status === "REJECTED") {
          await enviarCorreoRechazado(repNombre, repEmail, orgNombre, observations);
        }
        emailNotified = true;
        console.log(`Correo de ${status === "APPROVED" ? "aprobación" : "rechazo"} enviado a ${repEmail}`);
      } catch (e) {
        emailError = e instanceof Error ? e.message : "Error al enviar el correo";
        console.error(
          `Error correo ${status === "APPROVED" ? "aprobación" : "rechazo"} a ${repEmail}:`,
          e
        );
      }
    }

    return NextResponse.json({
      message: `Inscripción ${status === "APPROVED" ? "aprobada" : "rechazada"} exitosamente`,
      registration,
      emailNotified,
      emailError,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, response } = await requireAuth(req);
    if (response) return response;

    const userId = user!.id;

    const registration = await db.registration.findUnique({
      where: { id },
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
        { error: "Solo puedes enviar a revisión inscripciones en borrador o rechazadas" },
        { status: 400 }
      );
    }

    const requiredDocs = [
      "RUT_ORGANIZACION",
      "CERTIFICADO_DIRECTORIO",
      "CERTIFICADO_LEY_19862",
      "CERTIFICADO_VIGENCIA",
      "CEDULAS_DIRECTIVOS",
      "ESTATUTOS",
      "CERTIFICADO_BANCARIO",
    ];
    const uploadedTypes = registration.documents.map((d) => d.type);
    const missing = requiredDocs.filter((t) => !uploadedTypes.includes(t as any));

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Faltan documentos: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await db.registration.update({
      where: { id },
      data: {
        status: "PENDING",
        submittedAt: new Date(),
        observations: null,
      },
      include: {
        organization: { include: { legalRep: true } },
      },
    });

    const rep = updated.organization.legalRep;
    if (rep?.email) {
      try {
        await enviarCorreoEnviado(rep.name, rep.email, updated.organization.name);
        console.log(`Correo de solicitud enviada notificado a ${rep.email}`);
      } catch (e) {
        console.error("Error correo enviado:", e);
      }
    }

    try {
      const adminEmails = await getAdminNotificationEmails();
      if (adminEmails.length > 0) {
        await enviarCorreoNuevaInscripcionAdmin(
          adminEmails,
          updated.organization.name,
          updated.organization.rut,
          rep?.name ?? "Sin nombre",
          id
        );
        console.log(`Aviso de nueva inscripción enviado a ${adminEmails.length} admin(s)`);
      }
    } catch (e) {
      console.error("Error correo aviso admin:", e);
    }

    return NextResponse.json({
      message: "Inscripción enviada a revisión exitosamente",
      registration: updated,
    });
  } catch (error) {
    console.error("Error al enviar a revisión:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
