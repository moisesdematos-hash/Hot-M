import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Termos de Serviço | HOT-M Angola',
  description: 'Termos Gerais de Utilização da Plataforma de Comércio de Infoprodutos HOT-M em Angola.',
};

export default function TermsPage() {
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
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              Marco Legal — República de Angola
            </span>
            <h1 className="text-3xl sm:text-4xl font-black mt-3 text-slate-900 dark:text-white tracking-tight">
              Termos Gerais de Uso e Serviço
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Última atualização: 29 de Outubro de 2026 • Em conformidade com a Lei n.º 2/14 (Lei do Comércio Electrónico).
            </p>
          </div>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Objeto e Natureza da Plataforma</h2>
            <p>
              A <strong>HOT-M</strong> é uma infraestrutura tecnológica de comércio digital de infoprodutos operada na República de Angola, que possibilita a Produtores (Criadores de Conteúdo) publicar, comercializar e entregar produtos digitais (cursos online, videoaulas, e-books, modelos, documentos e licenças), e a Compradores descobrir, adquirir e aceder a esses conteúdos de forma segura e automatizada.
            </p>
            <p>
              A HOT-M não é criadora ou detentora dos conteúdos publicados pelos Produtores, atuando como intermediadora tecnológica, gestora de checkout, operadora de pagamentos via rede bancária Multicaixa e garantidora da liberação de direitos de acesso.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Cadastro de Utilizadores e Segurança da Conta</h2>
            <p>
              O registo na plataforma é gratuito e requer informações verídicas, exatas e completas. É estritamente proibida a criação de contas com identidades falsas, utilização de dados de terceiros sem autorização prévia, ou a partilha de credenciais de acesso.
            </p>
            <p>
              Os Produtores e Afiliados que realizarem movimentações financeiras estão sujeitos aos procedimentos de verificação de identidade (KYC) e deverão informar IBAN angolano válido de titularidade própria para liquidação de saldos.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Processamento de Pagamentos e Moeda</h2>
            <p>
              Todas as transações na plataforma destinadas a compradores em Angola são precificadas e liquidadas em <strong>Kwanzas (AOA)</strong> através da rede interbancária nacional <strong>Multicaixa</strong> (via Multicaixa Express e Referência Bancária de 9 dígitos processadas pelo gateway autorizado ProxyPay / EMIS).
            </p>
            <p>
              O preço final exibido no checkout é fixado de forma inviolável e transparente pelo servidor da HOT-M, não sendo aplicadas taxas ocultas de conversão cambial nas operações em Kwanzas.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Direitos Autorais e Propriedade Intelectual</h2>
            <p>
              É expressamente proibido publicar, comercializar ou distribuir na HOT-M qualquer conteúdo que viole a Lei dos Direitos de Autor e Conexos (Lei n.º 15/14) de Angola, incluindo pirataria, plágio, conteúdo difamatório, software malicioso ou material sem licenciamento comprovado.
            </p>
            <p>
              A HOT-M reserva-se o direito de suspender imediatamente qualquer produto ou conta que seja alvo de denúncia fundada de violação de propriedade intelectual, congelando valores associados até a conclusão da investigação.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Garantia e Direito de Reembolso</h2>
            <p>
              Todo comprador na HOT-M possui garantia incondicional legal mínima de <strong>7 (sete) dias</strong> a contar da confirmação do pagamento, podendo o produtor estender este prazo para 14 ou 30 dias. Os detalhes completos e fluxo de solicitação constam da nossa <Link href="/refund-policy" className="text-orange-600 font-semibold underline">Política de Reembolso e Garantia</Link>.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Legislação Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos e interpretados de acordo com a legislação em vigor na <strong>República de Angola</strong>. Fica eleita a Comarca de Luanda para dirimir quaisquer litígios decorrentes da utilização da plataforma.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <span>Dúvidas? Entre em contacto com a nossa equipa de suporte.</span>
            <Link href="/dashboard/support" className="text-orange-600 font-bold hover:underline">
              Abrir Ticket na Central de Ajuda →
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
