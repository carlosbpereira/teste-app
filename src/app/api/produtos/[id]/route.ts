import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json(produto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
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
  const { id } = await params;
  try {
    const body = await req.json();

    // Ação especial: transferir custódia
    if (body.action === "transferir-custodia") {
      const produto = await prisma.produto.findUnique({ where: { id } });
      if (!produto) {
        return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
      }
      const novaLocalizacao = produto.localizacao === "DONA" ? "REVENDEDORA" : "DONA";
      const updated = await prisma.produto.update({
        where: { id },
        data: { localizacao: novaLocalizacao },
      });
      return NextResponse.json(updated);
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
