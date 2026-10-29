import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
                H
              </div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-orange-600 via-amber-600 to-slate-900 dark:to-white bg-clip-text text-transparent">
                HOT-M
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
              Angola & Global
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/marketplace" className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1">
              <span>🔥</span> Hotplace
            </Link>
            <a href="#funcionalidades" className="hover:text-orange-600 dark:hover:text-orange-400 transition">
              Recursos
            </a>
            <a href="#multicaixa" className="hover:text-orange-600 dark:hover:text-orange-400 transition">
              Multicaixa Express
            </a>
            <a href="#lms" className="hover:text-orange-600 dark:hover:text-orange-400 transition">
              Área de Membros (LMS)
            </a>
            <a href="#afiliados" className="hover:text-orange-600 dark:hover:text-orange-400 transition">
              Afiliados
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-semibold px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition"
            >
              Entrar
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/25 transition transform active:scale-95"
            >
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-28 lg:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.12),rgba(0,0,0,0))]" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider shadow-xs">
            <span>🇦🇴</span>
            <span>A Maior Plataforma de Infoprodutos e Creator Economy de Angola</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
            Venda os seus cursos e infoprodutos com liquidação instantânea{' '}
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
              Multicaixa Express
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
            Elimine confirmações manuais por WhatsApp. Na <strong>HOT-M</strong>, cada compra gera Entidade e Referência em tempo real, entrega acessos imediatos com proteção DRM e distribui comissões no livro-razão imutável.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-xl shadow-orange-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Começar a Vender Gratuitamente →
            </Link>
            <Link
              href="/library"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Área do Aluno (Minha Biblioteca)
            </Link>
          </div>

          {/* Social Proof / Trust Highlights */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-200 dark:border-slate-800/80">
            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white">0 Kz</div>
              <div className="text-xs text-slate-500">Mensalidade Fixa</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">100%</div>
              <div className="text-xs text-slate-500">Automático via ProxyPay</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white">&lt; 1 seg</div>
              <div className="text-xs text-slate-500">Liberação de Acesso</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">4 Moedas</div>
              <div className="text-xs text-slate-500">AOA, USD, EUR e BRL</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Section */}
      <section id="funcionalidades" className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">
              Tecnologia de Classe Mundial
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Tudo o que você precisa para faturar com produtos digitais em Angola
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              Projetado para eliminar o atrito operacional, proteger a sua receita e acelerar o crescimento do seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: ProxyPay */}
            <div id="multicaixa" className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-orange-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-2xl">
                💳
              </div>
              <h3 className="text-xl font-bold">Multicaixa ProxyPay Nativo</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Geração instantânea de Entidade e Referência Multicaixa em Kz. O comprador paga no Multicaixa Express ou ATM e os acessos são liberados em milissegundos sem intervenção humana.
              </p>
            </div>

            {/* Feature 2: LMS */}
            <div id="lms" className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-orange-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-2xl">
                🎓
              </div>
              <h3 className="text-xl font-bold">Área de Membros & LMS com DRM</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Hospede cursos em vídeo com módulos organizados, marcação de aulas concluídas e proteção estrita contra pirataria e compartilhamento indevido de links.
              </p>
            </div>

            {/* Feature 3: Affiliates & Coproduction */}
            <div id="afiliados" className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-orange-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-2xl">
                🤝
              </div>
              <h3 className="text-xl font-bold">Afiliados & Coprodução Atômica</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Multiplique o seu alcance com exércitos de afiliados e parceiros de coprodução. As comissões são calculadas e creditadas de forma imutável e automática a cada transação.
              </p>
            </div>

            {/* Feature 4: High Converting Checkout */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-orange-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold">Checkouts de Alta Conversão</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Personalize cores, ative timers regressivos de escassez, selos de garantia legal, depoimentos de clientes e notificações dinâmicas de compradores em Luanda, Benguela e Huambo.
              </p>
            </div>

            {/* Feature 5: Funnels & Order Bumps */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-orange-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-2xl">
                🚀
              </div>
              <h3 className="text-xl font-bold">Order Bumps & Upsells OTO</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Aumente o ticket médio das suas vendas em até 40% oferecendo produtos complementares no próprio checkout e páginas de Upsell em 1-clique pós-compra.
              </p>
            </div>

            {/* Feature 6: FX Engine */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-orange-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-2xl">
                💱
              </div>
              <h3 className="text-xl font-bold">Câmbio Multi-Moeda (FX Engine)</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Venda para a diáspora e clientes internacionais com conversão determinística em tempo real entre Kwanza (AOA), Dólar (USD), Euro (EUR) e Real (BRL).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Comparison Section */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Venda Tradicional vs. Plataforma HOT-M
          </h2>
          <p className="text-sm text-slate-500">Veja por que os maiores infoprodutores de Angola migram para a HOT-M</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 space-y-4">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <span>✕</span> O Jeito Manual Antigo
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">❌ Comprovativos falsos enviados pelo WhatsApp.</li>
              <li className="flex items-start gap-2">❌ Horas perdidas conferindo extratos bancários manualmente.</li>
              <li className="flex items-start gap-2">❌ Envio manual de PDFs e links de Drive que vazam na internet.</li>
              <li className="flex items-start gap-2">❌ Impossível escalar vendas de madrugada ou finais de semana.</li>
              <li className="flex items-start gap-2">❌ Dificuldade extrema para controlar e pagar afiliados.</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span>✓</span> Com a HOT-M
            </h3>
            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
              <li className="flex items-start gap-2">✅ Pagamento autenticado diretamente pelo Multicaixa Express.</li>
              <li className="flex items-start gap-2">✅ Acesso liberado no segundo seguinte à confirmação.</li>
              <li className="flex items-start gap-2">✅ Sala de aula protegida por DRM anti-pirataria.</li>
              <li className="flex items-start gap-2">✅ Vendas 24/7 de forma 100% no piloto automático.</li>
              <li className="flex items-start gap-2">✅ Comissões de afiliados calculadas e creditadas no ledger.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Final CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Pronto para faturar com o seu conhecimento digital?
          </h2>
          <p className="text-base sm:text-lg text-orange-100 max-w-2xl mx-auto">
            Cadastre-se agora em menos de 2 minutos. Crie o seu produto, publique o checkout e comece a receber em Kwanzas na sua conta bancária.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/signup"
              className="inline-block px-10 py-4 rounded-2xl bg-white text-orange-600 font-extrabold text-base hover:bg-orange-50 shadow-2xl transition transform hover:scale-105"
            >
              Criar Conta Gratuita Agora →
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
              H
            </div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">HOT-M</span>
            <span className="text-xs text-slate-400">© 2026. Todos os direitos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <Link href="/dashboard" className="hover:text-orange-600 transition">
              Painel de Criador
            </Link>
            <Link href="/library" className="hover:text-orange-600 transition">
              Área do Aluno
            </Link>
            <Link href="/dashboard/finance" className="hover:text-orange-600 transition">
              Carteira Financeira
            </Link>
            <Link href="/terms" className="hover:text-orange-600 transition">
              Termos de Uso
            </Link>
            <Link href="/privacy" className="hover:text-orange-600 transition">
              Privacidade
            </Link>
            <Link href="/refund-policy" className="hover:text-orange-600 transition">
              Garantia & Reembolso
            </Link>
            <Link href="/dashboard/support" className="hover:text-orange-600 transition">
              Central de Atendimento
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
