import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { hasAdminAccess } from "@/lib/roles";

const organizationSchema = z.object({
  name:    z.string().min(3,  "Nombre requerido"),
  rut:     z.string().min(8,  "RUT de la organización requerido"),
  type:    z.string().min(1,  "Tipo de organización requerido"),
  address: z.string().min(5,  "Dirección requerida"),
  commune: z.string().min(2,  "Comuna requerida"),
  phone:   z.string().min(1,  "Teléfono de la organización requerido"),
  email:   z.string().email(  "Correo de la organización inválido"),
  registroNacional:   z.string().optional(),  // opcional por naturaleza ("si ya lo tienes")
  bankName:           z.string().min(1,  "Nombre del banco requerido"),
  bankAccountType:    z.string().min(1,  "Tipo de cuenta requerido"),
  bankAccountNumber:  z.string().min(1,  "Número de cuenta requerido"),
  directorioVigencia: z.string().min(1,  "Fecha de vigencia del directorio requerida"),
  members: z.array(
    z.object({
      name:    z.string().min(3),
      rut:     z.string().min(8),
      role:    z.string().min(1),
      email:   z.string().email(),
      phone:   z.string().min(1,  "Teléfono del miembro requerido"),
      address: z.string().min(1,  "Dirección del miembro requerida"),
    })
  ).min(1, "Debe agregar al menos un miembro del directorio"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const isAdmin = hasAdminAccess((session.user as any).role);

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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

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
