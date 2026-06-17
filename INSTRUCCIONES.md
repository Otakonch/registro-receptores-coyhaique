# Registro de Receptores de Fondos Públicos
## Municipalidad de Coyhaique

---

## PASO 1 — Instalar herramientas necesarias

Necesitas tener instalado:

### Node.js
- Descarga desde: https://nodejs.org/
- Elige la versión **LTS** (la recomendada)
- Instala normalmente (siguiente, siguiente, finalizar)
- Verifica abriendo CMD y escribiendo: `node --version`

### PostgreSQL
- Descarga desde: https://www.postgresql.org/download/windows/
- Durante la instalación, define una contraseña para el usuario `postgres` — **anótala**
- El puerto por defecto es `5432` — no lo cambies

---

## PASO 2 — Crear la base de datos

1. Abre **pgAdmin** (se instala con PostgreSQL)
2. Conéctate con el usuario `postgres` y la contraseña que definiste
3. Haz click derecho en "Databases" → "Create" → "Database"
4. Nombre: `registro_coyhaique`
5. Guarda

---

## PASO 3 — Configurar las variables de entorno

1. En la carpeta del proyecto, encuentra el archivo `.env.example`
2. **Cópialo** y renómbralo a `.env.local`
3. Abre `.env.local` y edita la línea `DATABASE_URL` con tus datos:

```
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/registro_coyhaique"
```

4. Para `NEXTAUTH_SECRET`, ve a https://generate-secret.vercel.app/32 y copia el valor generado

El archivo `.env.local` final debe verse así:
```
DATABASE_URL="postgresql://postgres:MiContraseña123@localhost:5432/registro_coyhaique"
NEXTAUTH_SECRET="abc123xyz..."
NEXTAUTH_URL="http://localhost:3000"
```

---

## PASO 4 — Instalar dependencias y configurar la base de datos

Abre **CMD** (símbolo del sistema) o **PowerShell**, navega a la carpeta del proyecto:

```
cd "C:\Users\Informatica\Desktop\Ricardo Coloma\Web\Pagina Web Municipalidad\registro-receptores"
```

Luego ejecuta estos comandos en orden:

```bash
# Instalar todas las librerías del proyecto
npm install

# Crear las tablas en la base de datos
npm run db:push

# Crear el usuario administrador inicial
npm run db:seed
```

---

## PASO 5 — Iniciar el servidor

```bash
npm run dev
```

Abre tu navegador en: **http://localhost:3000**

---

## CREDENCIALES INICIALES DEL ADMINISTRADOR

```
Email:      admin@municipalidadcoyhaique.cl
Contraseña: Admin1234!
```

⚠️ **IMPORTANTE:** Cambia esta contraseña inmediatamente después del primer acceso.

---

## Estructura del proyecto

```
registro-receptores/
├── prisma/
│   └── schema.prisma       ← Estructura de la base de datos
├── src/
│   ├── app/
│   │   ├── (auth)/         ← Páginas de login y registro
│   │   ├── (user)/         ← Dashboard del usuario
│   │   ├── admin/          ← Panel del administrador
│   │   ├── api/            ← Lógica del servidor (backend)
│   │   └── page.tsx        ← Página de inicio
│   ├── components/         ← Componentes reutilizables
│   └── lib/                ← Utilidades y configuración
├── .env.local              ← Variables de entorno (TÚ LO CREAS)
└── package.json            ← Lista de dependencias
```

---

## Flujo de uso

### Para las organizaciones (usuarios):
1. Entran a la plataforma y se **registran** con sus datos
2. Completan el **formulario de inscripción** (3 pasos)
3. **Suben los documentos** requeridos
4. **Envían a revisión**
5. Esperan la respuesta del administrador

### Para el administrador municipal:
1. Entra al sistema con sus credenciales
2. Ve el **panel admin** con todas las inscripciones
3. Filtra por estado (En revisión, Aprobadas, Rechazadas)
4. Revisa cada inscripción, ve los documentos
5. **Aprueba o rechaza** con observaciones

---

## Comandos útiles

```bash
npm run dev          # Iniciar en modo desarrollo
npm run build        # Preparar para producción
npm run db:studio    # Abrir interfaz visual de la BD (muy útil)
npm run db:push      # Actualizar tablas si cambia el schema
```

---

## Preguntas frecuentes

**¿Cómo cambio el nombre de la municipalidad o los colores?**
- Nombre: busca "Municipalidad de Coyhaique" en los archivos y reemplaza
- Color principal (azul): edita `src/app/globals.css`, la línea `--primary`

**¿Dónde se guardan los archivos que suben los usuarios?**
- En la carpeta `public/uploads/` dentro del proyecto

**¿Cómo agrego otro administrador?**
- Registra un usuario normal y luego en pgAdmin cambia su campo `role` a `ADMIN`

---

Desarrollado para la Municipalidad de Coyhaique — Aysén, Chile
