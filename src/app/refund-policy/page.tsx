import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Reembolso e Garantia | HOT-M Angola',
  description: 'Regras de garantia incondicional, prazos de devolução e mediação de disputas na HOT-M.',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
              H
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-orange-600 via-amber-600 to-slate-900 dark:to-white bg-clip-text text-transparent">
              HOT-M
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/" className="text-slate-500 hover:text-orange-600 transition">
              ← Voltar ao Início
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-12 shadow-sm space-y-8">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
              Garantia do Consumidor — 7 a 30 Dias
            </span>
            <h1 className="text-3xl sm:text-4xl font-black mt-3 text-slate-900 dark:text-white tracking-tight">
              Política de Garantia, Reembolso e Disputas
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Última atualização: 29 de Outubro de 2026 • Transparência e segurança total para compradores e produtores.
            </p>
          </div>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Garantia Incondicional de Satisfação</h2>
            <p>
              Todos os produtos digitais comercializados através do checkout da HOT-M contam com um período mínimo obrigatório de <strong>7 (sete) dias corridos de garantia incondicional</strong>, a contar da data de confirmação do pagamento. O produtor pode voluntariamente estender essa garantia para 14 ou 30 dias na configuração da oferta.
            </p>
            <p>
              Durante esse período, se o comprador não estiver satisfeito com o curso, arquivo ou material recebido, poderá solicitar o reembolso integral sem necessidade de justificativa complexa.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Como Solicitar o Reembolso</h2>
            <p>
              O processo de solicitação de reembolso é 100% digital e pode ser iniciado por qualquer uma das seguintes vias:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Pelo Painel do Aluno:</strong> Aceda à sua <Link href="/library" className="text-orange-600 font-semibold underline">Biblioteca de Produtos</Link>, localize o pedido correspondente e clique no botão <em>&ldquo;Solicitar Reembolso&rdquo;</em> dentro do prazo de garantia;
              </li>
              <li>
                <strong>Pela Central de Suporte:</strong> Abra um ticket formal em <Link href="/dashboard/support" className="text-orange-600 font-semibold underline">Central de Atendimento</Link> informando o ID do pedido ou a referência Multicaixa de 9 dígitos;
              </li>
              <li>
                <strong>Pelo Email de Confirmação:</strong> Responda ao email de entrega do produto recebido no momento da compra.
              </li>
            </ol>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Liquidação e Devolução do Dinheiro em Angola</h2>
            <p>
              Assim que o reembolso é aprovado:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Revogação de Acesso:</strong> O acesso do comprador ao curso na área de membros (LMS) ou aos links assinados de download é revogado automaticamente pelo sistema (Invariante INV-007).
              </li>
              <li>
                <strong>Estorno do Pagamento:</strong> Caso o pagamento tenha sido realizado por Multicaixa Express ou Referência Bancária, o estorno financeiro é processado mediante transferência bancária para o IBAN informado pelo comprador no ato do pedido de devolução, em até <strong>3 a 5 dias úteis</strong>.
              </li>
              <li>
                <strong>Ajuste Contábil no Ledger:</strong> A comissão do produtor e do afiliado é deduzida de forma transparente e balanceada no ledger de partidas dobradas.
              </li>
            </ul>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Exceções e Casos de Não Reembolso</h2>
            <p>
              O reembolso não será concedido nas seguintes hipóteses:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Solicitações realizadas após o término do prazo de garantia informado no checkout;</li>
              <li>Comprovada tentativa de fraude, partilha de acessos ou violação de direitos autorais;</li>
              <li>Download integral e consumo em massa de materiais digitais seguido de pedido de devolução com indícios de má-fé técnica.</li>
            </ul>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Mediação de Disputas</h2>
            <p>
              Em caso de discordância entre o Comprador e o Produtor, a equipa de compliance da HOT-M atuará como mediadora imparcial, analisando o conteúdo entregue, o histórico de acessos e os termos da oferta para garantir uma decisão justa e conforme as leis angolanas.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <span>Precisa de ajuda com um pedido recente?</span>
            <Link href="/dashboard/support" className="text-orange-600 font-bold hover:underline">
              Falar com o Suporte HOT-M →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 text-center">
          © 2026 HOT-M Angola. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
