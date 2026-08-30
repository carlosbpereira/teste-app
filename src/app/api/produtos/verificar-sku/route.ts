import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isGuardError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku")?.trim();
    const excludeId = searchParams.get("excludeId");

    if (!sku) {
      return NextResponse.json({ error: "Parâmetro 'sku' é obrigatório" }, { status: 400 });
    }

    const produto = await prisma.produto.findFirst({
      where: {
        sku: { equals: sku, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        nome: true,
        sku: true,
        categoria: true,
        precoVenda: true,
        status: true,
        localizacao: true,
        revendedoraId: true,
      },
    });

    if (produto) {
      return NextResponse.json({
        exists: true,
        produto: {
          ...produto,
          precoVenda: Number(produto.precoVenda),
        },
      });
    }

    return NextResponse.json({ exists: false, produto: null });
  } catch (error) {
    console.error("Erro ao verificar SKU:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
