import { unlink } from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicPathToAbsolute } from "@/lib/files";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ticketCount = await db.ticket.count({ where: { templateId: id } });
  if (ticketCount > 0) {
    return NextResponse.json(
      { error: "Desain ini sudah dipakai tiket. Hapus tiket atau event terkait dulu sebelum menghapus desain." },
      { status: 400 },
    );
  }

  const template = await db.ticketTemplate.delete({ where: { id } });
  await unlink(publicPathToAbsolute(template.filePath)).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
