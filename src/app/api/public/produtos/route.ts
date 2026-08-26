import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rota pública para bot de WhatsApp — retorna produtos disponíveis
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoria = searchParams.get("categoria");
    const localizacao = searchParams.get("localizacao");

    const where: Record<string, unknown> = { status: "DISPONIVEL" };
    if (categoria) where.categoria = categoria;
    if (localizacao) where.localizacao = localizacao;

    const produtos = await prisma.produto.findMany({
      where,
      select: {
        id: true,
        nome: true,
        categoria: true,
        precoVenda: true,
        fotoUrl: true,
        status: true,
        localizacao: true,
        sku: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    // CORS para acesso externo (bot)
    return NextResponse.json(produtos, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
