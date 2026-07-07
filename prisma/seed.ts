// Script para crear el primer usuario administrador
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";
import { buildDatabaseUrl } from "../src/lib/pg-config";

const prisma = new PrismaClient({
  datasources: {
    db: { url: buildDatabaseUrl() },
  },
});

async function main() {
  console.log("🌱 Creando usuario administrador...");

  const hashedPassword = await bcrypt.hash("Admin1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@municipalidadcoyhaique.cl" },
    update: { emailVerified: new Date() },
    create: {
      email: "admin@municipalidadcoyhaique.cl",
      password: hashedPassword,
      name: "Administrador Sistema",
      rut: "00.000.000-0",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Administrador creado:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Contraseña: Admin1234!`);
  console.log("");
  console.log("⚠️  IMPORTANTE: Cambia la contraseña del administrador después del primer acceso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
