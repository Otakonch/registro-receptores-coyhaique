import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId || session.user?.needsRegistration) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, rut: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId || session.user?.needsRegistration) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const email = data.email.toLowerCase().trim();

    const current = await db.user.findUnique({ where: { id: userId } });
    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (email !== current.email) {
      const taken = await db.user.findUnique({ where: { email } });
      if (taken) {
        return NextResponse.json(
          { error: "Este correo electrónico ya está registrado" },
          { status: 400 }
        );
      }
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        email,
        phone: data.phone ?? current.phone,
        emailVerified: new Date(),
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ message: "Datos actualizados", user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("Error al actualizar perfil:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
