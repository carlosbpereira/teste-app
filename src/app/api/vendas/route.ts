import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isGuardError } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  // ── Guard ──────────────────────────────────────────────
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  const { role, userId } = auth;
  // ──────────────────────────────────────────────────────

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

    // Revendedora só pode registrar como REVENDEDORA
    if (role === "revendedor" && vendedoraTipo !== "REVENDEDORA") {
      return NextResponse.json(
        { error: "Revendedoras só podem registrar vendas do tipo REVENDEDORA." },
        { status: 403 }
      );
    }

    // Calcular quantidade total demandada por produtoId
    const qtdPorProduto: Record<string, number> = {};
    for (const item of itens as Array<{ produtoId: string; precoUnitario: number; quantidade?: number }>) {
      const q = item.quantidade && item.quantidade > 0 ? item.quantidade : 1;
      qtdPorProduto[item.produtoId] = (qtdPorProduto[item.produtoId] || 0) + q;
    }

    const valorTotal = (itens as Array<{ precoUnitario: number; quantidade?: number }>).reduce(
      (acc: number, item) => acc + item.precoUnitario * (item.quantidade && item.quantidade > 0 ? item.quantidade : 1),
      0
    );
    const valorFinal = valorTotal - desconto;

    // Verificar se todos os produtos estão disponíveis e possuem estoque suficiente
    const produtosIds = Object.keys(qtdPorProduto);
    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtosIds } },
    });

    const errosEstoque: string[] = [];
    for (const p of produtos) {
      const qtdDemandada = qtdPorProduto[p.id] || 0;
      if (p.status !== "DISPONIVEL") {
        errosEstoque.push(`"${p.nome}" (status ${p.status})`);
      } else if (p.quantidade < qtdDemandada) {
        errosEstoque.push(`"${p.nome}" (solicitado: ${qtdDemandada}, disponível: ${p.quantidade})`);
      }
    }

    if (errosEstoque.length > 0) {
      return NextResponse.json(
        {
          error: `Problema de estoque nos seguintes produtos: ${errosEstoque.join("; ")}`,
        },
        { status: 409 }
      );
    }

    // Revendedora só pode vender peças alocadas para ela
    if (role === "revendedor") {
      const naoAutorizados = produtos.filter(
        (p) => p.revendedoraId !== userId
      );
      if (naoAutorizados.length > 0) {
        return NextResponse.json(
          {
            error: `Produto(s) não alocado(s) para você: ${naoAutorizados.map((p) => p.nome).join(", ")}`,
          },
          { status: 403 }
        );
      }
    }

    // Transação atômica
    const venda = await prisma.$transaction(async (tx) => {
      // Criar venda — salvar vendedoraId para revendedoras
      const novaVenda = await tx.venda.create({
        data: {
          clienteId,
          vendedoraTipo,
          vendedoraId: role === "revendedor" ? userId : null,
          valorTotal,
          desconto,
          valorFinal,
          formaPagamento,
          itens: {
            create: (itens as Array<{ produtoId: string; precoUnitario: number; quantidade?: number }>).map(
              (item) => ({
                produtoId: item.produtoId,
                precoUnitario: item.precoUnitario,
                quantidade: item.quantidade && item.quantidade > 0 ? item.quantidade : 1,
              })
            ),
          },
        },
        include: {
          itens: { include: { produto: true } },
          cliente: true,
        },
      });

      // Baixa no estoque dos produtos
      for (const p of produtos) {
        const qtdVendida = qtdPorProduto[p.id] || 1;
        const novaQtd = Math.max(0, p.quantidade - qtdVendida);
        await tx.produto.update({
          where: { id: p.id },
          data: {
            quantidade: novaQtd,
            status: novaQtd <= 0 ? "VENDIDO" : "DISPONIVEL",
          },
        });
      }

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
    return NextResponse.json(
      { error: "Erro interno ao processar venda" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // ── Guard ──────────────────────────────────────────────
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  const { role, userId } = auth;
  // ──────────────────────────────────────────────────────

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");
    const vendedoraTipo = searchParams.get("vendedoraTipo");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const where: Record<string, unknown> = {};

    // ── RBAC Scoping ──────────────────────────────────────
    if (role === "revendedor") {
      // Revendedora só vê suas próprias vendas
      where.vendedoraId = userId;
    } else {
      // Admin pode filtrar por tipo de vendedora
      if (vendedoraTipo) where.vendedoraTipo = vendedoraTipo;
    }
    // ─────────────────────────────────────────────────────

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
