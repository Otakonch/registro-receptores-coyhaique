import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const registrationId = formData.get("registrationId") as string;
    const documentType = formData.get("documentType") as string;

    if (!file || !registrationId || !documentType) {
      return NextResponse.json(
        { error: "Faltan datos: archivo, registrationId y documentType son requeridos" },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo no puede superar los 10 MB" },
        { status: 400 }
      );
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Solo se permiten archivos PDF, JPG o PNG" },
        { status: 400 }
      );
    }

    // Verificar que la inscripción pertenece al usuario
    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: { organization: true },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }

    if (registration.organization.legalRepId !== userId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Crear directorio de uploads si no existe
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      registrationId
    );
    await mkdir(uploadDir, { recursive: true });

    // Generar nombre único para el archivo
    const ext = path.extname(file.name);
    const fileName = `${documentType}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const publicPath = `/uploads/${registrationId}/${fileName}`;

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Eliminar documento anterior del mismo tipo si existe
    const existing = await db.document.findFirst({
      where: { registrationId, type: documentType as any },
    });

    if (existing) {
      await db.document.delete({ where: { id: existing.id } });
      // Opcionalmente eliminar el archivo físico anterior
    }

    // Guardar referencia en la base de datos
    const document = await db.document.create({
      data: {
        registrationId,
        type: documentType as any,
        fileName: file.name,
        filePath: publicPath,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      message: "Documento subido exitosamente",
      document,
    });
  } catch (error) {
    console.error("Error al subir documento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
