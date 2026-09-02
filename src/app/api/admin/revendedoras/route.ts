import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isGuardError } from "@/lib/auth-guard";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET /api/admin/revendedoras
// Lista todas as revendedoras com métricas individuais de estoque e vendas
export async function GET() {
  const guard = await requireAdmin();
  if (isGuardError(guard)) return guard;

  try {
    const adminSupabase = getAdminSupabase();
    const { data: usersData, error: userError } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (userError) {
      return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 });
    }

    const revendedoras = usersData.users
      .filter((u) => u.user_metadata?.role === "revendedor")
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        full_name: u.user_metadata?.full_name ?? "Revendedora",
        phone: u.user_metadata?.phone ?? "",
        created_at: u.created_at,
      }));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Buscar métricas de cada revendedora em paralelo
    const revendedorasComMetricas = await Promise.all(
      revendedoras.map(async (rev) => {
        const [maletaProdutos, vendasDoMes] = await Promise.all([
          prisma.produto.findMany({
            where: {
              revendedoraId: rev.id,
              status: "DISPONIVEL",
            },
            select: {
              id: true,
              nome: true,
              precoVenda: true,
              quantidade: true,
            },
          }),
          prisma.venda.findMany({
            where: {
              vendedoraId: rev.id,
              criadoEm: { gte: startOfMonth },
            },
            select: {
              id: true,
              valorFinal: true,
              itens: { select: { id: true, quantidade: true } },
            },
          }),
        ]);

        const maletaQtd = maletaProdutos.reduce(
          (acc, p) => acc + (p.quantidade || 1),
          0
        );
        const maletaValorTotal = maletaProdutos.reduce(
          (acc, p) => acc + parseFloat(p.precoVenda.toString()) * (p.quantidade || 1),
          0
        );

        const vendasMesQtd = vendasDoMes.length;
        const pecasVendidasMes = vendasDoMes.reduce(
          (acc, v) =>
            acc +
            v.itens.reduce((iAcc, item) => iAcc + (item.quantidade || 1), 0),
          0
        );
        const faturamentoMes = vendasDoMes.reduce(
          (acc, v) => acc + parseFloat(v.valorFinal.toString()),
          0
        );

        return {
          ...rev,
          maletaQtd,
          maletaValorTotal,
          vendasMesQtd,
          pecasVendidasMes,
          faturamentoMes,
        };
      })
    );

    return NextResponse.json({ revendedoras: revendedorasComMetricas });
  } catch (error) {
    console.error("Erro na API de revendedoras:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
