import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") || undefined;
  const tickets = await db.ticket.findMany({
    where: eventId ? { eventId } : undefined,
    orderBy: [{ className: "asc" }, { studentName: "asc" }, { createdAt: "desc" }],
    take: 2500,
    include: { event: true },
  });
  return NextResponse.json({ tickets });
}
