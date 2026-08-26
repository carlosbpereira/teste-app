import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reserva temporária de produto (para bot de WhatsApp)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { produtoId, clienteNome, clienteTelefone } = body;

    if (!produtoId || !clienteNome || !clienteTelefone) {
      return NextResponse.json(
        { error: "produtoId, clienteNome e clienteTelefone são obrigatórios" },
        { status: 400 }
      );
    }

    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });

    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    if (produto.status !== "DISPONIVEL") {
      return NextResponse.json(
        { error: "Produto não está disponível para reserva" },
        { status: 409 }
      );
    }

    // Atualiza o produto para RESERVADO
    const produtoAtualizado = await prisma.produto.update({
      where: { id: produtoId },
      data: { status: "RESERVADO" },
    });

    return NextResponse.json(
      {
        success: true,
        produto: produtoAtualizado,
        mensagem: `${produto.nome} reservado com sucesso para ${clienteNome}`,
      },
      {
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
