import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { hasAdminAccess } from "@/lib/roles";
import { organizationSchema } from "@/lib/inscripcion-schema";

export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAuth(req);
    if (response) return response;

    const userId = user!.id;
    const isAdmin = hasAdminAccess(user!.role);

    if (isAdmin) {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const skip = (page - 1) * limit;

      const where = status ? { status: status as any } : {};

      const [registrations, total] = await Promise.all([
        db.registration.findMany({
          where,
          include: {
            organization: {
              include: {
                legalRep: {
                  select: { name: true, email: true, phone: true },
                },
              },
            },
            documents: true,
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
        }),
        db.registration.count({ where }),
      ]);

      return NextResponse.json({ registrations, total, page, limit });
    }

    const organization = await db.organization.findFirst({
      where: { legalRepId: userId },
      include: {
        registration: {
          include: { documents: true },
        },
        members: true,
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error al obtener inscripción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAuth(req);
    if (response) return response;

    const userId = user!.id;

    const existing = await db.organization.findFirst({ where: { legalRepId: userId } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes una organización registrada" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = organizationSchema.parse(body);

    const existingRut = await db.organization.findUnique({ where: { rut: data.rut } });
    if (existingRut) {
      return NextResponse.json(
        { error: "El RUT de esta organización ya está registrado" },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
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
          directorioVigencia: data.directorioVigencia ? new Date(data.directorioVigencia) : undefined,
          legalRepId: userId,
        },
      });

      await tx.directoryMember.createMany({
        data: data.members.map((m) => ({
          organizationId: organization.id,
          name: m.name,
          rut: m.rut,
          role: m.role,
          email: m.email,
          phone: m.phone,
          address: m.address,
        })),
      });

      const registration = await tx.registration.create({
        data: {
          organizationId: organization.id,
          status: "DRAFT",
        },
      });

      return { organization, registration };
    });

    return NextResponse.json(
      {
        message: "Organización registrada exitosamente",
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error al crear inscripción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
