import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  ticketCode: z.string().trim().min(1, "Kode tiket wajib diisi."),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ status: "NOT_FOUND", message: "Kode tiket tidak valid." }, { status: 400 });
  }

  const ticket = await db.ticket.findUnique({
    where: { ticketCode: parsed.data.ticketCode },
    include: { event: true },
  });

  if (!ticket) {
    return NextResponse.json({ status: "NOT_FOUND", message: "Tiket tidak dikenal." });
  }
  if (ticket.status === "CANCELLED") {
    return NextResponse.json({ status: "CANCELLED", ticket });
  }
  if (ticket.status === "CHECKED_IN") {
    return NextResponse.json({ status: "ALREADY_USED", ticket });
  }

  const updated = await db.ticket.update({
    where: { id: ticket.id },
    data: { status: "CHECKED_IN", checkInAt: new Date() },
    include: { event: true },
  });

  return NextResponse.json({ status: "VALID", ticket: updated });
}
