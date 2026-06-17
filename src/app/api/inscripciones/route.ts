import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema de validación para la organización
const organizationSchema = z.object({
  // Datos de la organización
  name: z.string().min(3, "Nombre requerido"),
  rut: z.string().min(8, "RUT de la organización requerido"),
  type: z.string().min(1, "Tipo de organización requerido"),
  address: z.string().min(5, "Dirección requerida"),
  commune: z.string().min(2, "Comuna requerida"),
  phone: z.string().optional(),
  email: z.string().email("Correo de la organización inválido"),
  registroNacional: z.string().optional(),

  // Datos bancarios
  bankName: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankAccountNumber: z.string().optional(),

  // Miembros del directorio
  members: z.array(
    z.object({
      name: z.string().min(3),
      rut: z.string().min(8),
      role: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
  ).min(1, "Debe agregar al menos un miembro del directorio"),
});

// GET - Obtener inscripción del usuario actual
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === "ADMIN";

    // Si es admin, puede ver todas las inscripciones
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

    // Si es usuario normal, ve solo su inscripción
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

// POST - Crear nueva organización e inscripción
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Verificar si ya tiene una organización registrada
    const existing = await db.organization.findFirst({
      where: { legalRepId: userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes una organización registrada" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = organizationSchema.parse(body);

    // Verificar si el RUT de la organización ya existe
    const existingRut = await db.organization.findUnique({
      where: { rut: data.rut },
    });

    if (existingRut) {
      return NextResponse.json(
        { error: "El RUT de esta organización ya está registrado" },
        { status: 400 }
      );
    }

    // Crear organización con miembros y registro en una transacción
    const result = await db.$transaction(async (tx) => {
      // 1. Crear la organización
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
          legalRepId: userId,
        },
      });

      // 2. Crear los miembros del directorio
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

      // 3. Crear la inscripción en estado DRAFT
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
