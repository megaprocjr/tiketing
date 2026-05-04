import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("studio_admin", "", { maxAge: 0, path: "/" });
  response.cookies.set("studio_user_id", "", { maxAge: 0, path: "/" });
  response.cookies.set("studio_role", "", { maxAge: 0, path: "/" });
  response.cookies.set("studio_name", "", { maxAge: 0, path: "/" });
  response.cookies.set("studio_username", "", { maxAge: 0, path: "/" });
  return response;
}
