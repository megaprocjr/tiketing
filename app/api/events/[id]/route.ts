import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventSchema } from "@/lib/validations";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      tickets: { orderBy: { createdAt: "desc" }, take: 100 },
      batches: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ event });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }

  const event = await db.event.update({
    where: { id },
    data: {
      name: parsed.data.name,
      schoolName: parsed.data.schoolName,
      shootDate: parsed.data.shootDate ? new Date(parsed.data.shootDate) : null,
      codePrefix: parsed.data.codePrefix.toUpperCase(),
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await db.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
