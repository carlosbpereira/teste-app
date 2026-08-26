"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  MessageCircle,
  Package,
  User,
  ShoppingBag,
  CreditCard,
  Gem,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Badge, LocalizacaoBadge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { gerarLinkComprovanteVenda } from "@/lib/whatsapp";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormaPagamento = "PIX" | "DEBITO" | "CREDITO" | "PROMISSORIA";
type VendedoraTipo = "DONA" | "REVENDEDORA";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf?: string;
}

interface Produto {
  id: string;
  nome: string;
  sku?: string;
  categoria: string;
  precoVenda: number;
  fotoUrl?: string;
  localizacao: string;
}

interface Parcela {
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: Date;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEPS = ["Cliente", "Produtos", "Pagamento", "Confirmar"];

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string; icon: string }[] = [
  { value: "PIX", label: "Pix", icon: "💸" },
  { value: "DEBITO", label: "Débito", icon: "💳" },
  { value: "CREDITO", label: "Crédito", icon: "💳" },
  { value: "PROMISSORIA", label: "Promissória", icon: "📄" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PDVPage() {
  const [step, setStep] = useState(0);

  // Step 1: Cliente
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [isNovoCliente, setIsNovoCliente] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState({ nome: "", telefone: "", cpf: "" });
  const [searchingClientes, setSearchingClientes] = useState(false);

  // Step 2: Produtos
  const [produtoSearch, setProdutoSearch] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itensCarrinho, setItensCarrinho] = useState<Produto[]>([]);
  const [searchingProdutos, setSearchingProdutos] = useState(false);

  // Step 3: Pagamento
  const [vendedoraTipo, setVendedoraTipo] = useState<VendedoraTipo>("DONA");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("PIX");
  const [desconto, setDesconto] = useState("");
  const [numParcelas, setNumParcelas] = useState(2);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Step 4 / resultado
  const [submitting, setSubmitting] = useState(false);
  const [vendaRealizada, setVendaRealizada] = useState<{
    id: string;
    parcelas?: Parcela[];
  } | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // ── Clientes search ─────────────────────────────────────────────────────────

  const searchClientes = useCallback(async (q: string) => {
    if (!q.trim()) {
      setClientes([]);
      return;
    }
    setSearchingClientes(true);
    try {
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
      setClientes(await res.json());
    } finally {
      setSearchingClientes(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClientes(clienteSearch), 300);
    return () => clearTimeout(timer);
  }, [clienteSearch, searchClientes]);

  const handleNovoCliente = async () => {
    if (!novoClienteForm.nome || !novoClienteForm.telefone) {
      alert("Nome e telefone são obrigatórios");
      return;
    }
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoClienteForm),
      });
      const cliente = await res.json();
      setClienteSelecionado(cliente);
      setIsNovoCliente(false);
      setNovoClienteForm({ nome: "", telefone: "", cpf: "" });
    } catch (error) {
      console.error(error);
    }
  };

  // ── Produtos search ─────────────────────────────────────────────────────────

  const searchProdutos = useCallback(async (q: string) => {
    setSearchingProdutos(true);
    try {
      const params = new URLSearchParams({ status: "DISPONIVEL" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/produtos?${params}`);
      const all: Produto[] = await res.json();
      // Excluir os que já estão no carrinho
      const noCarrinho = new Set(itensCarrinho.map((i) => i.id));
      setProdutos(all.filter((p) => !noCarrinho.has(p.id)));
    } finally {
      setSearchingProdutos(false);
    }
  }, [itensCarrinho]);

  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => searchProdutos(produtoSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [produtoSearch, step, searchProdutos]);

  const adicionarAoCarrinho = (produto: Produto) => {
    setItensCarrinho((prev) => [...prev, produto]);
    setProdutos((prev) => prev.filter((p) => p.id !== produto.id));
  };

  const removerDoCarrinho = (produtoId: string) => {
    const removido = itensCarrinho.find((i) => i.id === produtoId);
    if (removido) {
      setItensCarrinho((prev) => prev.filter((p) => p.id !== produtoId));
      setProdutos((prev) => [...prev, removido]);
    }
  };

  // ── Cálculos ────────────────────────────────────────────────────────────────

  const valorTotal = itensCarrinho.reduce((acc, p) => acc + Number(p.precoVenda), 0);
  const descontoNum = parseFloat(desconto || "0");
  const valorFinal = Math.max(0, valorTotal - descontoNum);
  const valorPorParcela = numParcelas > 0 ? valorFinal / numParcelas : valorFinal;

  const gerarParcelas = (): Parcela[] => {
    return Array.from({ length: numParcelas }, (_, i) => {
      const venc = new Date(primeiroVencimento + "T12:00:00");
      venc.setMonth(venc.getMonth() + i);
      return {
        numeroParcela: i + 1,
        valorParcela: parseFloat((valorFinal / numParcelas).toFixed(2)),
        dataVencimento: venc,
      };
    });
  };

  // ── Submit venda ────────────────────────────────────────────────────────────

  const handleFinalizarVenda = async () => {
    if (!clienteSelecionado || itensCarrinho.length === 0) return;

    const parcelas = formaPagamento === "PROMISSORIA" ? gerarParcelas() : undefined;

    setSubmitting(true);
    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSelecionado.id,
          vendedoraTipo,
          itens: itensCarrinho.map((p) => ({
            produtoId: p.id,
            precoUnitario: Number(p.precoVenda),
          })),
          desconto: descontoNum,
          formaPagamento,
          parcelas: parcelas?.map((p) => ({
            numeroParcela: p.numeroParcela,
            valorParcela: p.valorParcela,
            dataVencimento: p.dataVencimento.toISOString(),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao finalizar venda");
        return;
      }

      const venda = await res.json();
      setVendaRealizada({ id: venda.id, parcelas });
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar a venda");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPDV = () => {
    setStep(0);
    setClienteSelecionado(null);
    setClienteSearch("");
    setItensCarrinho([]);
    setProdutoSearch("");
    setDesconto("");
    setFormaPagamento("PIX");
    setVendedoraTipo("DONA");
    setNumParcelas(2);
    setVendaRealizada(null);
    setIsSuccessModalOpen(false);
  };

  const linkWhatsApp = clienteSelecionado && vendaRealizada
    ? gerarLinkComprovanteVenda({
        clienteNome: clienteSelecionado.nome,
        clienteTelefone: clienteSelecionado.telefone,
        itens: itensCarrinho.map((p) => ({
          nome: p.nome,
          preco: Number(p.precoVenda),
        })),
        valorTotal,
        desconto: descontoNum,
        valorFinal,
        formaPagamento,
        parcelas: vendaRealizada.parcelas?.map((p) => ({
          numero: p.numeroParcela,
          valor: p.valorParcela,
          vencimento: p.dataVencimento,
        })),
        vendedora: vendedoraTipo === "DONA" ? "Labela Semijoias" : "Revendedora",
      })
    : "#";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-20 bg-white border-b border-stone-100 px-4 lg:px-8 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Stepper */}
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < step
                        ? "gold-gradient text-white shadow-gold"
                        : i === step
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:block ${
                      i === step ? "text-stone-800" : i < step ? "text-gold-600" : "text-stone-400"
                    }`}
                  >
                    {s}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 sm:mx-2 transition-colors" style={{ background: i < step ? "linear-gradient(90deg, #C9A84C, #E8D5A3)" : "#e7e5e4" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 lg:p-6 animate-fade-in">
        {/* ── STEP 0: Cliente ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-stone-800 mb-1">Selecionar Cliente</h2>
              <p className="text-sm text-stone-400">Busque pelo nome ou telefone</p>
            </div>

            {/* Cliente selecionado */}
            {clienteSelecionado && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-stone-800">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-stone-500">{clienteSelecionado.telefone}</p>
                </div>
                <button
                  onClick={() => setClienteSelecionado(null)}
                  className="p-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                >
                  <X className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
            )}

            {!clienteSelecionado && (
              <>
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Nome ou telefone..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
                  />
                  {searchingClientes && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>

                {/* Resultados */}
                {clientes.length > 0 && (
                  <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
                    {clientes.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClienteSelecionado(c);
                          setClienteSearch("");
                          setClientes([]);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gold-50 transition-colors border-b border-stone-50 last:border-0"
                      >
                        <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-stone-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-stone-800">{c.nome}</p>
                          <p className="text-xs text-stone-400">{c.telefone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Cadastro rápido */}
                <div>
                  <button
                    onClick={() => setIsNovoCliente(!isNovoCliente)}
                    className="flex items-center gap-2 text-sm text-gold-600 font-medium hover:text-gold-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar novo cliente
                  </button>

                  {isNovoCliente && (
                    <div className="mt-3 p-4 bg-white border border-stone-100 rounded-2xl space-y-3 shadow-sm animate-slide-up">
                      <h3 className="font-semibold text-stone-700 text-sm">Novo Cliente</h3>
                      <input
                        type="text"
                        placeholder="Nome completo *"
                        value={novoClienteForm.nome}
                        onChange={(e) => setNovoClienteForm({ ...novoClienteForm, nome: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                      />
                      <input
                        type="tel"
                        placeholder="Telefone com DDD *"
                        value={novoClienteForm.telefone}
                        onChange={(e) => setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                      />
                      <input
                        type="text"
                        placeholder="CPF (opcional)"
                        value={novoClienteForm.cpf}
                        onChange={(e) => setNovoClienteForm({ ...novoClienteForm, cpf: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsNovoCliente(false)}
                          className="flex-1 py-2 rounded-xl border border-stone-200 text-sm text-stone-500"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleNovoCliente}
                          className="flex-1 py-2 rounded-xl gold-gradient text-white text-sm font-semibold"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              onClick={() => setStep(1)}
              disabled={!clienteSelecionado}
              id="btn-proximo-produtos"
              className="w-full py-3.5 gold-gradient text-white font-bold rounded-2xl shadow-gold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:shadow-gold-lg"
            >
              Próximo — Selecionar Peças <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── STEP 1: Produtos ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(0)} className="p-2 rounded-xl hover:bg-stone-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-stone-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-stone-800">Selecionar Peças</h2>
                <p className="text-sm text-stone-400">
                  {itensCarrinho.length} {itensCarrinho.length === 1 ? "peça" : "peças"} selecionada(s)
                </p>
              </div>
            </div>

            {/* Carrinho */}
            {itensCarrinho.length > 0 && (
              <div className="bg-stone-900 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gold-400 uppercase tracking-wider mb-3">
                  Peças na Venda
                </p>
                <div className="space-y-2">
                  {itensCarrinho.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.fotoUrl ? (
                          <Image src={item.fotoUrl} alt={item.nome} width={32} height={32} className="object-cover" />
                        ) : (
                          <Gem className="w-3.5 h-3.5 text-stone-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.nome}</p>
                        <p className="text-xs text-stone-400">{formatCurrency(item.precoVenda)}</p>
                      </div>
                      <button
                        onClick={() => removerDoCarrinho(item.id)}
                        className="p-1.5 rounded-lg hover:bg-stone-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-stone-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-stone-700 flex justify-between">
                  <span className="text-sm text-stone-400 font-medium">Subtotal</span>
                  <span className="font-bold text-gold-400">{formatCurrency(valorTotal)}</span>
                </div>
              </div>
            )}

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar peça por nome ou SKU..."
                value={produtoSearch}
                onChange={(e) => setProdutoSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
              />
            </div>

            {/* Lista de produtos disponíveis */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
              {searchingProdutos ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner label="Buscando peças..." />
                </div>
              ) : produtos.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="w-10 h-10 text-stone-200 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">Nenhuma peça disponível</p>
                </div>
              ) : (
                produtos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => adicionarAoCarrinho(p)}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-2xl hover:border-gold-300 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-stone-50 overflow-hidden flex-shrink-0">
                      {p.fotoUrl ? (
                        <Image src={p.fotoUrl} alt={p.nome} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gem className="w-5 h-5 text-stone-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{p.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-stone-400">{p.categoria}</span>
                        <LocalizacaoBadge localizacao={p.localizacao} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gold-600">{formatCurrency(p.precoVenda)}</p>
                      <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 justify-end">
                          <Plus className="w-3 h-3" /> Adicionar
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={itensCarrinho.length === 0}
              id="btn-proximo-pagamento"
              className="w-full py-3.5 gold-gradient text-white font-bold rounded-2xl shadow-gold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Próximo — Forma de Pagamento <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── STEP 2: Pagamento ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="p-2 rounded-xl hover:bg-stone-100">
                <ChevronLeft className="w-5 h-5 text-stone-600" />
              </button>
              <h2 className="text-xl font-bold text-stone-800">Pagamento</h2>
            </div>

            {/* Vendedora */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Vendedora Responsável
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["DONA", "REVENDEDORA"] as VendedoraTipo[]).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setVendedoraTipo(tipo)}
                    className={`py-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                      vendedoraTipo === tipo
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {tipo === "DONA" ? "👑 Dona" : "💼 Revendedora"}
                  </button>
                ))}
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAS_PAGAMENTO.map((fp) => (
                  <button
                    key={fp.value}
                    onClick={() => setFormaPagamento(fp.value)}
                    className={`py-3 rounded-2xl border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      formaPagamento === fp.value
                        ? "border-gold-500 gold-gradient text-white shadow-gold"
                        : "border-stone-200 text-stone-600 hover:border-gold-300"
                    }`}
                  >
                    <span>{fp.icon}</span> {fp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Desconto */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Desconto (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={valorTotal}
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400 transition-all"
                />
              </div>
            </div>

            {/* Parcelamento Promissória */}
            {formaPagamento === "PROMISSORIA" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-4 animate-slide-up">
                <h3 className="font-semibold text-amber-800 text-sm">📄 Configurar Promissória</h3>

                <div>
                  <label className="block text-xs font-medium text-amber-700 mb-2">
                    Número de Parcelas
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumParcelas(n)}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                          numParcelas === n
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-amber-200 text-amber-700 hover:border-amber-400"
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-700 mb-2">
                    Primeiro Vencimento
                  </label>
                  <input
                    type="date"
                    value={primeiroVencimento}
                    onChange={(e) => setPrimeiroVencimento(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-amber-200 bg-white rounded-xl text-sm focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>

                {/* Preview de parcelas */}
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-2">Prévia das Parcelas:</p>
                  <div className="space-y-1.5">
                    {gerarParcelas().map((p) => (
                      <div
                        key={p.numeroParcela}
                        className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg border border-amber-100"
                      >
                        <span className="text-xs font-medium text-stone-600">
                          {p.numeroParcela}ª parcela
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-bold text-stone-800">
                            {formatCurrency(p.valorParcela)}
                          </span>
                          <span className="text-[10px] text-stone-400 ml-2">
                            {formatDate(p.dataVencimento)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Resumo */}
            <div className="bg-stone-900 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Subtotal</span>
                <span className="text-white font-medium">{formatCurrency(valorTotal)}</span>
              </div>
              {descontoNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Desconto</span>
                  <span className="text-emerald-400 font-medium">-{formatCurrency(descontoNum)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-stone-700">
                <span className="text-white font-semibold">Total</span>
                <span className="text-gold-400 font-bold text-lg">{formatCurrency(valorFinal)}</span>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              id="btn-confirmar-venda"
              className="w-full py-3.5 gold-gradient text-white font-bold rounded-2xl shadow-gold flex items-center justify-center gap-2"
            >
              Revisar e Confirmar <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── STEP 3: Confirmar ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="p-2 rounded-xl hover:bg-stone-100">
                <ChevronLeft className="w-5 h-5 text-stone-600" />
              </button>
              <h2 className="text-xl font-bold text-stone-800">Confirmar Venda</h2>
            </div>

            {/* Resumo final */}
            <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-stone-50">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Cliente</p>
                <p className="font-semibold text-stone-800">{clienteSelecionado?.nome}</p>
                <p className="text-sm text-stone-400">{clienteSelecionado?.telefone}</p>
              </div>

              <div className="px-5 py-4 border-b border-stone-50">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                  Peças ({itensCarrinho.length})
                </p>
                <div className="space-y-2">
                  {itensCarrinho.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-sm text-stone-700 truncate flex-1 pr-2">{item.nome}</span>
                      <span className="text-sm font-semibold text-stone-800 flex-shrink-0">
                        {formatCurrency(item.precoVenda)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-4 border-b border-stone-50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Vendedora</p>
                  <p className="text-sm font-semibold text-stone-800">
                    {vendedoraTipo === "DONA" ? "👑 Dona" : "💼 Revendedora"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Pagamento</p>
                  <p className="text-sm font-semibold text-stone-800">
                    {FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.icon}{" "}
                    {FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.label}
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 gold-gradient">
                {descontoNum > 0 && (
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>Subtotal</span>
                    <span>{formatCurrency(valorTotal)}</span>
                  </div>
                )}
                {descontoNum > 0 && (
                  <div className="flex justify-between text-sm text-white/80 mb-1">
                    <span>Desconto</span>
                    <span>-{formatCurrency(descontoNum)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Total Final</span>
                  <span className="text-2xl font-black text-white">{formatCurrency(valorFinal)}</span>
                </div>
              </div>
            </div>

            <button
              id="btn-finalizar-venda"
              onClick={handleFinalizarVenda}
              disabled={submitting}
              className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-lg rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {submitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  Finalizar Venda
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Modal de Sucesso ── */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => {}}
        size="sm"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto mb-4 shadow-gold">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-xl font-bold text-stone-800 mb-1">Venda Realizada!</h2>
          <p className="text-sm text-stone-500 mb-2">
            Venda de <strong>{formatCurrency(valorFinal)}</strong> registrada com sucesso
          </p>
          <p className="text-xs text-stone-400 mb-6">
            Para: {clienteSelecionado?.nome} · {formaPagamento}
            {formaPagamento === "PROMISSORIA" && ` · ${numParcelas}x`}
          </p>

          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-enviar-comprovante-whatsapp"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-colors shadow-md mb-3"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar Comprovante no WhatsApp
          </a>

          <button
            onClick={resetPDV}
            className="w-full py-3 border border-stone-200 rounded-2xl text-stone-600 font-medium text-sm hover:bg-stone-50 transition-colors"
          >
            Nova Venda
          </button>
        </div>
      </Modal>
    </div>
  );
}
