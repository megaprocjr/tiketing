import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { restoreBackupZip } from "@/lib/backup";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File backup ZIP wajib dipilih." }, { status: 400 });
  }
  if (!file.name.endsWith(".zip")) {
    return NextResponse.json({ error: "Restore hanya menerima file ZIP backup." }, { status: 400 });
  }

  await db.$disconnect();
  const result = await restoreBackupZip(Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ ok: true, ...result });
}
