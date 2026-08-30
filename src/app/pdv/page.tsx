"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  MessageCircle,
  Package,
  User,
  ShoppingBag,
  Gem,
  Trash2,
  Camera,
  CameraOff,
  Barcode,
  AlertCircle,
  Check,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Badge, LocalizacaoBadge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CameraBarcodeScanner } from "@/components/ui/CameraBarcodeScanner";
import { soundEffects } from "@/lib/sound-effects";
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
  status: string;
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  estoqueMaximo: number;
}

interface Parcela {
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: Date;
}

interface ToastNotification {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string; icon: string }[] = [
  { value: "PIX", label: "Pix", icon: "💸" },
  { value: "DEBITO", label: "Débito", icon: "💳" },
  { value: "CREDITO", label: "Crédito", icon: "💳" },
  { value: "PROMISSORIA", label: "Promissória", icon: "📄" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PDVPage() {
  // ── Session & User ──
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("");
  const [vendedoraTipo, setVendedoraTipo] = useState<VendedoraTipo>("DONA");

  // ── Scanner & Bipagem ──
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [searchingCode, setSearchingCode] = useState(false);

  // ── Toast Notifications ──
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const toastTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  // ── Carrinho ──
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  // ── Cliente ──
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [isNovoCliente, setIsNovoCliente] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState({ nome: "", telefone: "", cpf: "" });

  // ── Catálogo Manual (opcional para busca de produtos) ──
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogProdutos, setCatalogProdutos] = useState<Produto[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);

  // ── Checkout & Pagamento ──
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("PIX");
  const [desconto, setDesconto] = useState("");
  const [numParcelas, setNumParcelas] = useState(2);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);

  // ── Venda Concluída ──
  const [vendaRealizada, setVendaRealizada] = useState<{
    id: string;
    parcelas?: Parcela[];
  } | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // ── Toast Helper ──
  const showToast = useCallback((message: string, type: "success" | "error" | "warning") => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);

    toastTimeoutRef.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete toastTimeoutRef.current[id];
    }, 3200);
  }, []);

  // ── Carregar Sessão ──
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const admin = d.role === "administrador";
        setIsAdmin(admin);
        if (!admin) {
          setVendedoraTipo("REVENDEDORA");
        }
        if (d.name) setUserName(d.name);
      })
      .catch(() => setIsAdmin(false));
  }, []);

  // ── Lógica de Bipagem Contínua / Adicionar ao Carrinho ──
  const processarCodigoBipado = useCallback(
    async (codigo: string) => {
      const cleanCode = codigo.trim();
      if (!cleanCode) return;

      setSearchingCode(true);
      try {
        const res = await fetch(`/api/produtos/buscar-codigo?codigo=${encodeURIComponent(cleanCode)}`);
        const data = await res.json();

        if (!res.ok || !data.found) {
          soundEffects.playErrorBeep();
          showToast(`Peça não encontrada no sistema (${cleanCode})`, "error");
          return;
        }

        const produto: Produto = data.produto;

        // Verificar disponibilidade da peça
        if (!data.disponivel) {
          soundEffects.playErrorBeep();
          showToast(`Peça indisponível: ${data.motivo || "não disponível para venda"}`, "error");
          return;
        }

        // Verificar se o item já está no carrinho
        setCarrinho((prev) => {
          const index = prev.findIndex((item) => item.produto.id === produto.id);

          if (index >= 0) {
            const itemAtual = prev[index];
            // Trava de estoque: cada peça semijoia única tem estoque 1 no schema
            if (itemAtual.quantidade >= itemAtual.estoqueMaximo) {
              soundEffects.playErrorBeep();
              showToast(`Estoque máximo atingido para este item (${itemAtual.estoqueMaximo} disp.)`, "warning");
              return prev;
            }

            // Incrementa quantidade
            const novo = [...prev];
            novo[index] = {
              ...itemAtual,
              quantidade: itemAtual.quantidade + 1,
            };
            soundEffects.playSuccessBeep();
            showToast(`+1 ${produto.nome} adicionado`, "success");
            return novo;
          } else {
            // Insere nova linha com quantidade 1
            soundEffects.playSuccessBeep();
            showToast(`${produto.nome} adicionado ao carrinho!`, "success");
            return [...prev, { produto, quantidade: 1, estoqueMaximo: 1 }];
          }
        });
      } catch (error) {
        console.error("Erro ao bipar código:", error);
        soundEffects.playErrorBeep();
        showToast("Erro ao comunicar com o servidor", "error");
      } finally {
        setSearchingCode(false);
      }
    },
    [showToast]
  );

  // ── Controles Rápidos de Quantidade no Carrinho ──
  const incrementarQuantidade = (produtoId: string) => {
    setCarrinho((prev) =>
      prev.map((item) => {
        if (item.produto.id === produtoId) {
          if (item.quantidade >= item.estoqueMaximo) {
            soundEffects.playErrorBeep();
            showToast(`Estoque máximo atingido para este item`, "warning");
            return item;
          }
          soundEffects.playSuccessBeep();
          return { ...item, quantidade: item.quantidade + 1 };
        }
        return item;
      })
    );
  };

  const decrementarQuantidade = (produtoId: string) => {
    setCarrinho((prev) => {
      const item = prev.find((i) => i.produto.id === produtoId);
      if (!item) return prev;

      if (item.quantidade <= 1) {
        return prev.filter((i) => i.produto.id !== produtoId);
      }

      return prev.map((i) =>
        i.produto.id === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i
      );
    });
  };

  const removerItem = (produtoId: string) => {
    setCarrinho((prev) => prev.filter((item) => item.produto.id !== produtoId));
    showToast("Item removido do carrinho", "warning");
  };

  const limparCarrinho = () => {
    if (carrinho.length === 0) return;
    if (confirm("Deseja realmente limpar todo o carrinho?")) {
      setCarrinho([]);
      showToast("Carrinho esvaziado", "warning");
    }
  };

  // ── Cálculos de Totais ──
  const quantidadeTotal = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const valorTotal = carrinho.reduce(
    (acc, item) => acc + Number(item.produto.precoVenda) * item.quantidade,
    0
  );
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

  // ── Buscar Clientes ──
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
      setIsClienteModalOpen(false);
      setNovoClienteForm({ nome: "", telefone: "", cpf: "" });
      showToast(`Cliente ${cliente.nome} selecionado`, "success");
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar cliente");
    }
  };

  // ── Buscar Catálogo Manual ──
  const searchCatalog = useCallback(async (q: string) => {
    setSearchingCatalog(true);
    try {
      const params = new URLSearchParams({ status: "DISPONIVEL" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/produtos?${params}`);
      const data = await res.json();
      setCatalogProdutos(data);
    } finally {
      setSearchingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (isCatalogModalOpen) {
      searchCatalog(catalogSearch);
    }
  }, [catalogSearch, isCatalogModalOpen, searchCatalog]);

  // ── Finalizar Venda ──
  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0) {
      alert("Adicione pelo menos uma peça ao carrinho");
      return;
    }

    // Se não tiver cliente selecionado, abrir modal de cliente antes
    if (!clienteSelecionado) {
      setIsCheckoutModalOpen(false);
      setIsClienteModalOpen(true);
      showToast("Por favor, selecione ou cadastre o cliente da venda", "warning");
      return;
    }

    // Expandir itens de acordo com a quantidade
    const itensApi = carrinho.flatMap((item) =>
      Array.from({ length: item.quantidade }, () => ({
        produtoId: item.produto.id,
        precoUnitario: Number(item.produto.precoVenda),
      }))
    );

    const parcelas = formaPagamento === "PROMISSORIA" ? gerarParcelas() : undefined;

    setSubmitting(true);
    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSelecionado.id,
          vendedoraTipo,
          itens: itensApi,
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
        soundEffects.playErrorBeep();
        alert(err.error || "Erro ao finalizar venda");
        return;
      }

      const venda = await res.json();
      soundEffects.playSuccessBeep();
      setVendaRealizada({ id: venda.id, parcelas });
      setIsCheckoutModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      soundEffects.playErrorBeep();
      alert("Erro ao processar a venda");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPDV = () => {
    setCarrinho([]);
    setClienteSelecionado(null);
    setDesconto("");
    setFormaPagamento("PIX");
    setVendedoraTipo(isAdmin ? "DONA" : "REVENDEDORA");
    setNumParcelas(2);
    setVendaRealizada(null);
    setIsSuccessModalOpen(false);
    setIsScannerActive(true);
    showToast("Novo atendimento iniciado", "success");
  };

  const linkWhatsApp =
    clienteSelecionado && vendaRealizada
      ? gerarLinkComprovanteVenda({
          clienteNome: clienteSelecionado.nome,
          clienteTelefone: clienteSelecionado.telefone,
          itens: carrinho.flatMap((item) =>
            Array.from({ length: item.quantidade }, () => ({
              nome: item.produto.nome,
              preco: Number(item.produto.precoVenda),
            }))
          ),
          valorTotal,
          desconto: descontoNum,
          valorFinal,
          formaPagamento,
          parcelas: vendaRealizada.parcelas?.map((p) => ({
            numero: p.numeroParcela,
            valor: p.valorParcela,
            vencimento: p.dataVencimento,
          })),
          vendedora:
            vendedoraTipo === "DONA"
              ? "Labela Semijoias"
              : userName
              ? `${userName} (Revendedora)`
              : "Revendedora",
        })
      : "#";

  return (
    <div className="min-h-[100dvh] bg-stone-100 flex flex-col pb-28">
      {/* ── Floating Animated Toasts ── */}
      <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-slide-up transition-all ${
              t.type === "success"
                ? "bg-emerald-900/90 border-emerald-500/50 text-emerald-100"
                : t.type === "error"
                ? "bg-rose-900/90 border-rose-500/50 text-rose-100"
                : "bg-amber-900/90 border-amber-500/50 text-amber-100"
            }`}
          >
            {t.type === "success" && <Check className="w-4 h-4 text-emerald-400" />}
            {t.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {t.type === "warning" && <AlertCircle className="w-4 h-4 text-amber-400" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── Top Bar / Header ── */}
      <header className="sticky top-0 z-30 bg-stone-900 text-white border-b border-stone-800 px-4 py-3 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gold-gradient flex items-center justify-center shadow-gold">
              <ShoppingBag className="w-4 h-4 text-stone-900" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Frente de Caixa (PDV)</h1>
              <p className="text-[10px] text-gold-400 font-medium">Bipagem com Câmera Mobile</p>
            </div>
          </div>

          {/* Quick Client Pill */}
          <button
            onClick={() => setIsClienteModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              clienteSelecionado
                ? "bg-emerald-500/15 border-emerald-400 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-stone-800 border-stone-700 text-stone-300 hover:border-gold-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[110px] truncate">
              {clienteSelecionado ? clienteSelecionado.nome : "Cliente"}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4">
        {/* ── ÁREA SUPERIOR: Módulo de Leitor de Câmera ── */}
        <section className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-gold-600" />
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Leitor de Código de Barras
              </span>
            </div>

            {/* Toggle Camera Switch */}
            <button
              onClick={() => setIsScannerActive(!isScannerActive)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isScannerActive
                  ? "bg-stone-900 text-gold-300 hover:bg-stone-800"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {isScannerActive ? (
                <>
                  <Camera className="w-3.5 h-3.5 text-gold-400" />
                  <span>Câmera Ligada</span>
                </>
              ) : (
                <>
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Ligar Câmera</span>
                </>
              )}
            </button>
          </div>

          {/* Scanner Viewport */}
          {isScannerActive && (
            <div className="animate-fade-in">
              <CameraBarcodeScanner
                isActive={isScannerActive}
                onScan={processarCodigoBipado}
                onToggleActive={setIsScannerActive}
                cooldownMs={1500}
                containerId="pdv-live-scanner"
                qrbox={{ width: 280, height: 140 }}
                className="w-full"
              />
            </div>
          )}

          {/* Manual Barcode / SKU Input Bar (Fallback) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCodeInput.trim()) {
                processarCodigoBipado(manualCodeInput);
                setManualCodeInput("");
              }
            }}
            className="flex gap-2 pt-1"
          >
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Digitar código / SKU manualmente..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:border-gold-400 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searchingCode || !manualCodeInput.trim()}
              className="px-3.5 py-2 rounded-xl gold-gradient text-white text-xs font-bold shadow-gold disabled:opacity-40 transition-all flex items-center gap-1 hover:shadow-gold-lg"
            >
              {searchingCode ? <LoadingSpinner size="sm" /> : <Plus className="w-4 h-4" />}
              Bipar
            </button>
          </form>
        </section>

        {/* ── ÁREA CENTRAL: Carrinho de Compras ── */}
        <section className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-800">
                Itens na Venda ({quantidadeTotal})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="text-[11px] font-semibold text-gold-700 hover:text-gold-800 bg-gold-50 hover:bg-gold-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                Buscar Catálogo
              </button>

              {carrinho.length > 0 && (
                <button
                  type="button"
                  onClick={limparCarrinho}
                  className="text-[11px] text-stone-400 hover:text-rose-600 p-1 rounded-lg hover:bg-stone-50 transition-colors"
                  title="Limpar Carrinho"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Carrinho Vazio */}
          {carrinho.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-stone-100 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-300">
                <Barcode className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-700">Carrinho Vazio</p>
              <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1">
                Aponte a câmera para as etiquetas das peças para adicioná-las automaticamente.
              </p>
            </div>
          ) : (
            /* Lista de Itens no Carrinho */
            <div className="space-y-2.5 divide-y divide-stone-100">
              {carrinho.map((item) => (
                <div
                  key={item.produto.id}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 animate-fade-in"
                >
                  {/* Foto e Detalhes */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex-shrink-0 relative">
                      {item.produto.fotoUrl ? (
                        <Image
                          src={item.produto.fotoUrl}
                          alt={item.produto.nome}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <Gem className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-800 truncate">
                        {item.produto.nome}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.produto.sku && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                            {item.produto.sku}
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400">
                          {formatCurrency(item.produto.precoVenda)} un.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controles de Quantidade & Preço */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 overflow-hidden">
                      <button
                        onClick={() => decrementarQuantidade(item.produto.id)}
                        className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:bg-stone-300 transition-colors"
                        title="Diminuir"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-stone-800">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => incrementarQuantidade(item.produto.id)}
                        className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:bg-stone-300 transition-colors"
                        title="Aumentar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <p className="text-xs font-bold text-gold-600">
                        {formatCurrency(Number(item.produto.precoVenda) * item.quantidade)}
                      </p>
                    </div>

                    <button
                      onClick={() => removerItem(item.produto.id)}
                      className="p-1 text-stone-300 hover:text-rose-500 transition-colors"
                      title="Excluir item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── RODAPÉ FIXO: Checkout Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-stone-900 border-t border-stone-800 p-3 shadow-2xl safe-area-bottom">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 uppercase font-semibold tracking-wider">
                Total da Venda
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-300">
                {quantidadeTotal} {quantidadeTotal === 1 ? "item" : "itens"}
              </span>
            </div>
            <p className="text-2xl font-black text-gold-400 leading-tight">
              {formatCurrency(valorTotal)}
            </p>
          </div>

          <button
            id="btn-abrir-checkout"
            onClick={() => {
              if (carrinho.length === 0) {
                showToast("Adicione peças ao carrinho para prosseguir", "warning");
                return;
              }
              setIsCheckoutModalOpen(true);
            }}
            disabled={carrinho.length === 0}
            className="flex-1 max-w-[200px] py-3.5 px-4 gold-gradient text-stone-950 font-bold rounded-2xl shadow-gold flex items-center justify-center gap-2 transition-all hover:shadow-gold-lg disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            <span>Finalizar Venda</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MODAL: Seleção / Cadastro de Cliente ── */}
      <Modal
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        title="Cliente da Venda"
        size="md"
      >
        <div className="p-5 space-y-4">
          {clienteSelecionado ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-800">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-stone-500">{clienteSelecionado.telefone}</p>
                </div>
              </div>
              <button
                onClick={() => setClienteSelecionado(null)}
                className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Trocar
              </button>
            </div>
          ) : (
            <>
              {/* Campo de Busca */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nome ou telefone..."
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400 focus:bg-white transition-all"
                />
                {searchingClientes && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>

              {/* Lista de Resultados */}
              {clientes.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClienteSelecionado(c);
                        setIsClienteModalOpen(false);
                        showToast(`Cliente ${c.nome} selecionado`, "success");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gold-50 transition-colors border-b border-stone-50 last:border-0 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800">{c.nome}</p>
                        <p className="text-[10px] text-stone-400">{c.telefone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Formulário Novo Cliente */}
              {!isNovoCliente ? (
                <button
                  type="button"
                  onClick={() => setIsNovoCliente(true)}
                  className="w-full py-2.5 border-2 border-dashed border-stone-200 hover:border-gold-400 text-stone-600 hover:text-gold-600 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Novo Cliente
                </button>
              ) : (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 animate-slide-up">
                  <h3 className="font-bold text-stone-800 text-xs uppercase tracking-wider">
                    Novo Cliente Rápido
                  </h3>
                  <input
                    type="text"
                    placeholder="Nome completo *"
                    value={novoClienteForm.nome}
                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, nome: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-gold-400"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone com DDD *"
                    value={novoClienteForm.telefone}
                    onChange={(e) =>
                      setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-gold-400"
                  />
                  <input
                    type="text"
                    placeholder="CPF (opcional)"
                    value={novoClienteForm.cpf}
                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, cpf: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-gold-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNovoCliente(false)}
                      className="flex-1 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleNovoCliente}
                      className="flex-1 py-2 rounded-xl gold-gradient text-white text-xs font-bold shadow-gold"
                    >
                      Salvar Cliente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsClienteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Catálogo de Peças (Busca Manual) ── */}
      <Modal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        title="Buscar Peças no Catálogo"
        size="lg"
      >
        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou categoria..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {searchingCatalog ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner label="Buscando peças..." />
              </div>
            ) : catalogProdutos.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">
                Nenhuma peça disponível encontrada
              </div>
            ) : (
              catalogProdutos.map((p) => {
                const inCart = carrinho.some((item) => item.produto.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-2xl hover:border-gold-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 relative">
                        {p.fotoUrl ? (
                          <Image src={p.fotoUrl} alt={p.nome} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <Gem className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-800 truncate">{p.nome}</p>
                        <p className="text-[10px] text-stone-400">
                          {p.sku || p.categoria} · {formatCurrency(p.precoVenda)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        processarCodigoBipado(p.sku || p.id);
                      }}
                      disabled={inCart}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        inCart
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed"
                          : "gold-gradient text-white shadow-gold hover:shadow-gold-lg"
                      }`}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-3 h-3" /> No Carrinho
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Adicionar
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsCatalogModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Fechamento / Checkout & Pagamento ── */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Finalizar Venda"
        size="md"
      >
        <div className="p-5 space-y-4">
          {/* Cliente Info Header */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-700">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-800">
                  {clienteSelecionado ? clienteSelecionado.nome : "Nenhum cliente selecionado"}
                </p>
                <p className="text-[10px] text-stone-400">
                  {clienteSelecionado ? clienteSelecionado.telefone : "Clique para selecionar"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsCheckoutModalOpen(false);
                setIsClienteModalOpen(true);
              }}
              className="text-xs font-semibold text-gold-700 hover:underline"
            >
              {clienteSelecionado ? "Alterar" : "Selecionar"}
            </button>
          </div>

          {/* Vendedora Responsável (Se Admin) */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                Vendedora
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["DONA", "REVENDEDORA"] as VendedoraTipo[]).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setVendedoraTipo(tipo)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
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
          )}

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO.map((fp) => (
                <button
                  key={fp.value}
                  type="button"
                  onClick={() => setFormaPagamento(fp.value)}
                  className={`py-2.5 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    formaPagamento === fp.value
                      ? "border-gold-500 bg-gold-500/10 text-gold-800"
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
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              Desconto (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={valorTotal}
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>

          {/* Configuração de Promissória */}
          {formaPagamento === "PROMISSORIA" && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-3 animate-slide-up">
              <p className="font-bold text-amber-900 text-xs">📄 Configurar Parcelamento</p>
              <div>
                <label className="block text-[11px] text-amber-800 font-semibold mb-1">
                  Número de Parcelas
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumParcelas(n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        numParcelas === n
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-amber-200 bg-white text-amber-800"
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-amber-800 font-semibold mb-1">
                  1º Vencimento
                </label>
                <input
                  type="date"
                  value={primeiroVencimento}
                  onChange={(e) => setPrimeiroVencimento(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-stone-800"
                />
              </div>
            </div>
          )}

          {/* Resumo Final */}
          <div className="p-4 bg-stone-950 text-white rounded-2xl space-y-1.5">
            <div className="flex justify-between text-xs text-stone-400">
              <span>Subtotal ({quantidadeTotal} itens)</span>
              <span>{formatCurrency(valorTotal)}</span>
            </div>
            {descontoNum > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Desconto</span>
                <span>-{formatCurrency(descontoNum)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-stone-800 text-sm font-bold">
              <span>Total a Pagar</span>
              <span className="text-gold-400 text-base">{formatCurrency(valorFinal)}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(false)}
              className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50"
            >
              Voltar
            </button>
            <button
              id="btn-confirmar-venda-final"
              type="button"
              onClick={handleFinalizarVenda}
              disabled={submitting}
              className="flex-1 py-3 gold-gradient text-stone-950 text-xs font-bold rounded-xl shadow-gold hover:shadow-gold-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Venda
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL DE SUCESSO: Comprovante & Reset ── */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => {}} size="sm">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto shadow-gold animate-bounce">
            <CheckCircle className="w-8 h-8 text-stone-950" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-stone-800">Venda Realizada!</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Venda no valor de <strong>{formatCurrency(valorFinal)}</strong> registrada com sucesso.
            </p>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 text-left space-y-1">
            <p>
              <strong>Cliente:</strong> {clienteSelecionado?.nome}
            </p>
            <p>
              <strong>Pagamento:</strong> {formaPagamento}
              {formaPagamento === "PROMISSORIA" && ` (${numParcelas}x)`}
            </p>
            <p>
              <strong>Itens vendidos:</strong> {quantidadeTotal} peça(s)
            </p>
          </div>

          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-enviar-comprovante-whatsapp"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors shadow-md text-xs"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar Comprovante no WhatsApp
          </a>

          <button
            onClick={resetPDV}
            className="w-full py-3 border border-stone-200 rounded-2xl text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Nova Venda (Próximo Cliente)
          </button>
        </div>
      </Modal>
    </div>
  );
}
