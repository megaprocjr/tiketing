import { NextResponse } from "next/server";
import path from "node:path";
import { db } from "@/lib/db";
import { composeTicketImage } from "@/lib/image-compose";
import { previewDir, sanitizeFilePart, toPublicPath } from "@/lib/files";

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

  const output = path.join(previewDir, `${sanitizeFilePart(template.name)}-${Date.now()}-preview.png`);
  await composeTicketImage({
    templatePath: template.filePath,
    outputPath: output,
    ticketCode: "SCH-2026-000001-A8K2",
    studentName: "Budi Santoso",
    placement,
  });

  return NextResponse.json({ imagePath: toPublicPath(output) });
}
