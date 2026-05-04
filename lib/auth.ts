import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const roles = ["SUPER_ADMIN", "ADMIN", "OPERATOR"] as const;
export type UserRole = (typeof roles)[number];

export function hashPin(pin: string) {
  const salt = process.env.AUTH_SALT || "school-photo-ticket-studio-local";
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

export async function ensureDefaultUsers() {
  const count = await db.user.count();
  if (count > 0) return;
  await db.user.createMany({
    data: [
      { name: "Super Admin", username: "superadmin", pinHash: hashPin("123456"), role: "SUPER_ADMIN" },
      { name: "Admin", username: "admin", pinHash: hashPin("222222"), role: "ADMIN" },
      { name: "Operator Scan", username: "operator", pinHash: hashPin("333333"), role: "OPERATOR" },
    ],
  });
}

export async function getSession() {
  const store = await cookies();
  const userId = store.get("studio_user_id")?.value;
  const role = store.get("studio_role")?.value as UserRole | undefined;
  const name = store.get("studio_name")?.value;
  const username = store.get("studio_username")?.value;
  if (!userId || !role) return null;
  return { userId, role, name: name ? decodeURIComponent(name) : "", username: username ? decodeURIComponent(username) : "" };
}

export function canAccessPath(role: string | undefined, pathname: string) {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;

  const operatorAllowed =
    pathname === "/scanner" ||
    pathname.startsWith("/scanner/") ||
    pathname === "/api/check-in" ||
    (pathname === "/api/tickets" && role === "OPERATOR") ||
    pathname === "/api/auth/me" ||
    pathname === "/api/auth/logout";

  if (role === "OPERATOR") return operatorAllowed;

  const adminBlocked =
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/users");
  return !adminBlocked;
}

export function roleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  return "Operator Scan";
}
