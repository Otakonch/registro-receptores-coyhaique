# Registro de Receptores de Fondos Públicos
## Municipalidad de Coyhaique

---

## PASO 1 — Instalar herramientas necesarias

### Node.js
- Descarga desde: https://nodejs.org/
- Elige la versión **LTS** (la recomendada)
- Verifica abriendo CMD y escribiendo: `node --version`

### PostgreSQL
- Descarga desde: https://www.postgresql.org/download/windows/
- Durante la instalación, define una contraseña para el usuario `postgres` — **anótala**
- El puerto por defecto es `5432` — no lo cambies

---

## PASO 2 — Crear la base de datos

1. Abre **pgAdmin** (se instala con PostgreSQL)
2. Conéctate con el usuario `postgres` y la contraseña que definiste
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `registro_coyhaique`
5. Guarda

---

## PASO 3 — Configurar las variables de entorno

1. En la carpeta del proyecto, copia el archivo `.env.example` y renómbralo a `.env.local`
2. Abre `.env.local` y completa **todos** los valores:

```
# Base de datos (PostgreSQL)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=registro_coyhaique
PG_USER=postgres
PG_PASSWORD=TU_CONTRASEÑA

# Autenticación — genera un secreto en: https://generate-secret.vercel.app/32
NEXTAUTH_SECRET="pega_aqui_el_secreto_generado"

# URL del servidor (sin barra final)
# En producción, usa el dominio real: https://registro.coyhaique.cl
NEXTAUTH_URL="http://localhost:3000"

# Correo saliente (SMTP)
# Casilla Outlook sin clave → relay interno municipal
SMTP_HOST=mail.coyhaique.cl
SMTP_PORT=25
SMTP_SECURE=false
SMTP_AUTH=false
SMTP_USER=no-reply@coyhaique.cl
SMTP_PASS=
```

> **`no-reply@coyhaique.cl` sin contraseña:** La casilla es de Outlook, pero el envío no va por `smtp-mail.outlook.com` (eso siempre exige clave). Se usa el **relay SMTP interno** de TI (`mail.coyhaique.cl`, puerto `25`, `SMTP_AUTH=false`). `SMTP_USER` es solo el remitente que verá el destinatario.

> **Si TI indica otro servidor relay**, cambia solo `SMTP_HOST` y `SMTP_PORT`.

> **Outlook con contraseña** (solo si TI lo exige): `SMTP_HOST=smtp.office365.com`, puerto `587`, `SMTP_AUTH=true`, `SMTP_PASS=...`.
### Validar el correo SMTP

Edita las variables SMTP en `.env` y prueba desde terminal:

```bash
npm run smtp:test
npm run smtp:send -- tu@correo.cl
```

---

## PASO 4 — Instalar dependencias y configurar la base de datos

Abre CMD o PowerShell, navega a la carpeta del proyecto y ejecuta en orden:

```bash
# 1. Instalar todas las librerías del proyecto
npm install

# 2. Crear las tablas en la base de datos
npm run db:push

# 3. Crear el usuario administrador principal (SUPER_ADMIN)
npm run db:seed
```

---

## PASO 5 — Iniciar el servidor

**Modo desarrollo:**
```bash
npm run dev
```
Abre tu navegador en: **http://localhost:3000**

**Modo producción** (para servidor real):
```bash
npm run build
npm run start
```

---

## CREDENCIALES INICIALES DEL ADMINISTRADOR

```
Email:      admin@municipalidadcoyhaique.cl
Contraseña: Admin1234!
Rol:        SUPER_ADMIN (administrador del sistema)
```

⚠️ **IMPORTANTE:** Cambia esta contraseña inmediatamente después del primer acceso.

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `USER` | Representante legal. Solo ve su propia inscripción. |
| `ADMIN` | Funcionario municipal. Accede al panel y gestiona inscripciones. |
| `SUPER_ADMIN` | Administrador del sistema. Tiene acceso total, incluyendo gestión de usuarios. |

**Para crear administradores adicionales:**
1. Pide que la persona se registre normalmente en la plataforma
2. Inicia sesión con la cuenta SUPER_ADMIN
3. Ve al Panel Admin → pestaña **Usuarios**
4. Busca a la persona y haz clic en **"Hacer admin"**

Solo el SUPER_ADMIN puede asignar y quitar roles de administrador.

---

## Estructura del proyecto

```
registro-receptores/
├── prisma/
│   ├── schema.prisma       ← Estructura de la base de datos
│   └── seed.ts             ← Crea el primer administrador
├── public/
│   ├── uploads/            ← Documentos subidos por usuarios
│   ├── coyhaique-hero.jpg  ← Imagen principal de la página de inicio
│   └── favicon.png         ← Ícono del sitio
├── src/
│   ├── app/
│   │   ├── (auth)/         ← Páginas de login y registro
│   │   ├── (user)/         ← Dashboard del usuario
│   │   ├── admin/          ← Panel del administrador
│   │   ├── api/            ← Lógica del servidor (backend)
│   │   └── page.tsx        ← Página de inicio
│   ├── components/         ← Componentes reutilizables
│   └── lib/                ← Utilidades y configuración
├── .env.example            ← Plantilla de variables de entorno
├── .env.local              ← TU archivo de configuración (no subir al servidor)
├── INSTRUCCIONES.md        ← Este archivo
├── MIGRAR-BD.bat           ← Script para actualizar la base de datos
└── package.json            ← Dependencias del proyecto
```

---

## Flujo de uso

### Para las organizaciones (usuarios):
1. Se registran en la plataforma con sus datos personales
2. Completan el formulario de inscripción (datos de la organización + directorio)
3. Suben los 7 documentos requeridos en PDF
4. Envían a revisión
5. Reciben notificación por correo con el resultado

### Para el administrador municipal (ADMIN):
1. Inicia sesión y accede al Panel Admin
2. Filtra inscripciones por estado (En revisión, Aprobadas, Rechazadas, etc.)
3. Revisa cada inscripción y sus documentos
4. Aprueba o rechaza con observaciones
5. El sistema envía el correo de notificación automáticamente

---

## Comandos útiles

```bash
npm run dev          # Iniciar en modo desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar en modo producción
npm run db:studio    # Abrir interfaz visual de la BD (útil para depuración)
npm run db:push      # Aplicar cambios al schema de BD (ejecutar MIGRAR-BD.bat es equivalente)
npm run db:seed      # Volver a crear el usuario administrador inicial
```

---

## Preguntas frecuentes

**¿Cómo cambio los colores del sitio?**
- Edita `src/app/globals.css`, la variable `--primary` (en formato HSL)

**¿Cómo cambio el nombre de la municipalidad?**
- Busca "Municipalidad de Coyhaique" en los archivos `.tsx` y reemplaza por el nuevo nombre

**¿Dónde se guardan los documentos subidos?**
- En `public/uploads/{id-inscripcion}/` dentro del proyecto
- ⚠️ Asegúrate de hacer respaldos periódicos de esta carpeta en producción

**¿Qué hacer si el correo no se envía?**
- Verifica los valores SMTP en `.env.local`
- Prueba las credenciales con un cliente de correo externo
- Revisa los logs del servidor para ver el error exacto

**¿Cómo actualizo la base de datos si cambia el schema?**
- Ejecuta `MIGRAR-BD.bat` o corre `npm run db:push` en la terminal

**¿Cómo hago un respaldo de la base de datos?**
- En pgAdmin: click derecho en `registro_coyhaique` → "Backup..."
- O desde terminal: `pg_dump -U postgres registro_coyhaique > respaldo.sql`

---

Desarrollado para la Municipalidad de Coyhaique — Aysén, Chile
