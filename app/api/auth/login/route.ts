import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureDefaultUsers, hashPin } from "@/lib/auth";

const schema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi.").optional(),
  pin: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "PIN wajib diisi." }, { status: 400 });
  }

  await ensureDefaultUsers();
  const username = parsed.data.username?.toLowerCase() || "superadmin";
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !user.isActive || user.pinHash !== hashPin(parsed.data.pin)) {
    return NextResponse.json({ error: "Username atau PIN salah." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  response.cookies.set("studio_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  response.cookies.set("studio_user_id", user.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
  response.cookies.set("studio_role", user.role, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
  response.cookies.set("studio_name", encodeURIComponent(user.name), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
  response.cookies.set("studio_username", encodeURIComponent(user.username), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
  return response;
}
