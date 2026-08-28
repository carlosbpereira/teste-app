import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isGuardError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  // ── Guard ──────────────────────────────────────────────
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  const { role, userId } = auth;
  // ──────────────────────────────────────────────────────

  try {
    const { searchParams } = new URL(req.url);
    const categoria = searchParams.get("categoria");
    const status = searchParams.get("status");
    const localizacao = searchParams.get("localizacao");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};

    // ── RBAC Scoping ──────────────────────────────────────
    if (role === "revendedor") {
      // Revendedora só vê peças alocadas para ela
      where.revendedoraId = userId;
      where.localizacao = "REVENDEDORA";
    } else {
      // Admin pode filtrar por qualquer localização
      if (localizacao) where.localizacao = localizacao;
    }
    // ─────────────────────────────────────────────────────

    if (categoria) where.categoria = categoria;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { nome: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { descricao: { contains: q, mode: "insensitive" } },
      ];
    }

    const produtos = await prisma.produto.findMany({
      where,
      orderBy: [{ criadoEm: "desc" }],
    });

    return NextResponse.json(produtos);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // ── Guard: apenas admin pode cadastrar produtos ─────────
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  if (auth.role !== "administrador") {
    return NextResponse.json(
      { error: "Apenas administradores podem cadastrar produtos." },
      { status: 403 }
    );
  }
  // ────────────────────────────────────────────────────────

  try {
    const body = await req.json();
    const {
      nome,
      sku,
      descricao,
      categoria,
      precoCusto,
      precoVenda,
      fotoUrl,
      status,
      localizacao,
      revendedoraId,
    } = body;

    if (!nome || !categoria || !precoCusto || !precoVenda) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, categoria, precoCusto, precoVenda" },
        { status: 400 }
      );
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        sku: sku || undefined,
        descricao,
        categoria,
        precoCusto: parseFloat(precoCusto),
        precoVenda: parseFloat(precoVenda),
        fotoUrl,
        status: status || "DISPONIVEL",
        localizacao: localizacao || "DONA",
        revendedoraId: revendedoraId || null,
      },
    });

    return NextResponse.json(produto, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar produto:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "SKU já cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
