import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createVerificationToken, buildAuthUrl } from "@/lib/verification";
import { enviarCorreoRecuperacion } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Correo inválido"),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const normalized = email.toLowerCase().trim();

    const user = await db.user.findUnique({ where: { email: normalized } });

    // Respuesta genérica para no revelar si el correo existe
    const okResponse = NextResponse.json({
      message: "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",
    });

    if (!user) return okResponse;

    const { token } = await createVerificationToken("password-reset", normalized);
    const resetUrl = buildAuthUrl("/restablecer-contrasena", token);

    enviarCorreoRecuperacion(user.name, user.email, resetUrl).catch((e) =>
      console.error("Error correo recuperación:", e)
    );

    return okResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
