import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { validateRut } from "@/lib/utils";

const registerSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  phone: z
    .string()
    .trim()
    .min(8, "Teléfono requerido")
    .max(30, "Teléfono demasiado largo"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser?.needsRegistration || !sessionUser.rut || !sessionUser.name) {
    return NextResponse.json(
      { error: "Debes iniciar sesión con ClaveÚnica antes de registrarte" },
      { status: 401 }
    );
  }

  const ip = getClientIp(req);
  if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Por favor espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const email = data.email.toLowerCase().trim();
    const rut = sessionUser.rut;
    const name = sessionUser.name;

    if (!validateRut(rut)) {
      return NextResponse.json({ error: "RUT inválido" }, { status: 400 });
    }

    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Este correo electrónico ya está registrado" },
        { status: 400 }
      );
    }

    const existingRut = await db.user.findUnique({ where: { rut } });
    if (existingRut) {
      return NextResponse.json(
        { error: "Este RUT ya está registrado en el sistema" },
        { status: 400 }
      );
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        rut,
        phone: data.phone,
        role: "USER",
        emailVerified: new Date(),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(
      {
        message: "Cuenta creada correctamente.",
        user,
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
    console.error("Error al registrar usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
