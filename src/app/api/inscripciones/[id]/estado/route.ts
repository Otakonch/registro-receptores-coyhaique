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

    const isAdmin = (session.user as any).role === "ADMIN";
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
