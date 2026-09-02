import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isGuardError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  const { role, userId } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const codigo = searchParams.get("codigo")?.trim();

    if (!codigo) {
      return NextResponse.json(
        { error: "Parâmetro 'codigo' é obrigatório" },
        { status: 400 }
      );
    }

    // Try finding by exact SKU or ID
    const produto = await prisma.produto.findFirst({
      where: {
        OR: [
          { sku: { equals: codigo, mode: "insensitive" } },
          { id: codigo },
        ],
      },
    });

    if (!produto) {
      return NextResponse.json(
        { found: false, error: "Peça não encontrada no sistema" },
        { status: 404 }
      );
    }

    // Check RBAC for revendedora
    if (role === "revendedor" && produto.revendedoraId !== userId) {
      return NextResponse.json({
        found: true,
        disponivel: false,
        motivo: "Peça alocada para outra revendedora ou com a dona",
        produto: {
          ...produto,
          precoCusto: Number(produto.precoCusto),
          precoVenda: Number(produto.precoVenda),
        },
      });
    }

    // Check status e quantidade
    const temEstoque = produto.quantidade > 0;
    const isDisponivel = produto.status === "DISPONIVEL" && temEstoque;

    let motivo: string | undefined;
    if (produto.status !== "DISPONIVEL") {
      motivo = `Peça com status ${produto.status}`;
    } else if (!temEstoque) {
      motivo = "Peça com estoque esgotado (0 unidades)";
    }

    return NextResponse.json({
      found: true,
      disponivel: isDisponivel,
      motivo,
      produto: {
        ...produto,
        precoCusto: Number(produto.precoCusto),
        precoVenda: Number(produto.precoVenda),
        quantidade: produto.quantidade,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar produto por código:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
