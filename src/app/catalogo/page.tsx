"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Filter,
  Upload,
  X,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Camera,
  Package,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge, StatusBadge, LocalizacaoBadge } from "@/components/ui/Badge";
import { LoadingSpinner, SkeletonCard } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { uploadProductImage } from "@/lib/supabase";

type Categoria = "BRINCO" | "COLAR" | "ANEL" | "PULSEIRA" | "CONJUNTO";
type Status = "DISPONIVEL" | "RESERVADO" | "VENDIDO";
type Localizacao = "DONA" | "REVENDEDORA";

interface Produto {
  id: string;
  sku?: string;
  nome: string;
  descricao?: string;
  categoria: Categoria;
  precoCusto: number;
  precoVenda: number;
  fotoUrl?: string;
  status: Status;
  localizacao: Localizacao;
  criadoEm: string;
}

const CATEGORIAS: Categoria[] = ["BRINCO", "COLAR", "ANEL", "PULSEIRA", "CONJUNTO"];
const CATEGORIA_LABELS: Record<Categoria, string> = {
  BRINCO: "Brinco",
  COLAR: "Colar",
  ANEL: "Anel",
  PULSEIRA: "Pulseira",
  CONJUNTO: "Conjunto",
};

const emptyForm = {
  nome: "",
  sku: "",
  descricao: "",
  categoria: "BRINCO" as Categoria,
  precoCusto: "",
  precoVenda: "",
  fotoUrl: "",
  status: "DISPONIVEL" as Status,
  localizacao: "DONA" as Localizacao,
};

export default function CatalogoPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocalizacao, setFilterLocalizacao] = useState("");

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (filterCategoria) params.set("categoria", filterCategoria);
      if (filterStatus) params.set("status", filterStatus);
      if (filterLocalizacao) params.set("localizacao", filterLocalizacao);

      const res = await fetch(`/api/produtos?${params}`);
      const data = await res.json();
      setProdutos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, filterCategoria, filterStatus, filterLocalizacao]);

  useEffect(() => {
    const timer = setTimeout(fetchProdutos, 300);
    return () => clearTimeout(timer);
  }, [fetchProdutos]);

  const openCreate = () => {
    setEditingProduto(null);
    setForm(emptyForm);
    setPreviewUrl("");
    setIsModalOpen(true);
  };

  const openEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setForm({
      nome: produto.nome,
      sku: produto.sku || "",
      descricao: produto.descricao || "",
      categoria: produto.categoria,
      precoCusto: produto.precoCusto.toString(),
      precoVenda: produto.precoVenda.toString(),
      fotoUrl: produto.fotoUrl || "",
      status: produto.status,
      localizacao: produto.localizacao,
    });
    setPreviewUrl(produto.fotoUrl || "");
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setUploadingImage(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const fileName = `produto-${timestamp}.${ext}`;
      const url = await uploadProductImage(file, fileName);
      if (url) {
        setForm((prev) => ({ ...prev, fotoUrl: url }));
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome || !form.categoria || !form.precoCusto || !form.precoVenda) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const body = {
        nome: form.nome,
        sku: form.sku || undefined,
        descricao: form.descricao || undefined,
        categoria: form.categoria,
        precoCusto: parseFloat(form.precoCusto),
        precoVenda: parseFloat(form.precoVenda),
        fotoUrl: form.fotoUrl || undefined,
        status: form.status,
        localizacao: form.localizacao,
      };

      if (editingProduto) {
        await fetch(`/api/produtos/${editingProduto.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/produtos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      setIsModalOpen(false);
      fetchProdutos();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTransferirCustodia = async (produto: Produto) => {
    try {
      await fetch(`/api/produtos/${produto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transferir-custodia" }),
      });
      fetchProdutos();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (produto: Produto) => {
    if (!confirm(`Excluir "${produto.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await fetch(`/api/produtos/${produto.id}`, { method: "DELETE" });
      fetchProdutos();
    } catch (error) {
      console.error(error);
    }
  };

  const totalPorCategoria = CATEGORIAS.reduce(
    (acc, cat) => ({
      ...acc,
      [cat]: produtos.filter((p) => p.categoria === cat).length,
    }),
    {} as Record<Categoria, number>
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Catálogo & Estoque</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {produtos.length} {produtos.length === 1 ? "peça" : "peças"} encontradas
          </p>
        </div>
        <button
          id="btn-novo-produto"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 gold-gradient text-white rounded-xl font-semibold text-sm shadow-gold hover:shadow-gold-lg transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Peça</span>
        </button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        <button
          onClick={() => setFilterCategoria("")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !filterCategoria
              ? "bg-stone-900 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-gold-300"
          }`}
        >
          Todas
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategoria(filterCategoria === cat ? "" : cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterCategoria === cat
                ? "gold-gradient text-white shadow-sm"
                : "bg-white border border-stone-200 text-stone-600 hover:border-gold-300"
            }`}
          >
            {CATEGORIA_LABELS[cat]}
            {totalPorCategoria[cat] > 0 && (
              <span className={`text-[10px] ${filterCategoria === cat ? "text-white/80" : "text-stone-400"}`}>
                {totalPorCategoria[cat]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-600 focus:outline-none focus:border-gold-400 transition-all"
        >
          <option value="">Status</option>
          <option value="DISPONIVEL">Disponível</option>
          <option value="RESERVADO">Reservado</option>
          <option value="VENDIDO">Vendido</option>
        </select>
        <select
          value={filterLocalizacao}
          onChange={(e) => setFilterLocalizacao(e.target.value)}
          className="hidden sm:block px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-600 focus:outline-none focus:border-gold-400 transition-all"
        >
          <option value="">Local</option>
          <option value="DONA">Com a Dona</option>
          <option value="REVENDEDORA">Com Revendedora</option>
        </select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : produtos.length === 0 ? (
        <EmptyState
          icon="💎"
          title="Nenhuma peça encontrada"
          description="Cadastre sua primeira peça ou ajuste os filtros de busca"
          action={
            <button
              onClick={openCreate}
              className="px-5 py-2.5 gold-gradient text-white rounded-xl font-semibold text-sm shadow-gold"
            >
              Cadastrar Peça
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="bg-white rounded-2xl border border-stone-100 overflow-hidden hover:border-gold-200 hover:shadow-gold transition-all duration-200 group"
            >
              {/* Foto */}
              <div className="relative aspect-square bg-stone-50 overflow-hidden">
                {produto.fotoUrl ? (
                  <Image
                    src={produto.fotoUrl}
                    alt={produto.nome}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-stone-200" />
                  </div>
                )}

                {/* Status badge overlay */}
                <div className="absolute top-2 left-2">
                  <StatusBadge status={produto.status} />
                </div>

                {/* Quick actions */}
                <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => openEdit(produto)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-gold-50 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4 text-stone-700" />
                  </button>
                  <button
                    onClick={() => handleDelete(produto)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-red-50 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="font-semibold text-stone-800 text-sm truncate">{produto.nome}</p>
                {produto.sku && (
                  <p className="text-[10px] text-stone-400 mb-1">SKU: {produto.sku}</p>
                )}
                <LocalizacaoBadge localizacao={produto.localizacao} />

                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-xs text-stone-400">{CATEGORIA_LABELS[produto.categoria]}</p>
                    <p className="font-bold text-gold-600 text-sm">
                      {formatCurrency(produto.precoVenda)}
                    </p>
                  </div>
                  {produto.status !== "VENDIDO" && (
                    <button
                      onClick={() => handleTransferirCustodia(produto)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-stone-200 text-stone-500 hover:border-gold-300 hover:text-gold-600 transition-all text-[10px] font-medium"
                      title="Transferir custódia"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span className="hidden sm:inline">Transferir</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduto ? "Editar Peça" : "Cadastrar Nova Peça"}
        size="lg"
      >
        <div className="p-5 space-y-5">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Foto da Peça</label>
            <div
              className="relative aspect-video rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 overflow-hidden cursor-pointer hover:border-gold-400 hover:bg-gold-50/30 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <>
                  <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                  <div className="absolute inset-0 bg-stone-900/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white rounded-full p-3 shadow-lg">
                      <Camera className="w-5 h-5 text-stone-700" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                  {uploadingImage ? (
                    <LoadingSpinner size="md" label="Enviando foto..." />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-stone-300" />
                      <p className="text-sm text-stone-400">Clique para enviar uma foto</p>
                      <p className="text-xs text-stone-300">JPG, PNG, WebP até 5MB</p>
                    </>
                  )}
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <LoadingSpinner size="md" label="Enviando..." />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Nome da Peça <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Brinco Argola Dourado"
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Ex: BRN-001"
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Categoria <span className="text-red-400">*</span>
              </label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORIA_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Preço de Custo <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precoCusto}
                  onChange={(e) => setForm({ ...form, precoCusto: e.target.value })}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Preço de Venda <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precoVenda}
                  onChange={(e) => setForm({ ...form, precoVenda: e.target.value })}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all"
                />
              </div>
              {form.precoCusto && form.precoVenda && (
                <p className="text-xs text-emerald-600 mt-1">
                  Margem:{" "}
                  {(
                    ((parseFloat(form.precoVenda) - parseFloat(form.precoCusto)) /
                      parseFloat(form.precoCusto)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
              >
                <option value="DISPONIVEL">Disponível</option>
                <option value="RESERVADO">Reservado</option>
                <option value="VENDIDO">Vendido</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Localização</label>
              <select
                value={form.localizacao}
                onChange={(e) => setForm({ ...form, localizacao: e.target.value as Localizacao })}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
              >
                <option value="DONA">Com a Dona</option>
                <option value="REVENDEDORA">Com a Revendedora</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes da peça..."
                rows={3}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium text-sm hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-salvar-produto"
              onClick={handleSave}
              disabled={saving || uploadingImage}
              className="flex-1 py-2.5 rounded-xl gold-gradient text-white font-semibold text-sm shadow-gold hover:shadow-gold-lg transition-all disabled:opacity-50"
            >
              {saving ? "Salvando..." : editingProduto ? "Salvar Alterações" : "Cadastrar Peça"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
