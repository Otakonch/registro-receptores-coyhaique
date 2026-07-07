import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { consumeVerificationToken } from "@/lib/verification";
import { enviarCorreoBienvenida } from "@/lib/email";

const schema = z.object({
  token: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`verify-email:${ip}`, 15, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { token } = schema.parse(body);

    const result = await consumeVerificationToken("email-verify", token);
    if (!result) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email: result.email } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (!user.emailVerified) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

      enviarCorreoBienvenida(user.name, user.email).catch((e) =>
        console.error("Error correo bienvenida:", e)
      );
    }

    return NextResponse.json({ message: "Correo verificado correctamente. Ya puedes iniciar sesión." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
