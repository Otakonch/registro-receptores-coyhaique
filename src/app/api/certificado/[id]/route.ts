import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { hasAdminAccess } from "@/lib/roles";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// CODE 128B — implementación nativa (sin dependencias externas)
// Cada símbolo = 11 módulos en binario (1=barra negra, 0=espacio blanco)
// ─────────────────────────────────────────────────────────────────────────────
const C128: string[] = [
  "11011001100","11001101100","11001100110","10010011000","10010001100",
  "10001001100","10011001000","10011000100","10001100100","11001001000",
  "11001000100","11000100100","10110011100","10011011100","10011001110",
  "10111001100","10011101100","10011100110","11001110010","11001011100",
  "11001001110","11011100100","11001110100","11101101110","11101001100",
  "11100101100","11100100110","11101100100","11100110100","11100110010",
  "11011011000","11011000110","11000110110","10100011000","10001011000",
  "10001000110","10110001000","10001101000","10001100010","11010001000",
  "11000101000","11000100010","10110111000","10110001110","10001101110",
  "10111011000","10111000110","10001110110","11101110110","11010001110",
  "11000101110","11011101000","11011100010","11011101110","11101011000",
  "11101000110","11100010110","11101101000","11101100010","11100011010",
  "11101111010","11001000010","11110001010","10100110000","10100001100",
  "10010110000","10010000110","10000101100","10000100110","10110010000",
  "10110000100","10011010000","10011000010","10000110100","10000110010",
  "11000010010","11001010000","11110111010","11000010100","10001111010",
  "10100111100","10010111100","10010011110","10111100100","10011110100",
  "10011110010","11110100100","11110010100","11110010010","11011011110",
  "11011110110","11110110110","10101111000","10100011110","10001011110",
  "10111101000","10111100010","11110101000","11110100010","10111011110",
  "10111101110","11101011110","11110101110",
  "11010000100", // 103 START A
  "11010010000", // 104 START B  ← usamos este
  "11010011110", // 105 START C
];
const C128_STOP = "1100011101011"; // símbolo STOP (13 módulos)

/** Dibuja un código de barras Code 128B en el PDF y devuelve el ancho total */
function drawCode128(
  page: any,
  text: string,
  x: number,
  y: number,
  barHeight: number,
  moduleW: number,
  color: any,
): number {
  const upper = text.toUpperCase();
  let modules = C128[104]; // START B
  let checksum = 104;

  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i);
    if (code < 32 || code > 127) continue;
    const val = code - 32;
    checksum += val * (i + 1);
    modules += C128[val];
  }
  modules += C128[checksum % 103]; // dígito verificador
  modules += C128_STOP;

  // Dibujar módulo a módulo
  let cx = x;
  for (const bit of modules) {
    if (bit === "1") {
      page.drawRectangle({ x: cx, y, width: moduleW, height: barHeight, color });
    }
    cx += moduleW;
  }
  return modules.length * moduleW;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXTO JUSTIFICADO — distribuye el espacio extra entre palabras
// ─────────────────────────────────────────────────────────────────────────────
function drawJustified(
  page: any,
  text: string,
  x: number,
  y: number,
  size: number,
  font: any,
  color: any,
  maxWidth: number,
) {
  const words = text.split(" ");
  if (words.length <= 1) {
    page.drawText(text, { x, y, size, font, color });
    return;
  }
  const wordsW = words.reduce((s, w) => s + font.widthOfTextAtSize(w, size), 0);
  const gap = (maxWidth - wordsW) / (words.length - 1);
  let cx = x;
  words.forEach((word, i) => {
    page.drawText(word, { x: cx, y, size, font, color });
    cx += font.widthOfTextAtSize(word, size) + (i < words.length - 1 ? gap : 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/certificado/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Debes iniciar sesion para descargar el certificado" },
        { status: 401 }
      );
    }

    const registration = await db.registration.findUnique({
      where: { id: params.id },
      include: {
        organization: { include: { legalRep: true, members: true } },
      },
    });

    if (!registration || registration.status !== "APPROVED") {
      return NextResponse.json({ error: "Certificado no disponible" }, { status: 404 });
    }

    const isAdmin = hasAdminAccess((session.user as any).role);
    const isOwner = registration.organization.legalRepId === (session.user as any).id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "No tienes permiso para descargar este certificado" },
        { status: 403 }
      );
    }

    const org = registration.organization;
    const pdfDoc = await PDFDocument.create();
    const page   = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const black = rgb(0, 0, 0);
    const gray  = rgb(0.40, 0.40, 0.40);
    const lgray = rgb(0.70, 0.70, 0.70);

    const margin = 50;
    const cw     = width - margin * 2;

    // ── URL base para QR ────────────────────────────────────────────────────
    const reqUrl  = new URL(req.url);
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
    const verifyUrl = `${baseUrl}/verificar?id=${registration.id}`;

    // ── Logo municipal ───────────────────────────────────────────────────────
    let logoImg: any = null;
    let logoW = 0;
    let logoH = 0;
    try {
      const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo-muni-bw.png"));
      logoImg = await pdfDoc.embedPng(logoBytes);
      logoH   = 62;
      logoW   = (logoImg.width / logoImg.height) * logoH;
    } catch { /* sin logo */ }

    // ── Logo Corazón de la Patagonia (fondo) ────────────────────────────────
    let patagoniaImg: any = null;
    try {
      const patBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo-patagonia-bw.png"));
      patagoniaImg = await pdfDoc.embedPng(patBytes);
    } catch { /* sin logo patagonia */ }

    // ── QR Code (via api.qrserver.com) ───────────────────────────────────────
    let qrImg: any = null;
    const qrSize = 75; // pt en el PDF
    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data=${encodeURIComponent(verifyUrl)}`;
      const qrRes = await fetch(qrApiUrl, { signal: AbortSignal.timeout(6000) });
      if (qrRes.ok) {
        const qrBytes = await qrRes.arrayBuffer();
        qrImg = await pdfDoc.embedPng(new Uint8Array(qrBytes));
      }
    } catch { /* sin QR si no hay internet */ }

    // ── Encabezado ──────────────────────────────────────────────────────────
    let headerY = height - margin;

    // QR en la esquina superior derecha del encabezado
    const qrX = width - margin - qrSize;
    const qrY = headerY - qrSize;

    if (logoImg) {
      page.drawImage(logoImg, { x: margin, y: headerY - logoH, width: logoW, height: logoH });
      const txtX = margin + logoW + 14;
      page.drawText("MUNICIPALIDAD DE COYHAIQUE",
        { x: txtX, y: headerY - 18, size: 14, font: fontBold, color: black });
      page.drawText("Region de Aysen del Gral. Carlos Ibanez del Campo",
        { x: txtX, y: headerY - 32, size: 8, font: fontReg, color: gray });
      page.drawText("REGISTRO DE RECEPTORES DE FONDOS PUBLICOS",
        { x: txtX, y: headerY - 47, size: 9.5, font: fontBold, color: black });
      page.drawText("Ley N.19.862",
        { x: txtX, y: headerY - 60, size: 8, font: fontReg, color: gray });
      headerY -= logoH;
    } else {
      page.drawText("MUNICIPALIDAD DE COYHAIQUE",
        { x: margin, y: headerY - 18, size: 15, font: fontBold, color: black });
      page.drawText("Region de Aysen del Gral. Carlos Ibanez del Campo",
        { x: margin, y: headerY - 33, size: 8.5, font: fontReg, color: gray });
      page.drawText("REGISTRO DE RECEPTORES DE FONDOS PUBLICOS  -  Ley N.19.862",
        { x: margin, y: headerY - 48, size: 9.5, font: fontBold, color: black });
      headerY -= 55;
    }

    // Dibujar QR sobre el encabezado (esquina superior derecha)
    if (qrImg) {
      page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      // Pequeña etiqueta debajo del QR
      const lbl = "Verificar";
      page.drawText(lbl, {
        x: qrX + (qrSize - fontReg.widthOfTextAtSize(lbl, 6.5)) / 2,
        y: qrY - 9,
        size: 6.5, font: fontReg, color: gray,
      });
    }

    headerY -= 10;
    // Asegurar que la línea quede debajo del QR y su etiqueta (qrY - label - margen)
    if (qrImg) {
      const minSepY = qrY - 20; // 9pt etiqueta + 11pt margen
      if (headerY > minSepY) headerY = minSepY;
    }
    page.drawLine({ start: { x: margin, y: headerY }, end: { x: width - margin, y: headerY },
      thickness: 1.5, color: black });

    // ── Título ───────────────────────────────────────────────────────────────
    const titleY = headerY - 38;
    const titulo = "CERTIFICADO DE INSCRIPCION";
    page.drawText(titulo, {
      x: (width - fontBold.widthOfTextAtSize(titulo, 17)) / 2,
      y: titleY, size: 17, font: fontBold, color: black,
    });
    page.drawLine({ start: { x: margin, y: titleY - 10 }, end: { x: width - margin, y: titleY - 10 },
      thickness: 0.5, color: lgray });

    // ── Texto introductorio JUSTIFICADO ──────────────────────────────────────
    const introY   = titleY - 35;
    const introSz  = 9.5;
    drawJustified(page,
      "La Municipalidad de Coyhaique certifica que la siguiente organizacion",
      margin, introY, introSz, fontReg, gray, cw);
    drawJustified(page,
      "se encuentra inscrita en el Registro de Receptores de Fondos Publicos,",
      margin, introY - 14, introSz, fontReg, gray, cw);
    // Última línea: sin justificar (sería muy espaciada)
    page.drawText("cumpliendo con los requisitos establecidos en la Ley N.19.862.",
      { x: margin, y: introY - 28, size: introSz, font: fontReg, color: gray });

    // ── Recuadro datos ───────────────────────────────────────────────────────
    const boxH = 168;
    const boxY = introY - 52 - boxH;
    page.drawRectangle({ x: margin, y: boxY, width: cw, height: boxH,
      borderColor: black, borderWidth: 1, color: rgb(1, 1, 1) });

    const orgName = org.name.length > 52 ? org.name.substring(0, 49) + "..." : org.name;
    page.drawText(orgName, { x: margin + 12, y: boxY + boxH - 24, size: 14, font: fontBold, color: black });
    page.drawLine({ start: { x: margin + 10, y: boxY + boxH - 32 },
      end: { x: width - margin - 10, y: boxY + boxH - 32 }, thickness: 0.4, color: lgray });

    const lX  = margin + 12;
    const rX  = margin + cw / 2 + 10;
    let dy    = boxY + boxH - 52;
    const rH  = 30;

    const drawField = (label: string, value: string, x: number, py: number) => {
      page.drawText(label,          { x, y: py,      size: 7.5, font: fontBold, color: gray  });
      page.drawText(value || "N/A", { x, y: py - 12, size: 10,  font: fontReg,  color: black });
    };

    drawField("RUT",                  org.rut,                             lX, dy);
    drawField("Tipo de organizacion", org.type ?? "N/A",                   rX, dy); dy -= rH;
    drawField("Comuna",               org.commune ?? "N/A",                lX, dy);
    drawField("N. de directivos",     String(org.members?.length ?? 0),    rX, dy); dy -= rH;
    drawField("Representante legal",  org.legalRep?.name ?? "N/A",         lX, dy);
    drawField("RUT representante",    org.legalRep?.rut  ?? "N/A",         rX, dy); dy -= rH;

    const approvedDate = registration.approvedAt
      ? new Date(registration.approvedAt).toLocaleDateString("es-CL",
          { day: "2-digit", month: "long", year: "numeric" })
      : "N/A";
    drawField("Fecha de certificacion", approvedDate, lX, dy);

    // ── Banda de validez ─────────────────────────────────────────────────────
    const validY = boxY - 28;
    page.drawText(
      "[CERTIFICADA]  Organizacion apta para postular a fondos concursables municipales.",
      { x: margin, y: validY, size: 9, font: fontBold, color: black });

    // Mostrar la fecha real de vigencia del directorio ingresada al registrarse
    const vigenciaDate = org.directorioVigencia
      ? new Date(org.directorioVigencia).toLocaleDateString("es-CL", {
          day: "2-digit", month: "long", year: "numeric",
        })
      : null;
    const vigenciaLine = vigenciaDate
      ? `Vigencia del directorio: hasta el ${vigenciaDate}.`
      : "Vigencia: hasta cambio/vencimiento de directorio.";
    page.drawText(vigenciaLine,
      { x: margin, y: validY - 14, size: 8, font: fontReg, color: gray });

    // ── Logo Corazón de la Patagonia — entre banda de validez y código de barras ─
    const vboxH = 68; // caja de verificación más compacta y elegante
    const vboxY = 73; // posición fija: encima del footer (línea en y=55, gap=18)

    if (patagoniaImg) {
      const patH = 100;
      const patW = (patagoniaImg.width / patagoniaImg.height) * patH;
      const patX = (width - patW) / 2;
      // Centrar verticalmente en el espacio disponible entre vigencia y caja de barras
      const patAreaTop    = validY - 32;        // debajo del texto de vigencia
      const patAreaBottom = vboxY + vboxH + 10; // encima de la caja de código de barras
      const patY = patAreaBottom + (patAreaTop - patAreaBottom - patH) / 2;
      page.drawImage(patagoniaImg, { x: patX, y: patY, width: patW, height: patH });
    }

    // ── Código de verificación con CÓDIGO DE BARRAS — encima del footer ──────
    page.drawRectangle({ x: margin, y: vboxY, width: cw, height: vboxH,
      borderColor: lgray, borderWidth: 0.6, color: rgb(1, 1, 1) });

    // Título centrado — tipografía más pequeña y sobria
    const vtitulo = "CODIGO DE VERIFICACION";
    page.drawText(vtitulo, {
      x: (width - fontReg.widthOfTextAtSize(vtitulo, 7)) / 2,
      y: vboxY + vboxH - 13,
      size: 7, font: fontReg, color: gray,
    });
    page.drawLine({ start: { x: margin + 10, y: vboxY + vboxH - 18 },
      end: { x: width - margin - 10, y: vboxY + vboxH - 18 }, thickness: 0.3, color: lgray });

    // Código de barras Code 128B — módulos más finos y barras más bajas
    const barcodeText  = registration.id.toUpperCase();
    const barH         = 22;  // altura reducida (era 38)
    const moduleW      = 0.95; // módulos más finos (era 1.35)
    const barcodeY     = vboxY + 16; // centrado en la caja

    // Calcular ancho para centrar
    const upper   = barcodeText;
    let modCount  = C128[104].length; // START
    for (let i = 0; i < upper.length; i++) {
      const c = upper.charCodeAt(i);
      if (c >= 32 && c <= 127) modCount += C128[c - 32].length;
    }
    modCount += C128[0].length + C128_STOP.length; // CHECK + STOP
    const totalBarcodeW = modCount * moduleW;
    const barcodeX = margin + (cw - totalBarcodeW) / 2;

    drawCode128(page, barcodeText, barcodeX, barcodeY, barH, moduleW, black);

    // Código alfanumérico debajo del código de barras — fuente más pequeña
    const codeText = registration.id.toUpperCase();
    const codeW    = fontReg.widthOfTextAtSize(codeText, 6);
    page.drawText(codeText, {
      x: (width - codeW) / 2,
      y: vboxY + 6,
      size: 6, font: fontReg, color: gray,
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    page.drawLine({ start: { x: margin, y: 55 }, end: { x: width - margin, y: 55 },
      thickness: 0.8, color: black });
    page.drawText(
      "Municipalidad de Coyhaique  |  Francisco Bilbao 357  |  +56 67 2675114  |  partes@coyhaique.cl",
      { x: margin, y: 41, size: 7.5, font: fontReg, color: gray });
    page.drawText(
      `Documento generado el ${new Date().toLocaleDateString("es-CL")}  |  www.coyhaique.cl`,
      { x: margin, y: 28, size: 7.5, font: fontReg, color: gray });

    const pdfBytes = await pdfDoc.save();
    const safeName = org.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Certificado_${safeName}.pdf"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("Error al generar certificado:", error);
    return NextResponse.json({ error: "Error al generar el certificado" }, { status: 500 });
  }
}
