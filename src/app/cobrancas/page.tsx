"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageCircle,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ParcelaBadge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate, isToday, isPast } from "@/lib/utils";
import { gerarLinkCobrancaParcela } from "@/lib/whatsapp";

interface Parcela {
  id: string;
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: string;
  dataPagamento: string | null;
  status: "PENDENTE" | "PAGO" | "ATRASADO";
  cliente: {
    nome: string;
    telefone: string;
  };
  venda: {
    id: string;
    formaPagamento: string;
    itens: Array<{
      produto: { nome: string };
    }>;
  };
  vendaId: string;
  clienteId: string;
}

type FilterType = "TODAS" | "ATRASADO" | "HOJE" | "PENDENTE" | "PAGO";

export default function CobrancasPage() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("TODAS");
  const [search, setSearch] = useState("");

  // Baixa modal
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<Parcela | null>(null);
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dandoBaixa, setDandoBaixa] = useState(false);

  const fetchParcelas = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar todas as parcelas
      const res = await fetch("/api/parcelas-todas");
      if (res.ok) {
        const data = await res.json();
        // Atualizar status baseado na data
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const parcelasAtualizadas = data.map((p: Parcela) => {
          const venc = new Date(p.dataVencimento);
          venc.setHours(0, 0, 0, 0);
          if (p.status === "PENDENTE" && venc < hoje) {
            return { ...p, status: "ATRASADO" as const };
          }
          return p;
        });
        setParcelas(parcelasAtualizadas);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParcelas();
  }, [fetchParcelas]);

  const filteredParcelas = parcelas.filter((p) => {
    // Search filter
    if (search && !p.cliente.nome.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Status filter
    const venc = new Date(p.dataVencimento);
    if (filter === "HOJE") return isToday(venc) && p.status !== "PAGO";
    if (filter === "ATRASADO") return p.status === "ATRASADO" || (isPast(venc) && p.status === "PENDENTE");
    if (filter === "PENDENTE") return p.status === "PENDENTE";
    if (filter === "PAGO") return p.status === "PAGO";
    return true;
  });

  const handleDarBaixa = async () => {
    if (!parcelaSelecionada) return;
    setDandoBaixa(true);
    try {
      await fetch(`/api/parcelas/${parcelaSelecionada.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataPagamento }),
      });
      setBaixaModalOpen(false);
      fetchParcelas();
    } catch (error) {
      console.error(error);
    } finally {
      setDandoBaixa(false);
    }
  };

  const openBaixaModal = (parcela: Parcela) => {
    setParcelaSelecionada(parcela);
    setDataPagamento(new Date().toISOString().split("T")[0]);
    setBaixaModalOpen(true);
  };

  // Stats
  const stats = {
    atrasadas: parcelas.filter((p) => p.status === "ATRASADO" || (isPast(new Date(p.dataVencimento)) && p.status === "PENDENTE")).length,
    hoje: parcelas.filter((p) => isToday(new Date(p.dataVencimento)) && p.status !== "PAGO").length,
    pendentes: parcelas.filter((p) => p.status === "PENDENTE").length,
    totalAberto: parcelas
      .filter((p) => p.status !== "PAGO")
      .reduce((acc, p) => acc + parseFloat(String(p.valorParcela)), 0),
  };

  const FILTERS: { value: FilterType; label: string; icon: typeof AlertCircle; color: string }[] = [
    { value: "TODAS", label: "Todas", icon: Filter, color: "stone" },
    { value: "ATRASADO", label: `Atrasadas${stats.atrasadas > 0 ? ` (${stats.atrasadas})` : ""}`, icon: AlertCircle, color: "red" },
    { value: "HOJE", label: `Vencem Hoje${stats.hoje > 0 ? ` (${stats.hoje})` : ""}`, icon: Calendar, color: "amber" },
    { value: "PENDENTE", label: "Pendentes", icon: Clock, color: "blue" },
    { value: "PAGO", label: "Pagas", icon: CheckCircle, color: "green" },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Cobranças & Promissórias</h1>
        <p className="text-sm text-stone-400 mt-0.5">Gestão de pagamentos parcelados</p>
      </div>

      {/* Stats cards */}
      {parcelas.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-red-600">{stats.atrasadas}</p>
            <p className="text-xs text-red-500 mt-0.5">Atrasadas</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-amber-600">{stats.hoje}</p>
            <p className="text-xs text-amber-500 mt-0.5">Vencem Hoje</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-2xl font-bold text-blue-600">{stats.pendentes}</p>
            <p className="text-xs text-blue-500 mt-0.5">Pendentes</p>
          </div>
          <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4">
            <p className="text-base font-bold text-gold-600 leading-tight">
              {formatCurrency(stats.totalAberto)}
            </p>
            <p className="text-xs text-gold-500 mt-0.5">Total em Aberto</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar por nome da cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-thin">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            id={`filter-${f.value.toLowerCase()}`}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
              filter === f.value
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Carregando cobranças..." />
        </div>
      ) : filteredParcelas.length === 0 ? (
        <EmptyState
          icon="✅"
          title="Nenhuma parcela encontrada"
          description={filter === "PAGO" ? "Nenhuma parcela paga no filtro atual." : "Tudo em dia! Nenhuma cobrança pendente."}
        />
      ) : (
        <div className="space-y-3">
          {filteredParcelas.map((parcela) => {
            const venc = new Date(parcela.dataVencimento);
            const atrasada =
              parcela.status === "ATRASADO" ||
              (isPast(venc) && parcela.status === "PENDENTE");
            const venceHoje = isToday(venc) && parcela.status !== "PAGO";

            return (
              <div
                key={parcela.id}
                className={`bg-white border rounded-2xl p-4 transition-all hover:shadow-sm ${
                  atrasada
                    ? "border-red-200 hover:border-red-300"
                    : venceHoje
                    ? "border-amber-200 hover:border-amber-300"
                    : parcela.status === "PAGO"
                    ? "border-stone-100 opacity-70"
                    : "border-stone-100 hover:border-gold-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Cliente e status */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-stone-800 text-sm">{parcela.cliente.nome}</p>
                      <ParcelaBadge status={atrasada ? "ATRASADO" : parcela.status} />
                    </div>

                    {/* Detalhes da parcela */}
                    <div className="flex items-center gap-3 text-xs text-stone-400 mb-2">
                      <span>Parcela {parcela.numeroParcela}</span>
                      <span>·</span>
                      <span
                        className={
                          atrasada
                            ? "text-red-500 font-medium"
                            : venceHoje
                            ? "text-amber-600 font-medium"
                            : ""
                        }
                      >
                        {atrasada
                          ? "⚠️ Venceu em "
                          : venceHoje
                          ? "📅 Vence hoje — "
                          : "📅 "}
                        {formatDate(parcela.dataVencimento)}
                      </span>
                    </div>

                    {/* Valor */}
                    <p className="text-xl font-black text-stone-800">
                      {formatCurrency(parcela.valorParcela)}
                    </p>

                    {parcela.dataPagamento && (
                      <p className="text-xs text-emerald-600 mt-1">
                        ✓ Pago em {formatDate(parcela.dataPagamento)}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {parcela.status !== "PAGO" && (
                      <>
                        <button
                          onClick={() => openBaixaModal(parcela)}
                          id={`btn-baixa-${parcela.id}`}
                          className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Quitar
                        </button>
                        <a
                          href={gerarLinkCobrancaParcela({
                            clienteNome: parcela.cliente.nome,
                            clienteTelefone: parcela.cliente.telefone,
                            numeroParcela: parcela.numeroParcela,
                            totalParcelas: 6,
                            valorParcela: parseFloat(String(parcela.valorParcela)),
                            dataVencimento: new Date(parcela.dataVencimento),
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`btn-cobrar-whatsapp-${parcela.id}`}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      </>
                    )}
                    {parcela.status === "PAGO" && (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dar Baixa */}
      <Modal
        isOpen={baixaModalOpen}
        onClose={() => setBaixaModalOpen(false)}
        title="Dar Baixa na Parcela"
        size="sm"
      >
        {parcelaSelecionada && (
          <div className="p-5 space-y-4">
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-sm text-stone-600 mb-1">
                <strong>{parcelaSelecionada.cliente.nome}</strong>
              </p>
              <p className="text-sm text-stone-500">
                Parcela {parcelaSelecionada.numeroParcela} ·{" "}
                {formatDate(parcelaSelecionada.dataVencimento)}
              </p>
              <p className="text-2xl font-black text-stone-800 mt-2">
                {formatCurrency(parcelaSelecionada.valorParcela)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Data do Pagamento
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBaixaModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDarBaixa}
                id="btn-confirmar-baixa"
                disabled={dandoBaixa}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {dandoBaixa ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Baixa
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
