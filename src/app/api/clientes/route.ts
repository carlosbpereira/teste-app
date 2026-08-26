import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { nome: { contains: q, mode: "insensitive" } },
        { telefone: { contains: q } },
        { cpf: { contains: q } },
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, telefone, cpf, endereco } = body;

    if (!nome || !telefone) {
      return NextResponse.json(
        { error: "Nome e telefone são obrigatórios" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        cpf: cpf?.replace(/\D/g, "") || undefined,
        endereco: endereco?.trim() || undefined,
      },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
