import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Executar queries em paralelo
    const [
      vendasDoMes,
      totalEstoque,
      totalPromissorias,
      parcelasAlerta,
      vendasDona,
      vendasRevendedora,
    ] = await Promise.all([
      // Faturamento e peças vendidas do mês
      prisma.venda.findMany({
        where: { criadoEm: { gte: startOfMonth } },
        include: { itens: true },
      }),

      // Total de itens em estoque disponíveis
      prisma.produto.count({ where: { status: "DISPONIVEL" } }),

      // Total a receber em promissórias pendentes
      prisma.parcelaPromissoria.aggregate({
        where: { status: { in: ["PENDENTE", "ATRASADO"] } },
        _sum: { valorParcela: true },
      }),

      // Parcelas atrasadas + vencem hoje
      prisma.parcelaPromissoria.findMany({
        where: {
          status: "PENDENTE",
          dataVencimento: { lt: tomorrow },
        },
        include: {
          cliente: { select: { nome: true, telefone: true } },
        },
        orderBy: { dataVencimento: "asc" },
        take: 10,
      }),

      // Vendas da dona no mês
      prisma.venda.count({
        where: {
          criadoEm: { gte: startOfMonth },
          vendedoraTipo: "DONA",
        },
      }),

      // Vendas da revendedora no mês
      prisma.venda.count({
        where: {
          criadoEm: { gte: startOfMonth },
          vendedoraTipo: "REVENDEDORA",
        },
      }),
    ]);

    const faturamentoMes = vendasDoMes.reduce(
      (acc, v) => acc + parseFloat(v.valorFinal.toString()),
      0
    );
    const pecasVendidasMes = vendasDoMes.reduce((acc, v) => acc + v.itens.length, 0);

    const totalVendas = vendasDona + vendasRevendedora;

    return NextResponse.json({
      faturamentoMes,
      pecasVendidasMes,
      totalEstoque,
      totalPromissorias: parseFloat(
        totalPromissorias._sum.valorParcela?.toString() ?? "0"
      ),
      vendasDona,
      vendasRevendedora,
      percentualDona: totalVendas > 0 ? Math.round((vendasDona / totalVendas) * 100) : 0,
      percentualRevendedora:
        totalVendas > 0 ? Math.round((vendasRevendedora / totalVendas) * 100) : 0,
      parcelasAlerta: parcelasAlerta.map((p) => ({
        id: p.id,
        clienteNome: p.cliente.nome,
        clienteTelefone: p.cliente.telefone,
        numeroParcela: p.numeroParcela,
        valorParcela: parseFloat(p.valorParcela.toString()),
        dataVencimento: p.dataVencimento,
        atrasada: p.dataVencimento < today,
      })),
    });
  } catch (error) {
    console.error("Erro no dashboard:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
