"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Calculator,
  RefreshCw,
  MessageCircle,
  ArrowLeftRight,
  Gem,
} from "lucide-react";
import Image from "next/image";
import { LocalizacaoBadge, StatusBadge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { gerarLinkAcertoRevendedora } from "@/lib/whatsapp";

interface Produto {
  id: string;
  nome: string;
  sku?: string;
  categoria: string;
  precoVenda: number;
  precoCusto: number;
  fotoUrl?: string;
  status: string;
  localizacao: string;
  criadoEm: string;
}

interface VendaRevendedora {
  id: string;
  valorFinal: number;
  criadoEm: string;
  cliente: { nome: string };
  itens: Array<{ produto: { nome: string } }>;
}

export default function ConsignacaoPage() {
  const [activeTab, setActiveTab] = useState<"maleta" | "acerto">("maleta");
  const [maleta, setMaleta] = useState<Produto[]>([]);
  const [loadingMaleta, setLoadingMaleta] = useState(true);

  // Acerto
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split("T")[0]);
  const [comissao, setComissao] = useState("30");
  const [vendasRevendedora, setVendasRevendedora] = useState<VendaRevendedora[]>([]);
  const [loadingAcerto, setLoadingAcerto] = useState(false);
  const [revendedoraTelefone, setRevendedoraTelefone] = useState("");
  const [revendedoraNome, setRevendedoraNome] = useState("Revendedora");

  const fetchMaleta = useCallback(async () => {
    setLoadingMaleta(true);
    try {
      const res = await fetch("/api/produtos?localizacao=REVENDEDORA");
      setMaleta(await res.json());
    } finally {
      setLoadingMaleta(false);
    }
  }, []);

  useEffect(() => {
    fetchMaleta();
  }, [fetchMaleta]);

  const handleTransferirCustodia = async (produto: Produto) => {
    try {
      await fetch(`/api/produtos/${produto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transferir-custodia" }),
      });
      fetchMaleta();
    } catch (error) {
      console.error(error);
    }
  };

  const calcularAcerto = async () => {
    setLoadingAcerto(true);
    try {
      const res = await fetch(
        `/api/vendas?vendedoraTipo=REVENDEDORA&dataInicio=${dataInicio}&dataFim=${dataFim}`
      );
      const vendas: VendaRevendedora[] = await res.json();
      setVendasRevendedora(vendas);
    } finally {
      setLoadingAcerto(false);
    }
  };

  // Cálculos do acerto
  const faturamentoBruto = vendasRevendedora.reduce(
    (acc, v) => acc + parseFloat(String(v.valorFinal)),
    0
  );
  const percentualComissao = parseFloat(comissao || "0");
  const valorComissao = (faturamentoBruto * percentualComissao) / 100;
  const valorLiquido = faturamentoBruto - valorComissao;

  const totalMaleta = maleta.reduce((acc, p) => acc + parseFloat(String(p.precoVenda)), 0);
  const disponivel = maleta.filter((p) => p.status === "DISPONIVEL").length;

  const linkAcerto =
    revendedoraTelefone && faturamentoBruto > 0
      ? gerarLinkAcertoRevendedora({
          revendedoraNome,
          revendedoraTelefone,
          periodo: `${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
          faturamentoBruto,
          percentualComissao,
          valorComissao,
          valorLiquido,
        })
      : "#";

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Consignação</h1>
        <p className="text-sm text-stone-400 mt-0.5">Gestão da maleta da revendedora</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-100 rounded-2xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("maleta")}
          id="tab-maleta-atual"
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "maleta"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          <Package className="w-4 h-4" />
          Maleta Atual
          {maleta.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "maleta" ? "bg-gold-100 text-gold-700" : "bg-stone-200 text-stone-500"}`}>
              {maleta.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("acerto")}
          id="tab-acerto-mes"
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "acerto"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Acerto do Mês
        </button>
      </div>

      {/* ── TAB: Maleta Atual ── */}
      {activeTab === "maleta" && (
        <div>
          {/* Stats */}
          {maleta.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white border border-stone-100 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-stone-800">{maleta.length}</p>
                <p className="text-xs text-stone-400 mt-0.5">Peças</p>
              </div>
              <div className="bg-white border border-stone-100 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{disponivel}</p>
                <p className="text-xs text-stone-400 mt-0.5">Disponíveis</p>
              </div>
              <div className="bg-white border border-stone-100 rounded-2xl p-4 text-center">
                <p className="text-lg font-bold text-gold-600">{formatCurrency(totalMaleta)}</p>
                <p className="text-xs text-stone-400 mt-0.5">Valor Total</p>
              </div>
            </div>
          )}

          {loadingMaleta ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="lg" label="Carregando maleta..." />
            </div>
          ) : maleta.length === 0 ? (
            <EmptyState
              icon="👜"
              title="Maleta vazia"
              description="Nenhuma peça está com a revendedora no momento. Transfira peças do catálogo."
            />
          ) : (
            <div className="space-y-3">
              {maleta.map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl p-3 hover:border-gold-200 hover:shadow-sm transition-all"
                >
                  {/* Foto */}
                  <div className="w-16 h-16 rounded-xl bg-stone-50 overflow-hidden flex-shrink-0">
                    {produto.fotoUrl ? (
                      <Image
                        src={produto.fotoUrl}
                        alt={produto.nome}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gem className="w-6 h-6 text-stone-200" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{produto.nome}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-[10px] text-stone-400">{produto.categoria}</span>
                      <StatusBadge status={produto.status} />
                    </div>
                    <p className="font-bold text-gold-600 text-sm mt-1">
                      {formatCurrency(produto.precoVenda)}
                    </p>
                  </div>

                  {/* Action: devolver à dona */}
                  {produto.status !== "VENDIDO" && (
                    <button
                      onClick={() => handleTransferirCustodia(produto)}
                      className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 hover:border-gold-300 hover:bg-gold-50 transition-all"
                      title="Devolver à Dona"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-stone-500" />
                      <span className="text-[10px] text-stone-400 font-medium">Devolver</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Acerto do Mês ── */}
      {activeTab === "acerto" && (
        <div className="space-y-5">
          {/* Configuração */}
          <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-stone-800">Configurações do Acerto</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">
                % de Comissão da Revendedora
              </label>
              <div className="flex gap-2">
                {["20", "25", "30", "35", "40"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setComissao(p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      comissao === p
                        ? "border-gold-500 gold-gradient text-white"
                        : "border-stone-200 text-stone-600 hover:border-gold-300"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
                <input
                  type="number"
                  value={comissao}
                  onChange={(e) => setComissao(e.target.value)}
                  className="flex-1 py-2 px-3 border-2 border-stone-200 rounded-xl text-sm text-center focus:outline-none focus:border-gold-400"
                  placeholder="Outro"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Nome da Revendedora
                </label>
                <input
                  type="text"
                  value={revendedoraNome}
                  onChange={(e) => setRevendedoraNome(e.target.value)}
                  placeholder="Ex: Maria"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  WhatsApp da Revendedora
                </label>
                <input
                  type="tel"
                  value={revendedoraTelefone}
                  onChange={(e) => setRevendedoraTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                />
              </div>
            </div>

            <button
              onClick={calcularAcerto}
              disabled={loadingAcerto}
              id="btn-calcular-acerto"
              className="w-full py-3 gold-gradient text-white font-bold rounded-xl shadow-gold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingAcerto ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Calcular Acerto
                </>
              )}
            </button>
          </div>

          {/* Resultado */}
          {vendasRevendedora.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              {/* Cards de resultado */}
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-stone-900 rounded-2xl p-5">
                  <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-4">
                    Resumo do Acerto — {vendasRevendedora.length} vendas
                  </p>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-300 text-sm">Faturamento Bruto</span>
                      <span className="text-white font-bold">{formatCurrency(faturamentoBruto)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-300 text-sm">
                        Comissão ({percentualComissao}%)
                      </span>
                      <span className="text-amber-400 font-bold">
                        -{formatCurrency(valorComissao)}
                      </span>
                    </div>
                    <div className="border-t border-stone-700 pt-3 flex justify-between items-center">
                      <span className="text-white font-semibold">A Repassar para Labela</span>
                      <span className="text-2xl font-black text-gold-400">
                        {formatCurrency(valorLiquido)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de vendas do período */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                  Vendas do Período
                </p>
                <div className="space-y-2">
                  {vendasRevendedora.map((venda) => (
                    <div
                      key={venda.id}
                      className="flex items-center justify-between p-3.5 bg-white border border-stone-100 rounded-xl"
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-800">
                          {venda.cliente.nome}
                        </p>
                        <p className="text-xs text-stone-400">
                          {formatDate(venda.criadoEm)} · {venda.itens.length} peça(s)
                        </p>
                      </div>
                      <p className="font-bold text-stone-800">{formatCurrency(venda.valorFinal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp button */}
              <a
                href={linkAcerto}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-acerto-whatsapp"
                className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md ${
                  revendedoraTelefone
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-400 cursor-not-allowed"
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                Enviar Resumo do Acerto no WhatsApp
              </a>
              {!revendedoraTelefone && (
                <p className="text-xs text-center text-stone-400">
                  Informe o WhatsApp da revendedora para enviar o resumo
                </p>
              )}
            </div>
          )}

          {vendasRevendedora.length === 0 && !loadingAcerto && (
            <EmptyState
              icon="📊"
              title="Nenhuma venda no período"
              description="Configure as datas e clique em Calcular Acerto para ver o resultado"
            />
          )}
        </div>
      )}
    </div>
  );
}
