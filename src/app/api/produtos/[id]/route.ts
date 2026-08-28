import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isGuardError } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;

  const { id } = await params;
  try {
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    // Revendedora só pode ver peças alocadas para ela
    if (auth.role === "revendedor" && produto.revendedoraId !== auth.userId) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    return NextResponse.json(produto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  // ── Guard: apenas admin pode editar produtos ─────────────
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  if (auth.role !== "administrador") {
    return NextResponse.json(
      { error: "Apenas administradores podem editar produtos." },
      { status: 403 }
    );
  }
  // ────────────────────────────────────────────────────────

  const { id } = await params;
  try {
    const body = await req.json();
    const produto = await prisma.produto.update({
      where: { id },
      data: {
        nome: body.nome,
        sku: body.sku || undefined,
        descricao: body.descricao,
        categoria: body.categoria,
        precoCusto: body.precoCusto ? parseFloat(body.precoCusto) : undefined,
        precoVenda: body.precoVenda ? parseFloat(body.precoVenda) : undefined,
        fotoUrl: body.fotoUrl,
        status: body.status,
        localizacao: body.localizacao,
        revendedoraId: body.revendedoraId ?? undefined,
      },
    });
    return NextResponse.json(produto);
  } catch (error: unknown) {
    console.error(error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;

  const { id } = await params;
  try {
    const body = await req.json();

    // Ação especial: "devolver-peca" — revendedora devolve para o estoque da dona
    if (body.action === "devolver-peca") {
      const produto = await prisma.produto.findUnique({ where: { id } });
      if (!produto) {
        return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
      }
      // Revendedora só pode devolver peças que estão com ela
      if (auth.role === "revendedor" && produto.revendedoraId !== auth.userId) {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
      }
      const updated = await prisma.produto.update({
        where: { id },
        data: { localizacao: "DONA", revendedoraId: null },
      });
      return NextResponse.json(updated);
    }

    // Ação especial: "transferir-custodia" — admin transfere para revendedora (ou devolve)
    if (body.action === "transferir-custodia") {
      if (auth.role !== "administrador") {
        return NextResponse.json(
          { error: "Apenas administradores podem transferir custódia." },
          { status: 403 }
        );
      }
      const produto = await prisma.produto.findUnique({ where: { id } });
      if (!produto) {
        return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
      }
      const novaLocalizacao = produto.localizacao === "DONA" ? "REVENDEDORA" : "DONA";
      const updated = await prisma.produto.update({
        where: { id },
        data: {
          localizacao: novaLocalizacao,
          // Ao transferir para revendedora, admin informa o revendedoraId no body
          revendedoraId:
            novaLocalizacao === "REVENDEDORA"
              ? (body.revendedoraId ?? produto.revendedoraId)
              : null,
        },
      });
      return NextResponse.json(updated);
    }

    // PATCH genérico — apenas admin
    if (auth.role !== "administrador") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar produtos." },
        { status: 403 }
      );
    }
    const produto = await prisma.produto.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(produto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  // ── Guard: apenas admin pode excluir produtos ────────────
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  if (auth.role !== "administrador") {
    return NextResponse.json(
      { error: "Apenas administradores podem excluir produtos." },
      { status: 403 }
    );
  }
  // ────────────────────────────────────────────────────────

  const { id } = await params;
  try {
    await prisma.produto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
