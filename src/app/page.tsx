"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Gem,
  Package,
  AlertCircle,
  Crown,
  Star,
  MessageCircle,
  ChevronRight,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { gerarLinkCobrancaParcela } from "@/lib/whatsapp";
import Link from "next/link";

interface DashboardData {
  faturamentoMes: number;
  pecasVendidasMes: number;
  totalEstoque: number;
  totalPromissorias: number;
  // Campos exclusivos do admin
  vendasDona?: number;
  vendasRevendedora?: number;
  percentualDona?: number;
  percentualRevendedora?: number;
  parcelasAlerta: Array<{
    id: string;
    clienteNome: string;
    clienteTelefone: string;
    numeroParcela: number;
    valorParcela: number;
    dataVencimento: string;
    atrasada: boolean;
  }>;
}

interface MeData {
  role: "administrador" | "revendedor";
  userId: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ])
      .then(([dashData, meData]) => {
        setData(dashData);
        setMe(meData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Carregando dashboard..." />
      </div>
    );
  }

  const isAdmin = me?.role === "administrador";

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Hero greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-400 capitalize">{hoje}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-800 mt-0.5">
            {isAdmin ? "Bom dia, Labela! 👑" : "Bom dia! 👋"}
          </h1>
          {!isAdmin && (
            <p className="text-xs text-stone-400 mt-0.5">Minhas vendas do mês</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shadow-gold">
          {isAdmin ? (
            <Crown className="w-6 h-6 text-white" />
          ) : (
            <Star className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <section aria-label="Indicadores do mês">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
          {isAdmin ? "Resumo do Mês" : "Meu Resumo do Mês"}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Faturamento"
            value={formatCurrency(data?.faturamentoMes ?? 0)}
            icon={TrendingUp}
            variant="gold"
            subtitle="no mês atual"
          />
          <KpiCard
            title="Peças Vendidas"
            value={String(data?.pecasVendidasMes ?? 0)}
            icon={Gem}
            subtitle="no mês atual"
          />
          <KpiCard
            title={isAdmin ? "Em Estoque" : "Minha Maleta"}
            value={String(data?.totalEstoque ?? 0)}
            icon={Package}
            subtitle="peças disponíveis"
          />
          <KpiCard
            title="A Receber"
            value={formatCurrency(data?.totalPromissorias ?? 0)}
            icon={AlertCircle}
            variant={data?.totalPromissorias ? "dark" : "default"}
            subtitle="em promissórias"
          />
        </div>
      </section>

      {/* Divisão de Vendas — apenas para admin */}
      {isAdmin &&
        data?.vendasDona !== undefined &&
        data?.vendasRevendedora !== undefined && (
          <section
            className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm"
            aria-label="Divisão de vendas"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-800">Divisão de Vendas</h2>
              <span className="text-xs text-stone-400">
                {(data.vendasDona ?? 0) + (data.vendasRevendedora ?? 0)} vendas totais
              </span>
            </div>

            <div className="space-y-3">
              {/* Dona */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />
                    <span className="text-sm font-medium text-stone-700">Dona</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-stone-800">
                      {data?.percentualDona ?? 0}%
                    </span>
                    <span className="text-xs text-stone-400 ml-1">
                      ({data?.vendasDona ?? 0} vendas)
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full gold-gradient rounded-full transition-all duration-700"
                    style={{ width: `${data?.percentualDona ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Revendedora */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span className="text-sm font-medium text-stone-700">Revendedora</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-stone-800">
                      {data?.percentualRevendedora ?? 0}%
                    </span>
                    <span className="text-xs text-stone-400 ml-1">
                      ({data?.vendasRevendedora ?? 0} vendas)
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all duration-700"
                    style={{ width: `${data?.percentualRevendedora ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

      {/* Alertas de Promissórias */}
      {(data?.parcelasAlerta?.length ?? 0) > 0 && (
        <section aria-label="Alertas de promissórias">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-stone-800">Atenção — Promissórias</h2>
            </div>
            <Link
              href="/cobrancas"
              className="text-xs text-gold-600 font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {data?.parcelasAlerta.map((parcela) => (
              <div
                key={parcela.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  parcela.atrasada
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      parcela.atrasada ? "bg-red-500" : "bg-amber-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">
                      {parcela.clienteNome}
                    </p>
                    <p
                      className={`text-xs ${
                        parcela.atrasada ? "text-red-600" : "text-amber-700"
                      }`}
                    >
                      {parcela.atrasada ? "⚠️ Atrasada" : "📅 Vence hoje"} ·{" "}
                      {formatDate(parcela.dataVencimento)} ·{" "}
                      <strong>{formatCurrency(parcela.valorParcela)}</strong>
                    </p>
                  </div>
                </div>
                <a
                  href={gerarLinkCobrancaParcela({
                    clienteNome: parcela.clienteNome,
                    clienteTelefone: parcela.clienteTelefone,
                    numeroParcela: parcela.numeroParcela,
                    totalParcelas: 1,
                    valorParcela: parcela.valorParcela,
                    dataVencimento: new Date(parcela.dataVencimento),
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 ml-2 p-2 rounded-xl bg-white border border-stone-200 hover:border-gold-300 hover:shadow-sm transition-all"
                  title="Cobrar via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section aria-label="Ações rápidas">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
          Ações Rápidas
        </h2>
        <div className={`grid grid-cols-1 ${isAdmin ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"} gap-3`}>
          <Link
            href="/pdv"
            id="quick-action-nova-venda"
            className="flex items-center gap-3 p-4 bg-stone-900 text-white rounded-2xl hover:bg-stone-800 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0 shadow-gold">
              <Gem className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Nova Venda</p>
              <p className="text-xs text-stone-400">Registrar venda agora</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-gold-400 transition-colors" />
          </Link>

          <Link
            href="/catalogo"
            id="quick-action-catalogo"
            className="flex items-center gap-3 p-4 bg-white border border-stone-100 rounded-2xl hover:border-gold-200 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-gold-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-stone-800">
                {isAdmin ? "Catálogo" : "Minha Maleta"}
              </p>
              <p className="text-xs text-stone-400">
                {isAdmin ? "Gerenciar estoque" : "Ver peças disponíveis"}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-gold-500 transition-colors" />
          </Link>

          {isAdmin && (
            <Link
              href="/admin/revendedoras"
              id="quick-action-revendedoras"
              className="flex items-center gap-3 p-4 bg-white border border-stone-100 rounded-2xl hover:border-purple-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-stone-800">Revendedoras</p>
                <p className="text-xs text-stone-400">Equipe & maletas</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-purple-500 transition-colors" />
            </Link>
          )}

          <Link
            href="/cobrancas"
            id="quick-action-cobrancas"
            className="flex items-center gap-3 p-4 bg-white border border-stone-100 rounded-2xl hover:border-gold-200 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-stone-800">Cobranças</p>
              <p className="text-xs text-stone-400">Parcelas pendentes</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-gold-500 transition-colors" />
          </Link>
        </div>
      </section>
    </div>
  );
}
