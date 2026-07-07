import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createVerificationToken, buildAuthUrl } from "@/lib/verification";
import { enviarCorreoVerificacion } from "@/lib/email";

const registerSchema = z.object({
  name:     z.string().min(3,  "El nombre debe tener al menos 3 caracteres"),
  email:    z.string().email(  "Correo electrónico inválido"),
  rut:      z.string().min(8,  "RUT inválido"),
  phone:    z.string().optional(),
  password: z.string().min(8,  "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(req: NextRequest) {
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

    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Este correo electrónico ya está registrado" },
        { status: 400 }
      );
    }

    const existingRut = await db.user.findUnique({ where: { rut: data.rut } });
    if (existingRut) {
      return NextResponse.json(
        { error: "Este RUT ya está registrado en el sistema" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: {
        name:     data.name,
        email,
        rut:      data.rut,
        phone:    data.phone,
        password: hashedPassword,
        role:     "USER",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const { token } = await createVerificationToken("email-verify", email);
    const verifyUrl = buildAuthUrl("/verificar-correo", token);

    enviarCorreoVerificacion(user.name!, user.email!, verifyUrl).catch((e) =>
      console.error("Error correo verificación:", e)
    );

    return NextResponse.json(
      {
        message: "Usuario registrado. Revisa tu correo para verificar la cuenta antes de iniciar sesión.",
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
