import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generatedRoot, templateUploadDir } from "@/lib/files";

const schema = z.object({
  confirm: z.literal("RESET"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ketik RESET untuk konfirmasi reset data." }, { status: 400 });
  }

  await db.ticket.deleteMany();
  await db.generationBatch.deleteMany();
  await db.templatePlacement.deleteMany();
  await db.ticketTemplate.deleteMany();
  await db.event.deleteMany();
  await rm(generatedRoot, { recursive: true, force: true }).catch(() => undefined);
  await rm(templateUploadDir, { recursive: true, force: true }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
