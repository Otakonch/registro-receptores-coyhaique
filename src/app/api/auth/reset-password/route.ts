import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { consumeVerificationToken } from "@/lib/verification";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { token, password } = schema.parse(body);

    const result = await consumeVerificationToken("password-reset", token);
    if (!result) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { email: result.email },
      data: { password: hashed },
    });

    return NextResponse.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
