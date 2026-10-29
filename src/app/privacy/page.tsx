import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | HOT-M Angola',
  description: 'Política de Privacidade e Protecção de Dados Pessoais da Plataforma HOT-M em Angola.',
};

export default function PrivacyPage() {
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
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              Protecção de Dados — Lei n.º 22/11 de Angola
            </span>
            <h1 className="text-3xl sm:text-4xl font-black mt-3 text-slate-900 dark:text-white tracking-tight">
              Política de Privacidade e Dados Pessoais
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Última atualização: 29 de Outubro de 2026 • Em conformidade com a Lei de Protecção de Dados Pessoais da República de Angola.
            </p>
          </div>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Princípios de Privacidade</h2>
            <p>
              A <strong>HOT-M</strong> assume o compromisso inegociável de proteger a privacidade, a confidencialidade e a segurança dos dados pessoais de todos os seus utilizadores (Compradores, Produtores e Afiliados). Coletamos apenas os dados estritamente necessários para a execução dos contratos de compra e venda, emissão de comprovativos e prestação de serviços.
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Dados Pessoais Coletados</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Compradores:</strong> Nome completo, endereço de correio eletrónico (email) para envio de acessos e comprovativos, e número de telefone para processamento de pagamentos via Multicaixa Express.
              </li>
              <li>
                <strong>Produtores e Afiliados:</strong> Nome legal/empresarial, NIF (Número de Identificação Fiscal), dados bancários angolanos (IBAN AO06 e nome do titular) para repasse financeiro de saques, além de histórico de vendas e comissões.
              </li>
              <li>
                <strong>Dados Técnicos:</strong> Endereço IP (para prevenção de fraudes e auditoria de segurança), tipo de navegador, registros de auditoria e tokens de sessão criptografados via JWT.
              </li>
            </ul>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Finalidade e Tratamento dos Dados</h2>
            <p>
              Os dados coletados destinam-se exclusivamente a:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Processar compras e gerar referências de pagamento Multicaixa através do gateway ProxyPay / EMIS;</li>
              <li>Criar e gerir os direitos de acesso digital (entitlements) na área do aluno e LMS;</li>
              <li>Calcular e creditar comissões em carteiras imutáveis de produtores e parceiros;</li>
              <li>Prevenir fraudes, ataques de negação de serviço e acessos não autorizados;</li>
              <li>Cumprir obrigações legais, regulatórias e fiscais exigidas pelas autoridades da República de Angola.</li>
            </ol>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Não Compartilhamento e Não Comercialização</h2>
            <p>
              <strong>A HOT-M nunca vende, aluga ou cede dados pessoais a terceiros para fins de marketing.</strong> Os dados são compartilhados exclusivamente com os operadores estritamente necessários à prestação do serviço (gateway ProxyPay para cobrança bancária e Resend para envio do link de acesso).
            </p>
          </section>

          <section className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Direitos do Titular dos Dados</h2>
            <p>
              Nos termos da Lei n.º 22/11, todo utilizador tem direito a solicitar o acesso, a retificação, a atualização ou a eliminação dos seus dados pessoais mantidos na plataforma, desde que não conflitem com prazos legais de retenção financeira e fiscal estabelecidos pelo Banco Nacional de Angola e pela Administração Geral Tributária.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
            <span>Para exercer os seus direitos de privacidade, contacte o encarregado de protecção de dados.</span>
            <Link href="/dashboard/support" className="text-orange-600 font-bold hover:underline">
              Canal de Privacidade e Apoio →
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
