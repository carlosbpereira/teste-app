import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isGuardError } from "@/lib/auth-guard";

export async function GET() {
  // ── Guard ──────────────────────────────────────────────
  const auth = await requireAuth();
  if (isGuardError(auth)) return auth;
  const { role, userId } = auth;
  // ──────────────────────────────────────────────────────

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isAdmin = role === "administrador";

    // Filtros base por role
    const vendaWhereBase = isAdmin ? {} : { vendedoraId: userId };
    const parcelaWhereBase = isAdmin ? {} : { venda: { vendedoraId: userId } };

    // Queries em paralelo (base — comuns a todos os roles)
    const [vendasDoMes, totalEstoque, totalPromissorias, parcelasAlerta] =
      await Promise.all([
        // Faturamento e peças vendidas do mês (com scoping)
        prisma.venda.findMany({
          where: { criadoEm: { gte: startOfMonth }, ...vendaWhereBase },
          include: { itens: true },
        }),

        // Total de itens em estoque (soma das quantidades de peças disponíveis)
        isAdmin
          ? prisma.produto.aggregate({
              where: { status: "DISPONIVEL" },
              _sum: { quantidade: true },
            })
          : prisma.produto.aggregate({
              where: { status: "DISPONIVEL", revendedoraId: userId },
              _sum: { quantidade: true },
            }),

        // Total a receber em promissórias pendentes (com scoping)
        prisma.parcelaPromissoria.aggregate({
          where: {
            status: { in: ["PENDENTE", "ATRASADO"] },
            ...parcelaWhereBase,
          },
          _sum: { valorParcela: true },
        }),

        // Parcelas atrasadas + vencem hoje (com scoping)
        prisma.parcelaPromissoria.findMany({
          where: {
            status: "PENDENTE",
            dataVencimento: { lt: tomorrow },
            ...parcelaWhereBase,
          },
          include: {
            cliente: { select: { nome: true, telefone: true } },
          },
          orderBy: { dataVencimento: "asc" },
          take: 10,
        }),
      ]);

    const faturamentoMes = vendasDoMes.reduce(
      (acc, v) => acc + parseFloat(v.valorFinal.toString()),
      0
    );
    const pecasVendidasMes = vendasDoMes.reduce(
      (acc, v) =>
        acc +
        v.itens.reduce((iAcc, item) => iAcc + (item.quantidade || 1), 0),
      0
    );

    const responseBase = {
      faturamentoMes,
      pecasVendidasMes,
      totalEstoque: totalEstoque._sum.quantidade ?? 0,
      totalPromissorias: parseFloat(
        totalPromissorias._sum.valorParcela?.toString() ?? "0"
      ),
      parcelasAlerta: parcelasAlerta.map((p) => ({
        id: p.id,
        clienteNome: p.cliente.nome,
        clienteTelefone: p.cliente.telefone,
        numeroParcela: p.numeroParcela,
        valorParcela: parseFloat(p.valorParcela.toString()),
        dataVencimento: p.dataVencimento,
        atrasada: p.dataVencimento < today,
      })),
    };

    // Admin: buscar dados comparativos Dona vs Revendedora
    if (isAdmin) {
      const [vendasDona, vendasRevendedora] = await Promise.all([
        prisma.venda.count({
          where: { criadoEm: { gte: startOfMonth }, vendedoraTipo: "DONA" },
        }),
        prisma.venda.count({
          where: {
            criadoEm: { gte: startOfMonth },
            vendedoraTipo: "REVENDEDORA",
          },
        }),
      ]);
      const totalVendas = vendasDona + vendasRevendedora;
      return NextResponse.json({
        ...responseBase,
        vendasDona,
        vendasRevendedora,
        percentualDona:
          totalVendas > 0 ? Math.round((vendasDona / totalVendas) * 100) : 0,
        percentualRevendedora:
          totalVendas > 0
            ? Math.round((vendasRevendedora / totalVendas) * 100)
            : 0,
      });
    }

    // Revendedora: apenas seus dados (sem comparativos)
    return NextResponse.json(responseBase);
  } catch (error) {
    console.error("Erro no dashboard:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
