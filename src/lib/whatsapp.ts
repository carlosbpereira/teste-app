/**
 * Sanitiza um número de telefone brasileiro, removendo formatação e adicionando DDI 55.
 * Aceita formatos como: (11) 99999-9999, 11999999999, +5511999999999
 */
export function sanitizarTelefone(telefone: string): string {
  // Remove tudo que não é dígito
  const soDigitos = telefone.replace(/\D/g, "");

  // Se já começa com 55 e tem 12 ou 13 dígitos, está correto
  if (soDigitos.startsWith("55") && soDigitos.length >= 12) {
    return soDigitos;
  }

  // Se tem 10 ou 11 dígitos (sem DDI), adiciona 55
  if (soDigitos.length === 10 || soDigitos.length === 11) {
    return `55${soDigitos}`;
  }

  return soDigitos;
}

/**
 * Formata um valor em reais para exibição
 */
export function formatarMoeda(valor: number | string): string {
  const numero = typeof valor === "string" ? parseFloat(valor) : valor;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

/**
 * Formata uma data para o padrão brasileiro
 */
export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

interface ComprovanteVendaParams {
  clienteNome: string;
  clienteTelefone: string;
  itens: Array<{ nome: string; preco: number }>;
  valorTotal: number;
  desconto: number;
  valorFinal: number;
  formaPagamento: string;
  parcelas?: Array<{ numero: number; valor: number; vencimento: Date }>;
  vendedora: string;
}

/**
 * Gera link de WhatsApp com comprovante de venda formatado
 */
export function gerarLinkComprovanteVenda(params: ComprovanteVendaParams): string {
  const telefone = sanitizarTelefone(params.clienteTelefone);

  const formasPagamento: Record<string, string> = {
    PIX: "💸 Pix",
    DEBITO: "💳 Cartão de Débito",
    CREDITO: "💳 Cartão de Crédito",
    PROMISSORIA: "📄 Promissória",
  };

  const itensTexto = params.itens
    .map((item) => `  • ${item.nome} — ${formatarMoeda(item.preco)}`)
    .join("\n");

  let mensagem = `✨ *Labela Semijoias* ✨\n`;
  mensagem += `━━━━━━━━━━━━━━━━━\n`;
  mensagem += `*Comprovante de Compra*\n\n`;
  mensagem += `Olá, *${params.clienteNome}*! 💛\n\n`;
  mensagem += `Suas peças:\n${itensTexto}\n\n`;
  mensagem += `━━━━━━━━━━━━━━━━━\n`;

  if (params.desconto > 0) {
    mensagem += `Subtotal: ${formatarMoeda(params.valorTotal)}\n`;
    mensagem += `Desconto: -${formatarMoeda(params.desconto)}\n`;
  }

  mensagem += `*Total: ${formatarMoeda(params.valorFinal)}*\n`;
  mensagem += `Pagamento: ${formasPagamento[params.formaPagamento] || params.formaPagamento}\n`;

  if (params.parcelas && params.parcelas.length > 0) {
    mensagem += `\n📅 *Parcelas:*\n`;
    params.parcelas.forEach((p) => {
      mensagem += `  ${p.numero}ª — ${formatarMoeda(p.valor)} — vence ${formatarData(p.vencimento)}\n`;
    });
  }

  mensagem += `━━━━━━━━━━━━━━━━━\n`;
  mensagem += `Atendimento: ${params.vendedora}\n\n`;
  mensagem += `Obrigada pela preferência! 💛👑\n`;
  mensagem += `_Labela Semijoias_`;

  const mensagemEncoded = encodeURIComponent(mensagem);
  return `https://wa.me/${telefone}?text=${mensagemEncoded}`;
}

interface CobrancaParcelaParams {
  clienteNome: string;
  clienteTelefone: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  dataVencimento: Date;
}

/**
 * Gera link de WhatsApp para cobrança cordial de parcela
 */
export function gerarLinkCobrancaParcela(params: CobrancaParcelaParams): string {
  const telefone = sanitizarTelefone(params.clienteTelefone);

  const diasAtraso = Math.floor(
    (new Date().getTime() - params.dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
  );
  const atrasado = diasAtraso > 0;

  let mensagem = `✨ *Labela Semijoias* ✨\n\n`;
  mensagem += `Olá, *${params.clienteNome}*! 💛\n\n`;

  if (atrasado) {
    mensagem += `Passando para lembrar com carinho sobre a sua parcela ${params.numeroParcela}/${params.totalParcelas} que está em aberto.\n\n`;
    mensagem += `📅 *Vencimento:* ${formatarData(params.dataVencimento)}\n`;
    mensagem += `💰 *Valor:* ${formatarMoeda(params.valorParcela)}\n\n`;
    mensagem += `Quando puder, faça o pagamento para evitar acúmulo. Estamos à disposição! 🙏\n\n`;
  } else {
    mensagem += `Lembrando que a sua parcela ${params.numeroParcela}/${params.totalParcelas} vence em breve:\n\n`;
    mensagem += `📅 *Vencimento:* ${formatarData(params.dataVencimento)}\n`;
    mensagem += `💰 *Valor:* ${formatarMoeda(params.valorParcela)}\n\n`;
    mensagem += `Qualquer dúvida, pode nos chamar! 😊\n\n`;
  }

  mensagem += `_Labela Semijoias — com muito cuidado para você_ 👑`;

  const mensagemEncoded = encodeURIComponent(mensagem);
  return `https://wa.me/${telefone}?text=${mensagemEncoded}`;
}

interface AcertoRevendedoraParams {
  revendedoraNome: string;
  revendedoraTelefone: string;
  periodo: string;
  faturamentoBruto: number;
  percentualComissao: number;
  valorComissao: number;
  valorLiquido: number;
}

/**
 * Gera link de WhatsApp para resumo do acerto da revendedora
 */
export function gerarLinkAcertoRevendedora(params: AcertoRevendedoraParams): string {
  const telefone = sanitizarTelefone(params.revendedoraTelefone);

  let mensagem = `✨ *Labela Semijoias* ✨\n`;
  mensagem += `━━━━━━━━━━━━━━━━━\n`;
  mensagem += `*Acerto de Revendedora*\n`;
  mensagem += `📅 Período: ${params.periodo}\n\n`;
  mensagem += `Olá! Segue o resumo do acerto:\n\n`;
  mensagem += `💰 Faturamento Bruto: ${formatarMoeda(params.faturamentoBruto)}\n`;
  mensagem += `📊 Comissão (${params.percentualComissao}%): ${formatarMoeda(params.valorComissao)}\n`;
  mensagem += `━━━━━━━━━━━━━━━━━\n`;
  mensagem += `*💸 A Repassar para Labela: ${formatarMoeda(params.valorLiquido)}*\n\n`;
  mensagem += `Obrigada pela parceria! 💛👑\n`;
  mensagem += `_Labela Semijoias_`;

  const mensagemEncoded = encodeURIComponent(mensagem);
  return `https://wa.me/${telefone}?text=${mensagemEncoded}`;
}
