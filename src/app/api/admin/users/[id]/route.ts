import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createAdminLog } from "@/lib/adminLog";
import { isSuperAdmin } from "@/lib/roles";

const patchSchema = z.object({
  role:           z.enum(["USER", "ADMIN"]).optional(),
  name:           z.string().min(2).optional(),
  email:          z.string().email().optional(),
  rut:            z.string().optional().nullable(),
  phone:          z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (params.id === (session.user as any).id) {
    return NextResponse.json(
      { error: "No puedes modificar tu propio usuario desde aquí" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { role, name, email, rut, phone, organizationId } = parsed.data;

  const target = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // No se puede cambiar el rol de un SUPER_ADMIN
  if (target.role === "SUPER_ADMIN" && role) {
    return NextResponse.json(
      { error: "No se puede modificar el rol de un Super Admin" },
      { status: 400 }
    );
  }

  // Verificar que el nuevo correo no pertenezca a otro usuario
  if (email && email !== target.email) {
    const emailTaken = await db.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json(
        { error: "Ese correo ya está en uso por otro usuario" },
        { status: 409 }
      );
    }
  }

  // Construir sólo los campos que vienen en el body
  const updateData: Record<string, unknown> = {};
  if (name  !== undefined) updateData.name  = name;
  if (email !== undefined) updateData.email = email;
  if (rut   !== undefined) updateData.rut   = rut   || null;
  if (phone !== undefined) updateData.phone = phone || null;
  if (role  !== undefined) updateData.role  = role;

  // Si no hay nada que actualizar en el usuario, saltamos el UPDATE
  const updated = Object.keys(updateData).length > 0
    ? await db.user.update({
        where: { id: params.id },
        data:  updateData,
        select: { id: true, name: true, email: true, rut: true, phone: true, role: true },
      })
    : await db.user.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, email: true, rut: true, phone: true, role: true },
      });

  // Reasignar organización: se actualiza legalRepId en la org seleccionada
  if (organizationId) {
    await db.organization.update({
      where: { id: organizationId },
      data:  { legalRepId: params.id },
    });
  }

  const changes: string[] = [];
  if (name  !== undefined && name  !== target.name)  changes.push(`nombre: ${target.name} → ${name}`);
  if (email !== undefined && email !== target.email) changes.push(`correo: ${target.email} → ${email}`);
  if (role  !== undefined && role  !== target.role)  changes.push(`rol: ${target.role} → ${role}`);
  if (organizationId) changes.push(`org reasignada: ${organizationId}`);

  await createAdminLog({
    adminId:        (session.user as any).id,
    adminName:      session.user.name  ?? "Admin",
    adminEmail:     session.user.email ?? "",
    action:         "MODIFICADA",
    orgName:        target.name,
    orgRut:         null,
    registrationId: null,
    details:        `Usuario modificado. ${changes.join("; ") || "sin cambios relevantes"}`,
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (params.id === (session.user as any).id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta" },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "No se puede eliminar una cuenta Super Admin" },
      { status: 400 }
    );
  }

  await db.user.delete({ where: { id: params.id } });

  await createAdminLog({
    adminId:        (session.user as any).id,
    adminName:      session.user.name  ?? "Admin",
    adminEmail:     session.user.email ?? "",
    action:         "ELIMINADA",
    orgName:        target.name,
    orgRut:         null,
    registrationId: null,
    details:        `Usuario eliminado: ${target.email}`,
  });

  return NextResponse.json({ ok: true });
}
