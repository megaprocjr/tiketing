import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const batches = await db.generationBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      event: true,
      template: true,
      _count: { select: { tickets: true } },
    },
  });
  return NextResponse.json({ batches });
}
