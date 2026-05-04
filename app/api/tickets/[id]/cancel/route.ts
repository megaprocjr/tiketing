import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ticket = await db.ticket.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ticket });
}
