import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clienteId = searchParams.get("clienteId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;

    const parcelas = await prisma.parcelaPromissoria.findMany({
      where,
      orderBy: [{ dataVencimento: "asc" }],
      include: {
        cliente: { select: { nome: true, telefone: true } },
        venda: {
          select: {
            id: true,
            formaPagamento: true,
            itens: {
              select: {
                produto: { select: { nome: true } },
              },
            },
          },
        },
      },
    });

    // Atualizar status de parcelas atrasadas no banco
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const atrasadasIds = parcelas
      .filter((p) => p.status === "PENDENTE" && p.dataVencimento < hoje)
      .map((p) => p.id);

    if (atrasadasIds.length > 0) {
      await prisma.parcelaPromissoria.updateMany({
        where: { id: { in: atrasadasIds } },
        data: { status: "ATRASADO" },
      });
    }

    // Re-fetch com status atualizado
    const parcelasAtualizadas = await prisma.parcelaPromissoria.findMany({
      where,
      orderBy: [{ status: "asc" }, { dataVencimento: "asc" }],
      include: {
        cliente: { select: { nome: true, telefone: true } },
        venda: {
          select: {
            id: true,
            formaPagamento: true,
            itens: {
              select: {
                produto: { select: { nome: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(parcelasAtualizadas);
  } catch (error) {
    console.error("Erro ao listar parcelas:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
