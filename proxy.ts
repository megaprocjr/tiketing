import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/samples", "/sample-template.png", "/_next", "/favicon.ico"];

function canAccessPath(role: string | undefined, pathname: string) {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;
  if (
    role === "OPERATOR" &&
    (pathname === "/scanner" ||
      pathname.startsWith("/scanner/") ||
      pathname === "/api/check-in" ||
      pathname === "/api/tickets" ||
      pathname === "/api/auth/me" ||
      pathname === "/api/auth/logout")
  ) {
    return true;
  }
  if (role === "ADMIN") {
    return !(
      pathname === "/settings" ||
      pathname.startsWith("/settings/") ||
      pathname.startsWith("/api/admin/") ||
      pathname.startsWith("/api/users")
    );
  }
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublic) return NextResponse.next();

  const isAuthenticated = request.cookies.get("studio_admin")?.value === "1";
  const role = request.cookies.get("studio_role")?.value;
  if (isAuthenticated && canAccessPath(role, pathname)) return NextResponse.next();
  if (isAuthenticated && !role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set("studio_admin", "", { maxAge: 0, path: "/" });
    return response;
  }
  if (isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Role kamu tidak punya akses ke fitur ini." }, { status: 403 });
    }
    const fallbackUrl = request.nextUrl.clone();
    fallbackUrl.pathname = role === "OPERATOR" ? "/scanner" : "/";
    return NextResponse.redirect(fallbackUrl);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Silakan login sebagai admin dulu." }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
