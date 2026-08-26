import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Dar baixa em parcela
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { dataPagamento } = body;

    const parcela = await prisma.parcelaPromissoria.update({
      where: { id },
      data: {
        status: "PAGO",
        dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
      },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        venda: { select: { id: true } },
      },
    });

    return NextResponse.json(parcela);
  } catch (error: unknown) {
    console.error(error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
