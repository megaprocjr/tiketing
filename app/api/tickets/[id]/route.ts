import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["UNUSED", "CHECKED_IN", "CANCELLED"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status tiket tidak valid." }, { status: 400 });
  }
  const ticket = await db.ticket.update({
    where: { id },
    data: {
      status: parsed.data.status,
      checkInAt: parsed.data.status === "CHECKED_IN" ? new Date() : null,
    },
  });
  return NextResponse.json({ ticket });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await db.ticket.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
