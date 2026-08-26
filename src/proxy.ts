import { NextRequest, NextResponse } from "next/server";

// Rotas que não exigem autenticação
const PUBLIC_ROUTES = ["/login"];

// Rotas de API públicas (sem autenticação)
const PUBLIC_API_ROUTES = ["/api/public"];

// Rotas exclusivas para administradores
const ADMIN_ONLY_ROUTES = ["/admin"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos e internals do Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("sb-access-token")?.value;
  const userRole = request.cookies.get("sb-user-role")?.value;

  // ─── Rota de cadastro público — bloqueada para todos ───────────────────────
  if (pathname.startsWith("/cadastro")) {
    // Se não autenticado → login
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Se autenticado mas não admin → home
    if (userRole !== "administrador") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Admin → redireciona para painel interno
    return NextResponse.redirect(new URL("/admin/usuarios", request.url));
  }

  // ─── Rotas públicas (login) ─────────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublicRoute) {
    // Se já autenticado, redireciona para home
    if (accessToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // ─── Rotas de API ───────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_API_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (!isPublicApi && !accessToken) {
      return NextResponse.json(
        { error: "Não autorizado. Faça login para continuar." },
        { status: 401 }
      );
    }

    // Rotas de API admin exigem role administrador
    if (pathname.startsWith("/api/admin/") && userRole !== "administrador") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // ─── Proteção geral: exige token ────────────────────────────────────────────
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Rotas exclusivas para administradores ──────────────────────────────────
  const isAdminRoute = ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAdminRoute && userRole !== "administrador") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Run on all routes except Next.js internals and static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
