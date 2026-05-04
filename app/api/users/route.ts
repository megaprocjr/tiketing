import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureDefaultUsers, hashPin, roles } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi."),
  username: z.string().trim().min(3, "Username minimal 3 karakter.").regex(/^[a-z0-9._-]+$/i, "Username hanya huruf, angka, titik, underscore, dan strip."),
  pin: z.string().min(4, "PIN minimal 4 karakter."),
  role: z.enum(roles),
});

export async function GET() {
  await ensureDefaultUsers();
  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input user tidak valid." }, { status: 400 });
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username.toLowerCase(),
      pinHash: hashPin(parsed.data.pin),
      role: parsed.data.role,
    },
    select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ user }, { status: 201 });
}
