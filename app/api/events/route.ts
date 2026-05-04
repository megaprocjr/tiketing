import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSampleEvent } from "@/lib/seed";
import { eventSchema } from "@/lib/validations";

export async function GET() {
  await ensureSampleEvent();
  const events = await db.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tickets: true, batches: true } } },
  });
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }

  const event = await db.event.create({
    data: {
      name: parsed.data.name,
      schoolName: parsed.data.schoolName,
      shootDate: parsed.data.shootDate ? new Date(parsed.data.shootDate) : null,
      codePrefix: parsed.data.codePrefix.toUpperCase(),
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
