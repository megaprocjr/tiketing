import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { placementSchema } from "@/lib/validations";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const template = await db.ticketTemplate.findUnique({
    where: { id },
    include: { placements: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  if (!template) {
    return NextResponse.json({ error: "Desain tiket tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ template, placement: template.placements[0] ?? null });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = placementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Posisi barcode tidak valid." }, { status: 400 });
  }

  const existing = await db.templatePlacement.findFirst({
    where: { templateId: id },
    orderBy: { updatedAt: "desc" },
  });

  const placement = existing
    ? await db.templatePlacement.update({ where: { id: existing.id }, data: parsed.data })
    : await db.templatePlacement.create({ data: { ...parsed.data, templateId: id } });

  return NextResponse.json({ placement });
}
