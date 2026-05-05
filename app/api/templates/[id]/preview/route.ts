import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { composeTicketImage } from "@/lib/image-compose";
import { saveGeneratedFile, sanitizeFilePart } from "@/lib/files";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const template = await db.ticketTemplate.findUnique({
    where: { id },
    include: { placements: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  const placement = template?.placements[0];
  if (!template || !placement) {
    return NextResponse.json({ error: "Desain atau posisi barcode belum tersedia." }, { status: 404 });
  }

  const fileName = `previews/${sanitizeFilePart(template.name)}-${Date.now()}-preview.png`;
  const pngBuffer = await composeTicketImage({
    templatePath: template.filePath,
    ticketCode: "SCH-2026-000001-A8K2",
    studentName: "Budi Santoso",
    placement,
  });
  const imagePath = await saveGeneratedFile(fileName, pngBuffer, "image/png");

  return NextResponse.json({ imagePath });
}
