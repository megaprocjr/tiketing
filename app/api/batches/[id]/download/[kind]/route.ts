import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRemoteUrl, publicPathToAbsolute, readStoredFile } from "@/lib/files";

const contentTypes = {
  zip: "application/zip",
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
} as const;

export async function GET(_request: Request, context: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await context.params;
  if (!(kind in contentTypes)) {
    return NextResponse.json({ error: "Jenis download tidak valid." }, { status: 400 });
  }

  const batch = await db.generationBatch.findUnique({ where: { id } });
  if (!batch) {
    return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
  }

  const filePath = kind === "zip" ? batch.zipPath : kind === "pdf" ? batch.pdfPath : batch.manifestPath;
  if (!filePath) {
    return NextResponse.json({ error: "File export belum tersedia." }, { status: 404 });
  }

  const file = await readStoredFile(filePath);
  const fileName = isRemoteUrl(filePath) ? path.basename(new URL(filePath).pathname) : path.basename(publicPathToAbsolute(filePath));

  return new NextResponse(file, {
    headers: {
      "Content-Type": contentTypes[kind as keyof typeof contentTypes],
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
