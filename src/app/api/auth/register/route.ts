import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { enviarCorreoBienvenida } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  rut: z.string().min(8, "RUT inválido"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Verificar si el email ya existe
    const existingEmail = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Este correo electrónico ya está registrado" },
        { status: 400 }
      );
    }

    // Verificar si el RUT ya existe
    const existingRut = await db.user.findUnique({
      where: { rut: data.rut },
    });

    if (existingRut) {
      return NextResponse.json(
        { error: "Este RUT ya está registrado en el sistema" },
        { status: 400 }
      );
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Crear usuario
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        rut: data.rut,
        phone: data.phone,
        password: hashedPassword,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Enviar correo de bienvenida (sin bloquear la respuesta)
    enviarCorreoBienvenida(user.name!, user.email!).catch((e) =>
      console.error("Error al enviar correo de bienvenida:", e)
    );

    return NextResponse.json(
      { message: "Usuario registrado exitosamente", user },
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
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
