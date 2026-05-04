import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPin, roles } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi."),
  username: z.string().trim().min(3, "Username minimal 3 karakter.").regex(/^[a-z0-9._-]+$/i, "Username hanya huruf, angka, titik, underscore, dan strip."),
  pin: z.string().optional(),
  role: z.enum(roles),
  isActive: z.boolean(),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input user tidak valid." }, { status: 400 });
  }

  const superAdminCount = await db.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
  const current = await db.user.findUnique({ where: { id } });
  if (current?.role === "SUPER_ADMIN" && current.isActive && (parsed.data.role !== "SUPER_ADMIN" || !parsed.data.isActive) && superAdminCount <= 1) {
    return NextResponse.json({ error: "Minimal harus ada satu Super Admin aktif." }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username.toLowerCase(),
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      ...(parsed.data.pin ? { pinHash: hashPin(parsed.data.pin) } : {}),
    },
    select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const current = await db.user.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ ok: true });
  if (current.role === "SUPER_ADMIN") {
    const superAdminCount = await db.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
    if (superAdminCount <= 1) {
      return NextResponse.json({ error: "Minimal harus ada satu Super Admin aktif." }, { status: 400 });
    }
  }
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
