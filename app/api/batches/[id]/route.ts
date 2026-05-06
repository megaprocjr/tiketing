import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteStoredFile } from "@/lib/files";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const batch = await db.generationBatch.findUnique({
    where: { id },
    include: {
      tickets: {
        select: {
          generatedImagePath: true,
        },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "File tiket tidak ditemukan." }, { status: 404 });
  }

  const files = [
    batch.zipPath,
    batch.pdfPath,
    batch.manifestPath,
    ...batch.tickets.map((ticket) => ticket.generatedImagePath),
  ].filter((filePath): filePath is string => Boolean(filePath));

  await db.$transaction([
    db.ticket.deleteMany({ where: { batchId: id } }),
    db.generationBatch.delete({ where: { id } }),
  ]);

  await Promise.allSettled(Array.from(new Set(files)).map((filePath) => deleteStoredFile(filePath)));

  return NextResponse.json({
    ok: true,
    deletedTickets: batch.tickets.length,
  });
}
