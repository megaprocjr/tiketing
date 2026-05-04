import { NextResponse } from "next/server";
import { backupFileName, createBackupZip } from "@/lib/backup";

export async function GET() {
  const buffer = await createBackupZip();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${backupFileName()}"`,
    },
  });
}
