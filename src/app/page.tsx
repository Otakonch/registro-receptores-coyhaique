import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMunicipalidad } from "@/components/logo-municipalidad";
import {
  FileText,
  CheckCircle,
  Users,
  AlertCircle,
  BookOpen,
  ArrowRight,
  MapPin,
  Phone,
} from "lucide-react";

const REQUIRED_DOCS = [
  "Fotocopia RUT de la institución u/o organización",
  "Certificado de Directorio de Persona Jurídica (vigencia ≤ 60 días)",
  "Correo, teléfono y dirección de todos los miembros del directorio",
  "Certificado correspondiente a la Ley 19.862 con directiva actualizada",
  "Certificado de Vigencia de Persona Jurídica (vigencia ≤ 60 días)",
  "Fotocopia de Cédula de Identidad de todos los miembros del directorio",
  "Fotocopia de estatutos firmados o timbrados",
  "Certificado bancario: número de cuenta, nombre de la organización y banco (vigencia ≤ 60 días)",
];

const STEPS = [
  {
    step: "1",
    title: "Créate una cuenta",
    desc: "Regístrate como representante legal de tu organización con tu correo y RUT.",
  },
  {
    step: "2",
    title: "Completa los datos",
    desc: "Ingresa los datos de tu organización y los miembros del directorio.",
  },
  {
    step: "3",
    title: "Sube los documentos",
    desc: "Adjunta todos los documentos requeridos en formato PDF, JPG o PNG (máx. 10 MB).",
  },
  {
    step: "4",
    title: "Envía a revisión",
    desc: "El equipo municipal revisará tu solicitud y te notificará el resultado.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* ═══════════════════════════════════════════════
          HERO — foto de fondo + overlay degradado
          Imagen: /public/coyhaique-hero.jpg
      ═══════════════════════════════════════════════ */}
      <section
        className="relative text-white overflow-hidden"
        style={{ minHeight: 460 }}
      >
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/coyhaique-hero.jpg')" }}
        />

        {/* Overlay degradado: oscuro izquierda → semi-transparente derecha */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(10,40,18,0.93) 0%, rgba(15,61,26,0.85) 45%, rgba(15,61,26,0.55) 75%, rgba(15,61,26,0.25) 100%)",
          }}
        />

        {/* Línea de acento verde clara en el borde inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400/80 via-green-300/40 to-transparent" />

        {/* Contenido */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 sm:py-16 md:py-20 flex flex-col md:flex-row items-center gap-8 md:gap-10">

          {/* Logo con fondo semi-transparente para legibilidad */}
          <div className="flex-shrink-0 hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-2xl">
              <LogoMunicipalidad variant="hero" />
            </div>
          </div>

          {/* Texto principal */}
          <div className="flex-1">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px w-8 bg-green-400" />
              <span className="text-green-300 text-xs font-semibold uppercase tracking-[0.2em]">
                Municipalidad de Coyhaique · Región de Aysén
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-lg">
              Registro de Receptores
              <br />
              <span className="text-green-300">de Fondos Públicos</span>
            </h1>

            <p className="text-white/80 mb-8 max-w-lg leading-relaxed text-base">
              Plataforma oficial para la inscripción de organizaciones privadas
              sin fines de lucro, según la{" "}
              <strong className="text-white">Ley N°19.862</strong>.
              Requisito indispensable para acceder a fondos concursables municipales.
            </p>

            {/* Botones */}
            <div className="flex flex-wrap gap-3">
              <Link href="/registro">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-green-50 font-bold shadow-xl text-sm px-6"
                >
                  Inscribir mi Organización
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline-white" className="text-sm px-6">
                  Ya tengo cuenta
                </Button>
              </Link>
            </div>

            {/* Estadística / badge */}
            <div className="flex items-center gap-3 mt-8">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white/40 bg-green-700/60"
                  />
                ))}
              </div>
              <p className="text-white/60 text-xs">
                Organizaciones de la comuna de Coyhaique ya inscritas
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Alerta de obligatoriedad */}
      <section className="bg-amber-50 border-y border-amber-200 py-3.5">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Requisito obligatorio:</strong> Estar certificado en este registro es condición
            para postular a fondos concursables de la Municipalidad de Coyhaique.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">

        {/* ¿Qué es? */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-800">
              ¿Qué es el Registro de Receptores?
            </h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-gray-600 space-y-3 shadow-sm">
            <p>
              Es un registro de las <strong>personas jurídicas privadas sin fines de lucro</strong>{" "}
              (clubs, corporaciones, fundaciones, juntas de vecinos, etc.) que han recibido
              o pretenden recibir financiamiento de la Municipalidad de Coyhaique.
            </p>
            <p>
              Está normado por la <strong>Ley N°19.862</strong> y establece que toda organización
              que reciba fondos públicos debe estar inscrita y con información actualizada.
            </p>
            <p>
              Para completar tu inscripción también debes estar inscrito en el{" "}
              <a
                href="https://www.registros19862.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline font-medium hover:text-primary/80"
              >
                Registro Nacional (www.registros19862.cl)
              </a>.
            </p>
          </div>
        </section>

        {/* Pasos */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-800">¿Cómo funciona el proceso?</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {STEPS.map((s) => (
              <Card key={s.step} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="text-white rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "hsl(var(--primary))" }}
                    >
                      {s.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{s.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Documentos requeridos */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-800">Documentos requeridos</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Ten estos documentos digitalizados (PDF, JPG o PNG, máx. 10 MB cada uno):
          </p>
          <div className="bg-white rounded-lg border border-gray-200 divide-y shadow-sm">
            {REQUIRED_DOCS.map((doc, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{doc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ¿Quién puede inscribirse? */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-800">¿Quién puede inscribirse?</h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-gray-600 shadow-sm">
            <p>
              Puede inscribir su organización el <strong>representante legal</strong> de
              cualquier institución privada sin fines de lucro con personalidad jurídica vigente,
              como clubs deportivos, culturales, sociales, juntas de vecinos, corporaciones,
              fundaciones, centros de padres, entre otros.
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section
          className="text-white text-center py-10 rounded-lg shadow-md"
          style={{ background: "linear-gradient(135deg, #0f3d1a 0%, #1d6b33 100%)" }}
        >
          <h2 className="text-xl font-bold mb-2">
            ¿Listo para inscribir tu organización?
          </h2>
          <p className="text-white/80 mb-6 text-sm">
            El proceso es 100% en línea. Ten listos los documentos requeridos.
          </p>
          <Link href="/registro">
            <Button size="lg" className="bg-white text-primary hover:bg-white/95 font-bold shadow-lg">
              Comenzar inscripción
              <ArrowRight className="h-5 w-5 ml-1" />
            </Button>
          </Link>
        </section>

        {/* Datos de contacto */}
        <section className="grid sm:grid-cols-2 gap-4 pb-4">
          <div className="flex items-start gap-3 bg-white rounded-lg border p-4 shadow-sm">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">Dirección</p>
              <p className="text-sm text-gray-500">Francisco Bilbao 357, Coyhaique</p>
              <p className="text-sm text-gray-500">Horario OIRS: 09:00 – 14:00 hrs</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white rounded-lg border p-4 shadow-sm">
            <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">Contacto</p>
              <p className="text-sm text-gray-500">+56 67 2675114 / +56 67 2675100</p>
              <p className="text-sm text-gray-500">partes@coyhaique.cl</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
