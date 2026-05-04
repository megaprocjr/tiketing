import { NextResponse } from "next/server";
import { getSession, roleLabel } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: session.userId,
      name: session.name,
      username: session.username,
      role: session.role,
      roleLabel: roleLabel(session.role),
    },
  });
}
