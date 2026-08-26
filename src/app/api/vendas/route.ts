import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clienteId,
      vendedoraTipo,
      itens, // Array<{ produtoId: string, precoUnitario: number }>
      desconto = 0,
      formaPagamento,
      parcelas, // Array<{ numeroParcela, valorParcela, dataVencimento }> (só para promissória)
    } = body;

    if (!clienteId || !vendedoraTipo || !itens?.length || !formaPagamento) {
      return NextResponse.json(
        { error: "Dados incompletos para criar a venda" },
        { status: 400 }
      );
    }

    const valorTotal = itens.reduce(
      (acc: number, item: { precoUnitario: number }) => acc + item.precoUnitario,
      0
    );
    const valorFinal = valorTotal - desconto;

    // Verificar se todos os produtos estão disponíveis
    const produtosIds = itens.map((i: { produtoId: string }) => i.produtoId);
    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtosIds } },
    });

    const indisponiveis = produtos.filter((p) => p.status !== "DISPONIVEL");
    if (indisponiveis.length > 0) {
      return NextResponse.json(
        {
          error: `Os seguintes produtos não estão disponíveis: ${indisponiveis.map((p) => p.nome).join(", ")}`,
        },
        { status: 409 }
      );
    }

    // Transação atômica
    const venda = await prisma.$transaction(async (tx) => {
      // Criar venda
      const novaVenda = await tx.venda.create({
        data: {
          clienteId,
          vendedoraTipo,
          valorTotal,
          desconto,
          valorFinal,
          formaPagamento,
          itens: {
            create: itens.map((item: { produtoId: string; precoUnitario: number }) => ({
              produtoId: item.produtoId,
              precoUnitario: item.precoUnitario,
            })),
          },
        },
        include: {
          itens: { include: { produto: true } },
          cliente: true,
        },
      });

      // Atualizar status dos produtos para VENDIDO
      await tx.produto.updateMany({
        where: { id: { in: produtosIds } },
        data: { status: "VENDIDO" },
      });

      // Criar parcelas se for promissória
      if (formaPagamento === "PROMISSORIA" && parcelas?.length > 0) {
        await tx.parcelaPromissoria.createMany({
          data: parcelas.map(
            (p: {
              numeroParcela: number;
              valorParcela: number;
              dataVencimento: string;
            }) => ({
              vendaId: novaVenda.id,
              clienteId,
              numeroParcela: p.numeroParcela,
              valorParcela: p.valorParcela,
              dataVencimento: new Date(p.dataVencimento),
              status: "PENDENTE",
            })
          ),
        });
      }

      return novaVenda;
    });

    return NextResponse.json(venda, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    return NextResponse.json({ error: "Erro interno ao processar venda" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");
    const vendedoraTipo = searchParams.get("vendedoraTipo");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const where: Record<string, unknown> = {};
    if (vendedoraTipo) where.vendedoraTipo = vendedoraTipo;
    if (dataInicio || dataFim) {
      where.criadoEm = {
        ...(dataInicio ? { gte: new Date(dataInicio + "T00:00:00") } : {}),
        ...(dataFim ? { lte: new Date(dataFim + "T23:59:59") } : {}),
      };
    }

    const vendas = await prisma.venda.findMany({
      where,
      take: limit,
      skip,
      orderBy: { criadoEm: "desc" },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        itens: { include: { produto: { select: { nome: true, fotoUrl: true } } } },
      },
    });

    return NextResponse.json(vendas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
