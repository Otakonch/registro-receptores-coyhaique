import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// GET /api/certificado/[id] — genera el PDF de certificado de inscripción
// Público: cualquiera con el ID puede descargarlo (el ID no es predecible)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const registration = await db.registration.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          include: {
            legalRep: true,
            members: true,
          },
        },
      },
    });

    if (!registration || registration.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Certificado no disponible" },
        { status: 404 }
      );
    }

    const org = registration.organization;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const darkGreen = rgb(0.059, 0.239, 0.102); // #0f3d1a
    const midGreen = rgb(0.114, 0.420, 0.200);  // #1d6b33
    const gray = rgb(0.4, 0.4, 0.4);
    const black = rgb(0.1, 0.1, 0.1);
    const white = rgb(1, 1, 1);

    // Fondo del encabezado
    page.drawRectangle({ x: 0, y: height - 130, width, height: 130, color: darkGreen });

    // Título principal
    page.drawText("MUNICIPALIDAD DE COYHAIQUE", {
      x: 50, y: height - 52, size: 16, font: fontBold, color: white,
    });
    page.drawText("Región de Aysén del General Carlos Ibáñez del Campo", {
      x: 50, y: height - 70, size: 9, font: fontReg, color: rgb(0.8, 0.9, 0.8),
    });
    page.drawText("REGISTRO DE RECEPTORES DE FONDOS PÚBLICOS", {
      x: 50, y: height - 90, size: 11, font: fontBold, color: rgb(0.7, 1, 0.7),
    });
    page.drawText("Ley N°19.862", {
      x: 50, y: height - 108, size: 9, font: fontReg, color: rgb(0.7, 0.85, 0.7),
    });

    // Línea decorativa
    page.drawRectangle({ x: 0, y: height - 134, width, height: 4, color: midGreen });

    // Título del certificado
    page.drawText("CERTIFICADO DE INSCRIPCIÓN", {
      x: width / 2 - 130, y: height - 185, size: 18, font: fontBold, color: darkGreen,
    });
    page.drawLine({
      start: { x: 50, y: height - 195 },
      end: { x: width - 50, y: height - 195 },
      thickness: 1,
      color: midGreen,
    });

    // Texto introductorio
    const intro = `La Municipalidad de Coyhaique certifica que la siguiente organización`;
    const intro2 = `se encuentra inscrita en el Registro de Receptores de Fondos Públicos,`;
    const intro3 = `cumpliendo con los requisitos establecidos en la Ley N°19.862.`;
    page.drawText(intro, { x: 50, y: height - 225, size: 10, font: fontReg, color: gray });
    page.drawText(intro2, { x: 50, y: height - 239, size: 10, font: fontReg, color: gray });
    page.drawText(intro3, { x: 50, y: height - 253, size: 10, font: fontReg, color: gray });

    // Recuadro con datos de la organización
    page.drawRectangle({
      x: 50, y: height - 430, width: width - 100, height: 155,
      color: rgb(0.97, 0.99, 0.97), borderColor: midGreen, borderWidth: 1.5,
    });

    // Nombre de la organización (grande)
    const orgName = org.name.length > 50 ? org.name.substring(0, 47) + "..." : org.name;
    page.drawText(orgName, {
      x: 70, y: height - 298, size: 14, font: fontBold, color: darkGreen,
    });

    // Datos en dos columnas
    const leftX = 70;
    const rightX = 330;
    let y = height - 320;
    const lineH = 18;

    const drawField = (label: string, value: string, x: number, posY: number) => {
      page.drawText(label, { x, y: posY, size: 8, font: fontBold, color: gray });
      page.drawText(value || "—", { x, y: posY - 11, size: 10, font: fontReg, color: black });
    };

    drawField("RUT", org.rut, leftX, y);
    drawField("Tipo de organización", org.type ?? "—", rightX, y);
    y -= lineH * 2 + 4;

    drawField("Comuna", org.commune ?? "—", leftX, y);
    drawField("N° de directivos", String(org.members?.length ?? 0), rightX, y);
    y -= lineH * 2 + 4;

    drawField("Representante legal", org.legalRep?.name ?? "—", leftX, y);
    drawField("RUT representante", org.legalRep?.rut ?? "—", rightX, y);

    // Fecha de aprobación y número de registro
    const approvedDate = registration.approvedAt
      ? new Date(registration.approvedAt).toLocaleDateString("es-CL", {
          day: "2-digit", month: "long", year: "numeric",
        })
      : "—";

    y = height - 460;
    page.drawText("Fecha de certificación:", { x: 50, y, size: 9, font: fontBold, color: gray });
    page.drawText(approvedDate, { x: 190, y, size: 9, font: fontReg, color: black });

    page.drawText("N° de registro:", { x: 50, y: y - 16, size: 9, font: fontBold, color: gray });
    page.drawText(params.id.substring(0, 8).toUpperCase(), { x: 190, y: y - 16, size: 9, font: fontReg, color: black });

    // Sello / franja de validez
    page.drawRectangle({
      x: 50, y: height - 530, width: width - 100, height: 48,
      color: rgb(0.94, 0.99, 0.94), borderColor: rgb(0.5, 0.8, 0.5), borderWidth: 1,
    });
    page.drawText("✓  ORGANIZACIÓN CERTIFICADA — APTA PARA POSTULAR A FONDOS CONCURSABLES MUNICIPALES", {
      x: 68, y: height - 499, size: 9, font: fontBold, color: darkGreen,
    });
    page.drawText("Vigencia: un año desde la fecha de certificación o hasta cambio de directorio.", {
      x: 68, y: height - 514, size: 8, font: fontReg, color: midGreen,
    });

    // Espacio para firma
    const sigY = height - 640;
    page.drawLine({ start: { x: 130, y: sigY }, end: { x: 310, y: sigY }, thickness: 1, color: gray });
    page.drawText("ALCALDE", { x: 185, y: sigY - 14, size: 9, font: fontBold, color: gray });
    page.drawText("Municipalidad de Coyhaique", { x: 148, y: sigY - 26, size: 8, font: fontReg, color: gray });

    page.drawLine({ start: { x: 330, y: sigY }, end: { x: 510, y: sigY }, thickness: 1, color: gray });
    page.drawText("DIRECTOR/A DAEM / DIDECO", { x: 345, y: sigY - 14, size: 9, font: fontBold, color: gray });
    page.drawText("Unidad de Fondos Concursables", { x: 340, y: sigY - 26, size: 8, font: fontReg, color: gray });

    // Footer
    page.drawRectangle({ x: 0, y: 0, width, height: 60, color: darkGreen });
    page.drawText("Municipalidad de Coyhaique · Francisco Bilbao 357 · +56 67 2675114 · partes@coyhaique.cl", {
      x: 50, y: 38, size: 8, font: fontReg, color: rgb(0.8, 0.9, 0.8),
    });
    page.drawText(`Documento generado digitalmente el ${new Date().toLocaleDateString("es-CL")} · www.coyhaique.cl`, {
      x: 50, y: 22, size: 8, font: fontReg, color: rgb(0.6, 0.75, 0.6),
    });

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
