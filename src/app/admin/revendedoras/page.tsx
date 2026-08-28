"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  TrendingUp,
  Package,
  MessageCircle,
  Calculator,
  RefreshCw,
  Gem,
  ArrowUpRight,
  UserPlus,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { gerarLinkAcertoRevendedora } from "@/lib/whatsapp";

interface RevendedoraMetric {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  maletaQtd: number;
  maletaValorTotal: number;
  vendasMesQtd: number;
  pecasVendidasMes: number;
  faturamentoMes: number;
}

interface VendaItem {
  id: string;
  valorFinal: number;
  criadoEm: string;
  cliente: { nome: string };
  itens: Array<{ produto: { nome: string } }>;
}

export default function AdminRevendedorasPage() {
  const [revendedoras, setRevendedoras] = useState<RevendedoraMetric[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Acerto
  const [selectedRevendedora, setSelectedRevendedora] = useState<RevendedoraMetric | null>(null);
  const [isAcertoModalOpen, setIsAcertoModalOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split("T")[0]);
  const [comissao, setComissao] = useState("30");
  const [vendasPeriodo, setVendasPeriodo] = useState<VendaItem[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);

  const fetchRevendedoras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/revendedoras");
      const data = await res.json();
      setRevendedoras(data.revendedoras ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevendedoras();
  }, [fetchRevendedoras]);

  const openAcertoModal = async (rev: RevendedoraMetric) => {
    setSelectedRevendedora(rev);
    setIsAcertoModalOpen(true);
    fetchVendasAcerto(rev.id, dataInicio, dataFim);
  };

  const fetchVendasAcerto = async (revId: string, inicio: string, fim: string) => {
    setLoadingVendas(true);
    try {
      const res = await fetch(
        `/api/vendas?dataInicio=${inicio}&dataFim=${fim}`
      );
      const allVendas: Array<VendaItem & { vendedoraId?: string }> = await res.json();
      // Filtrar vendas da revendedora selecionada
      const filtradas = allVendas.filter((v) => v.vendedoraId === revId);
      setVendasPeriodo(filtradas);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingVendas(false);
    }
  };

  const handleRecalcularPeriodo = () => {
    if (selectedRevendedora) {
      fetchVendasAcerto(selectedRevendedora.id, dataInicio, dataFim);
    }
  };

  // Cálculos do Acerto
  const faturamentoAcerto = vendasPeriodo.reduce(
    (acc, v) => acc + parseFloat(String(v.valorFinal)),
    0
  );
  const percentualComissao = parseFloat(comissao || "0");
  const valorComissao = (faturamentoAcerto * percentualComissao) / 100;
  const valorRepasseDona = faturamentoAcerto - valorComissao;

  const linkAcertoWhatsApp = selectedRevendedora?.phone && faturamentoAcerto > 0
    ? gerarLinkAcertoRevendedora({
        revendedoraNome: selectedRevendedora.full_name,
        revendedoraTelefone: selectedRevendedora.phone,
        periodo: `${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
        faturamentoBruto: faturamentoAcerto,
        percentualComissao,
        valorComissao,
        valorLiquido: valorRepasseDona,
      })
    : "#";

  // Métricas Globais das Revendedoras
  const totalMaletasValor = revendedoras.reduce((acc, r) => acc + r.maletaValorTotal, 0);
  const totalMaletasPecas = revendedoras.reduce((acc, r) => acc + r.maletaQtd, 0);
  const totalFaturamentoMes = revendedoras.reduce((acc, r) => acc + r.faturamentoMes, 0);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Painel de Revendedoras</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Acompanhamento individual de estoque consignado e acertos mensais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRevendedoras}
            title="Atualizar dados"
            className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/admin/usuarios"
            className="flex items-center gap-2 px-4 py-2.5 gold-gradient text-white rounded-xl font-semibold text-sm shadow-gold hover:shadow-gold-lg transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nova Revendedora</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Revendedoras Ativas</p>
              <p className="text-2xl font-bold text-stone-800">{revendedoras.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Total em Maletas</p>
              <p className="text-xl font-bold text-stone-800">{formatCurrency(totalMaletasValor)}</p>
              <p className="text-[10px] text-stone-400">{totalMaletasPecas} peças distribuídas</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Vendas Revendedoras (Mês)</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalFaturamentoMes)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Revendedoras */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" label="Carregando revendedoras..." />
        </div>
      ) : revendedoras.length === 0 ? (
        <EmptyState
          icon="💼"
          title="Nenhuma revendedora cadastrada"
          description="Cadastre sua primeira revendedora na tela de Gestão de Usuários para iniciar a consignação"
          action={
            <Link
              href="/admin/usuarios"
              className="px-5 py-2.5 gold-gradient text-white rounded-xl font-semibold text-sm shadow-gold inline-block"
            >
              Cadastrar Revendedora
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {revendedoras.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-gold-200 hover:shadow-gold transition-all duration-200 p-5 flex flex-col justify-between"
            >
              {/* Header do Card */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-purple-700">
                        {rev.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-stone-800 text-base truncate">{rev.full_name}</h2>
                      <p className="text-xs text-stone-400 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {rev.email}
                      </p>
                    </div>
                  </div>
                </div>

                {rev.phone && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium">
                      <Phone className="w-3 h-3" /> {rev.phone}
                    </span>
                  </div>
                )}

                {/* Métricas do Card */}
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 mb-0.5">
                      Maleta Atual
                    </p>
                    <p className="text-base font-bold text-stone-800">
                      {rev.maletaQtd} <span className="text-xs font-normal text-stone-500">peças</span>
                    </p>
                    <p className="text-xs font-semibold text-gold-600">
                      {formatCurrency(rev.maletaValorTotal)}
                    </p>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 mb-0.5">
                      Vendas do Mês
                    </p>
                    <p className="text-base font-bold text-stone-800">
                      {rev.vendasMesQtd} <span className="text-xs font-normal text-stone-500">vendas</span>
                    </p>
                    <p className="text-xs font-semibold text-emerald-600">
                      {formatCurrency(rev.faturamentoMes)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <button
                  onClick={() => openAcertoModal(rev)}
                  className="w-full py-2.5 px-4 rounded-xl gold-gradient text-white text-xs font-bold shadow-gold hover:shadow-gold-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Calcular Acerto / WhatsApp
                </button>

                <Link
                  href="/catalogo"
                  className="w-full py-2 px-4 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-800 hover:border-gold-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Gem className="w-3.5 h-3.5 text-stone-400" />
                  Transferir Peças no Catálogo
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Acerto Individual */}
      <Modal
        isOpen={isAcertoModalOpen}
        onClose={() => setIsAcertoModalOpen(false)}
        title={selectedRevendedora ? `Acerto — ${selectedRevendedora.full_name}` : "Acerto"}
        size="lg"
      >
        <div className="p-5 space-y-5">
          {/* Período */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Período de Vendas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-stone-400 mb-1">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-gold-400"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-400 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-gold-400"
                />
              </div>
            </div>
            <button
              onClick={handleRecalcularPeriodo}
              className="mt-2.5 w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingVendas ? "animate-spin" : ""}`} />
              Recarregar Vendas do Período
            </button>
          </div>

          {/* Comissão */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Comissão da Revendedora
            </label>
            <div className="flex gap-2">
              {["20", "25", "30", "35", "40"].map((p) => (
                <button
                  key={p}
                  onClick={() => setComissao(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    comissao === p
                      ? "border-gold-500 gold-gradient text-white shadow-sm"
                      : "border-stone-200 text-stone-600 hover:border-gold-300"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Vendas Realizadas</span>
              <span className="font-semibold">{vendasPeriodo.length} vendas</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Faturamento Bruto</span>
              <span className="font-bold text-base">{formatCurrency(faturamentoAcerto)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Comissão Revendedora ({percentualComissao}%)</span>
              <span className="font-bold text-amber-400">-{formatCurrency(valorComissao)}</span>
            </div>
            <div className="border-t border-stone-800 pt-2.5 flex justify-between items-center">
              <span className="font-semibold text-stone-200">A Receber (Dona)</span>
              <span className="text-xl font-black text-gold-400">
                {formatCurrency(valorRepasseDona)}
              </span>
            </div>
          </div>

          {/* WhatsApp Button */}
          {selectedRevendedora?.phone ? (
            <a
              href={linkAcertoWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              Enviar Acerto via WhatsApp para {selectedRevendedora.full_name}
            </a>
          ) : (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <p className="text-xs text-amber-800">
                Esta revendedora não possui telefone cadastrado.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
