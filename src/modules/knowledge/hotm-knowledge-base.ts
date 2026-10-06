/**
 * Base de Conhecimento Autônoma do HOT-M (Zero-AI / 100% Offline e Determinístico).
 * Contém o manual técnico, operacional e de negócios de todos os 21 módulos da plataforma.
 */

export interface KnowledgeTopic {
  id: string;
  category: 'MULTICAIXA' | 'FINANCE' | 'PRODUCTS' | 'CONVERSION' | 'AFFILIATES' | 'HOTPLACE' | 'PWA' | 'ADMIN' | 'SUPPORT' | 'GENERAL';
  title: string;
  keywords: string[];
  intentPatterns: RegExp[];
  summary: string;
  answer: string;
  actionLinks?: Array<{ label: string; href: string }>;
  suggestedFollowUps?: string[];
}

export interface AssistantAnswer {
  topicId: string;
  title: string;
  category: string;
  content: string;
  actionLinks?: Array<{ label: string; href: string }>;
  suggestedFollowUps: string[];
  confidence: number;
}

export const HOTM_KNOWLEDGE_BASE: KnowledgeTopic[] = [
  // 1. MULTICAIXA EXPRESS & PROXYPAY
  {
    id: 'multicaixa-how-to-pay',
    category: 'MULTICAIXA',
    title: 'Como pagar com Multicaixa Express e Referência',
    keywords: ['multicaixa', 'express', 'proxypay', 'referencia', 'pagar', 'pagamento', 'atm', 'entidade', 'como pagar', 'comprovativo'],
    intentPatterns: [
      /como (pagar|funciona o pagamento)/i,
      /multicaixa/i,
      /proxypay/i,
      /refer[eê]ncia/i,
      /express/i,
      /atm/i,
      /comprovat/i,
    ],
    summary: 'Pagamentos instantâneos por Multicaixa Express e Referência ProxyPay sem envio de comprovativo.',
    answer: `O HOT-M é integrado de forma nativa com a rede **Multicaixa / ProxyPay de Angola**, oferecendo duas formas automáticas de pagamento:

1. **Multicaixa Express (Telefone):**
   - No checkout, insira o número do telefone associado à sua conta Multicaixa Express.
   - Abra o app Multicaixa Express no celular e confirme a notificação de compra em até 5 minutos.
   - A liberação do curso ou arquivo é **instantânea**!

2. **Pagamento por Referência (ATM ou Internet Banking):**
   - O sistema gera uma **Entidade** (9 dígitos) e uma **Referência** (9 dígitos) com o valor exato em Kwanzas (AOA).
   - Vá a qualquer caixa ATM ou aplicativo do seu banco (BAI Direto, BFA Net, Multicaixa Express, Atlantico Directo, etc.).
   - Selecione: *Pagamentos ➔ Pagamentos por Referência*, digite a Entidade, Referência e confirme.

> ⚡ **Zero Comprovativos Manuais:** O sistema recebe confirmação bancária via Webhook seguro em tempo real e libera seu acesso automaticamente!`,
    actionLinks: [
      { label: '🔥 Explorar Produtos no Hotplace', href: '/marketplace' },
      { label: '🛒 Testar Checkout Multicaixa', href: '/marketplace' },
    ],
    suggestedFollowUps: [
      'Quanto tempo demora para confirmar o pagamento?',
      'O que fazer se a referência expirar?',
      'Como funciona o reembolso?',
    ],
  },
  {
    id: 'payment-confirmation-time',
    category: 'MULTICAIXA',
    title: 'Tempo de confirmação de pagamento Multicaixa',
    keywords: ['tempo', 'demora', 'confirmacao', 'segundos', 'prazo', 'demorar', 'cai na hora'],
    intentPatterns: [
      /quanto tempo (demora|leva)/i,
      /tempo de confirma/i,
      /cai na hora/i,
      /quando libera/i,
    ],
    summary: 'Confirmação bancária entre 3 a 30 segundos com liberação imediata.',
    answer: `A confirmação do pagamento no HOT-M é **praticamente instantânea**:

- **Multicaixa Express:** Confirmado em **3 a 10 segundos** após você autorizar o PIN no app do banco.
- **Referência ATM:** Confirmado em **30 a 60 segundos** após a conclusão da operação no terminal ou internet banking.

Assim que o banco liquida o valor, o motor de eventos do HOT-M:
1. Registra os lançamentos no livro-razão contábil.
2. Credita a carteira do produtor e do afiliado.
3. Envia os dados de acesso para o seu e-mail e libera a aula na **Área de Membros (LMS)**.`,
    actionLinks: [
      { label: '🎓 Acessar Minha Área de Membros', href: '/library' },
    ],
    suggestedFollowUps: [
      'Como pagar com Multicaixa Express e Referência',
      'Como solicitar saque dos valores?',
    ],
  },

  // 2. FINANÇAS & SAQUES
  {
    id: 'finance-withdrawals',
    category: 'FINANCE',
    title: 'Como solicitar saque para conta bancária angolana',
    keywords: ['saque', 'sacar', 'transferir', 'dinheiro', 'levantamento', 'banco', 'iban', 'bfa', 'bai', 'carteira', 'retirar'],
    intentPatterns: [
      /como (sacar|fazer saque|levantar)/i,
      /solicitar saque/i,
      /transferir para o banco/i,
      /iban/i,
      /retirar dinheiro/i,
    ],
    summary: 'Transferência de lucros para conta bancária angolana (IBAN AO06...).',
    answer: `Você pode transferir os seus ganhos em Kwanzas diretamente para qualquer conta bancária em Angola (BAI, BFA, BIC, BCI, Standard Bank, Millennium Atlântico, etc.):

1. Acesse o menu **Finanças ➔ Carteira** no seu painel.
2. Clique no botão **"Solicitar Saque"** (ou acesse \`/dashboard/finance/withdraw\`).
3. Cadastre o seu **IBAN angolano** (começa com \`AO06...\`) e titular da conta.
4. Digite o valor que deseja levantar (respeitando o saldo disponível).
5. Clique em **Confirmar Solicitação**.

> 🛡️ **Segurança Contábil:** O HOT-M opera com livro-razão de partidas dobradas (*double-entry ledger*). No momento em que você solicita o saque, o valor é reservado de forma imutável para impedir duplicidade de saldo.`,
    actionLinks: [
      { label: '💰 Ver Minha Carteira', href: '/dashboard/finance' },
      { label: '💸 Solicitar Saque Agora', href: '/dashboard/finance/withdraw' },
    ],
    suggestedFollowUps: [
      'Qual é o valor mínimo de saque?',
      'O que é Saldo Disponível vs Saldo a Liberar?',
      'Quais são as taxas da plataforma?',
    ],
  },
  {
    id: 'finance-balances-explained',
    category: 'FINANCE',
    title: 'Diferença entre Saldo Disponível, Pendente e Reservado',
    keywords: ['saldo', 'disponivel', 'pendente', 'reservado', 'bloqueado', 'garantia', 'livro razao', 'extrato'],
    intentPatterns: [
      /saldo dispon[ií]vel/i,
      /saldo pendente/i,
      /saldo reservado/i,
      /diferen[cç]a de saldo/i,
      /por que o saldo est[aá] preso/i,
    ],
    summary: 'Entenda como o HOT-M protege as finanças com saldo liberado e período de garantia.',
    answer: `No HOT-M, o seu dinheiro é classificado com transparência bancária total:

- **Saldo Disponível:** É o dinheiro 100% livre que você pode sacar para a sua conta bancária a qualquer momento.
- **Saldo a Liberar (Pendente/Garantia):** Vendas recentes que estão dentro do período de garantia do consumidor (ex: 7 dias). Assim que o prazo expira sem pedido de reembolso, o valor migra automaticamente para Saldo Disponível.
- **Saldo Reservado:** Valores de saques que você já solicitou e estão na fila de liquidação para a sua conta bancária.
- **Total Ganho:** A soma acumulada de todas as vendas brutas realizadas pelo seu perfil.`,
    actionLinks: [
      { label: '📊 Ver Extrato Completo', href: '/dashboard/finance' },
    ],
    suggestedFollowUps: [
      'Como solicitar saque para conta bancária angolana',
      'Quais são as taxas da plataforma?',
    ],
  },

  // 3. PRODUTOS & LMS (ÁREA DE MEMBROS)
  {
    id: 'products-create-new',
    category: 'PRODUCTS',
    title: 'Como cadastrar um produto digital ou curso em vídeo',
    keywords: ['cadastrar produto', 'criar produto', 'novo produto', 'curso', 'ebook', 'aula', 'publicar', 'vender curso'],
    intentPatterns: [
      /como (criar|cadastrar|publicar) (um )?(produto|curso|ebook)/i,
      /vender meu curso/i,
      /adicionar produto/i,
    ],
    summary: 'Passo a passo para publicar infoprodutos e cursos com vídeo e materiais.',
    answer: `Cadastrar seu produto no HOT-M leva menos de 2 minutos:

1. Acesse o **Painel Geral** e clique no botão **"+ Criar Novo Produto"** (ou vá em \`/dashboard/products/new\`).
2. Preencha as informações básicas:
   - **Título e Descrição do Produto**.
   - **Tipo:** Escolha entre **Curso em Vídeo (LMS)** ou **Arquivo Digital / E-book (Download)**.
   - **Preço Principal:** Defina o valor em Kwanzas (ex: \`25.000 Kz\`) ou em outras moedas (USD, EUR, BRL).
3. Faça upload da imagem de capa de alta resolução.
4. Para cursos: cadastre os **Módulos e Aulas** (com links de vídeos e anexos).
5. Clique em **Publicar Produto**!

Seu link de checkout já é gerado automaticamente para você compartilhar no Instagram, WhatsApp ou anúncios!`,
    actionLinks: [
      { label: '➕ Criar Novo Produto Agora', href: '/dashboard/products/new' },
      { label: '📦 Ver Meus Produtos', href: '/dashboard/products' },
    ],
    suggestedFollowUps: [
      'Como funciona a Área de Membros (LMS)?',
      'Como configurar Order Bump e Upsell?',
      'Como colocar meu produto no Hotplace?',
    ],
  },
  {
    id: 'lms-student-area',
    category: 'PRODUCTS',
    title: 'Como funciona a Área de Membros (LMS) para os alunos',
    keywords: ['lms', 'area de membros', 'aluno', 'assistir aula', 'video', 'player', 'progresso', 'curso online', 'materiais'],
    intentPatterns: [
      /area de membros/i,
      /como os alunos assistem/i,
      /player de v[ií]deo/i,
      /lms/i,
      /biblioteca de cursos/i,
    ],
    summary: 'Ambiente completo de aprendizado com player de aula, progresso e anexos.',
    answer: `A Área de Membros (**LMS**) do HOT-M oferece uma experiência estilo streaming moderna:

- **Acesso Automático:** Assim que o Multicaixa confirma o pagamento, o aluno recebe o acesso imediato em \`/library\`.
- **Player de Vídeo Integrado:** Aulas organizadas por módulos sequenciais, com controle de velocidade (1x, 1.5x, 2x) e marcação de aula concluída.
- **Barra de Progresso:** O aluno acompanha a porcentagem do curso concluída.
- **Downloads de Materiais:** Arquivos complementares (PDFs, planilhas Excel, slides) ficam acessíveis abaixo da aula.
- **Proteção:** Conteúdo protegido com verificação de sessão de usuário para evitar pirataria.`,
    actionLinks: [
      { label: '🎓 Ver Biblioteca de Aluno', href: '/library' },
    ],
    suggestedFollowUps: [
      'Como cadastrar um produto digital ou curso em vídeo',
      'O que é o Hotplace e como navegar nele?',
    ],
  },

  // 4. FERRAMENTAS DE CONVERSÃO (BUMPS & UPSELLS)
  {
    id: 'conversion-bump-upsell',
    category: 'CONVERSION',
    title: 'Como aumentar as vendas com Order Bump e Upsell de 1 Clique',
    keywords: ['order bump', 'upsell', 'oto', 'aumentar vendas', 'funil', 'conversao', 'ticket medio', 'checkout customizer'],
    intentPatterns: [
      /order bump/i,
      /upsell/i,
      /funil de vendas/i,
      /aumentar ticket/i,
      /oto/i,
    ],
    summary: 'Aumente o faturamento em até 40% vendendo ofertas complementares no checkout e pós-compra.',
    answer: `O HOT-M possui nativamente os dois maiores aceleradores de faturamento do mercado digital:

1. **Order Bump (No Checkout):**
   - É uma caixinha de marcação que aparece direto no checkout antes do cliente pagar.
   - Ideal para vender um produto complementar barato (ex: *"Leve também o Resumo em PDF por apenas +5.000 Kz"*).
   - O cliente adiciona com 1 clique e os valores somam-se no mesmo pagamento Multicaixa.

2. **Upsell 1-Clique / OTO (One-Time-Offer):**
   - Logo após o pagamento principal ser confirmado, o cliente é direcionado para uma página especial de oferta irresistível.
   - O cliente pode aceitar a oferta sem ter que preencher todo o cadastro novamente.

Você configura ambos diretamente na página de edição do produto no menu **Produtos ➔ Gerenciar**.`,
    actionLinks: [
      { label: '📦 Gerenciar Meus Produtos', href: '/dashboard/products' },
    ],
    suggestedFollowUps: [
      'Como cadastrar um produto digital ou curso em vídeo',
      'Como funciona o Programa de Afiliados?',
    ],
  },

  // 5. AFILIADOS & CO-PRODUÇÃO
  {
    id: 'affiliates-program',
    category: 'AFFILIATES',
    title: 'Como funciona o Programa de Afiliados e Comissões',
    keywords: ['afiliado', 'afiliados', 'comissao', 'link de afiliado', 'vender como afiliado', 'coproducao', 'split'],
    intentPatterns: [
      /como funciona os afiliados/i,
      /programa de afiliados/i,
      /comiss[aã]o de afiliado/i,
      /ganhar como afiliado/i,
      /link de afiliado/i,
      /coprodu/i,
    ],
    summary: 'Recrute vendedores para seu produto ou ganhe até 70% divulgando cursos de terceiros.',
    answer: `O motor de afiliação do HOT-M é determinístico e seguro:

1. **Para Produtores:**
   - No menu **Afiliados**, você pode ativar o programa para qualquer produto seu e definir a comissão (ex: 40%, 50%, 60%).
   - Seu produto passa a aparecer no **Mercado de Afiliação** para que centenas de pessoas vendam para você.

2. **Para Afiliados:**
   - Acesse **Afiliados ➔ Mercado de Afiliação** (\`/dashboard/affiliates\`).
   - Escolha o produto desejado e clique em **"Afiliar-se Agora"**.
   - Você recebe um link exclusivo encurtado no formato \`/r/[seu_codigo]\`.
   - Divulgue o link nas suas redes. Quando alguém compra, o sistema usa **cookies seguros de 30 dias** e credita sua comissão automaticamente no seu extrato!

3. **Co-produção:**
   - Permite dividir os lucros automaticamente com um sócio, especialista ou agência com split garantido.`,
    actionLinks: [
      { label: '🤝 Acessar Mercado de Afiliados', href: '/dashboard/affiliates' },
    ],
    suggestedFollowUps: [
      'Como solicitar saque para conta bancária angolana',
      'O que é o Hotplace e como navegar nele?',
    ],
  },

  // 6. HOTPLACE (MARKETPLACE PÚBLICO)
  {
    id: 'hotplace-overview',
    category: 'HOTPLACE',
    title: 'O que é o Hotplace e como navegar nele',
    keywords: ['hotplace', 'marketplace', 'vitrine', 'loja', 'catalogo', 'cursos angola', 'comprar curso', 'navegar'],
    intentPatterns: [
      /o que [eé] o hotplace/i,
      /marketplace/i,
      /vitrine/i,
      /cat[aá]logo/i,
      /onde comprar cursos/i,
    ],
    summary: 'A maior vitrine pública de cursos, e-books e mentorias de Angola com compra em Kwanzas.',
    answer: `O **Hotplace** (\`/hotplace\` ou \`/marketplace\`) é o catálogo público oficial do HOT-M:

- **Para Compradores e Alunos:**
  - Navegue por nichos: *Marketing & Vendas*, *Negócios & Importação*, *Finanças & BODIVA*, *Tecnologia & IA*, *Idiomas & Educação*.
  - Use a **busca em tempo real** para achar cursos pelo nome do professor ou tema.
  - Veja a temperatura estilo Hotmart (ex: \`🔥 150°\`), notas, depoimentos e o que está incluso no curso.
  - Compre diretamente com **Multicaixa Express ou Referência**.

- **Para Criadores:**
  - Ao publicar seu produto, ele ganha visibilidade instantânea na vitrine para milhares de pessoas em Angola e no exterior!`,
    actionLinks: [
      { label: '🔥 Abrir o Hotplace Agora', href: '/marketplace' },
      { label: '➕ Publicar Produto no Hotplace', href: '/dashboard/products/new' },
    ],
    suggestedFollowUps: [
      'Como pagar com Multicaixa Express e Referência',
      'Como cadastrar um produto digital ou curso em vídeo',
    ],
  },

  // 7. PWA & MODO OFFLINE
  {
    id: 'pwa-install-app',
    category: 'PWA',
    title: 'Como instalar o aplicativo HOT-M (PWA) no celular ou PC',
    keywords: ['pwa', 'aplicativo', 'app', 'instalar', 'baixar app', 'celular', 'telefone', 'android', 'iphone', 'offline'],
    intentPatterns: [
      /como (instalar|baixar) o app/i,
      /instalar no celular/i,
      /instalar no telefone/i,
      /pwa/i,
      /funciona offline/i,
    ],
    summary: 'Instale o HOT-M como app nativo sem precisar da Play Store ou App Store.',
    answer: `O HOT-M é um **PWA (Progressive Web App)** completo. Você pode instalá-lo como um app de celular ou aplicativo de desktop:

- **No Android (Google Chrome):**
  - Ao abrir o site, clique no banner **"📲 Instalar App HOT-M"** no rodapé.
  - Ou clique nos três pontinhos (\`⋮\`) no topo direito e selecione **"Instalar aplicativo"** / **"Adicionar à tela inicial"**.

- **No iPhone / iPad (Safari):**
  - Toque no botão de **Compartilhar** (ícone quadrado com uma seta para cima).
  - Role para baixo e selecione **"Adicionar à Tela de Início"**.

- **No Computador (Chrome / Edge):**
  - Clique no ícone de monitor com seta na barra de endereços ou no banner inferior.

> 📡 **Superpoder Offline:** O app funciona mesmo sem conexão à internet! Cursos e aulas já assistidas continuam salvas no seu aparelho na página \`/offline\`!`,
    actionLinks: [
      { label: '🔥 Ir para a Página Inicial', href: '/' },
      { label: '📡 Ver Tela Offline', href: '/offline' },
    ],
    suggestedFollowUps: [
      'Como funciona a Área de Membros (LMS)?',
      'Como pagar com Multicaixa Express e Referência',
    ],
  },

  // 8. PAINEL ADMIN & PERMISSÕES RBAC
  {
    id: 'admin-panel-rbac',
    category: 'ADMIN',
    title: 'Como funciona o Painel de Administração e Permissões',
    keywords: ['admin', 'administrador', 'super admin', 'paineis', 'painel admin', 'rbac', 'funcoes', 'governança'],
    intentPatterns: [
      /painel de admin/i,
      /como funciona o admin/i,
      /super admin/i,
      /permiss[oõ]es/i,
      /governan/i,
    ],
    summary: 'Controle de liquidez, auditoria de GMV e gestão de papéis de usuários.',
    answer: `O **Centro de Administração do HOT-M** (\`/dashboard/admin\`) é uma área restrita de governança da plataforma:

- **KPIs da Plataforma:** Visualização do Volume Bruto Transacionado (GMV) discriminado em Kwanza (AOA), Dólar (USD), Euro (EUR) e Real (BRL).
- **Gestão de Utilizadores:** Busca e alteração de papéis RBAC:
  - \`BUYER\`: Comprador/Aluno.
  - \`PRODUCER\`: Criador/Produtor de conteúdo.
  - \`AFFILIATE\`: Vendedor afiliado.
  - \`ADMIN\` / \`SUPER_ADMIN\`: Operações globais e gestão da plataforma.
- **Configurações Globais:** Alteração da taxa percentual da HOT-M, prazos de garantia e modo de manutenção.`,
    actionLinks: [
      { label: '🛡️ Acessar Painel de Admin', href: '/dashboard/admin' },
    ],
    suggestedFollowUps: [
      'Quais são as taxas da plataforma?',
      'Como funciona o Suporte e Disputas?',
    ],
  },

  // 9. SUPORTE & DISPUTAS
  {
    id: 'support-and-disputes',
    category: 'SUPPORT',
    title: 'Como funciona a Central de Suporte e Garantia de Reembolso',
    keywords: ['suporte', 'ajuda', 'ticket', 'duvida', 'reembolso', 'garantia', 'disputa', 'cancelar compra', 'devolucao'],
    intentPatterns: [
      /como (pedir|funciona o) reembolso/i,
      /garantia/i,
      /suporte/i,
      /abrir chamado/i,
      /disputa/i,
    ],
    summary: 'Atendimento direto, garantia incondicional de 7 dias e resolução de chamados.',
    answer: `O HOT-M protege alunos e produtores com mediação transparente:

1. **Garantia Incondicional de 7 a 14 Dias:**
   - Todos os produtos possuem garantia assegurada. Se o comprador não ficar satisfeito com o curso, pode solicitar o estorno dentro do prazo.

2. **Abertura de Chamados (Tickets):**
   - Acesse **Suporte** no painel (\`/dashboard/support\`).
   - Você pode enviar mensagens com anexos diretamente para o produtor ou time de moderação.
   - Histórico em tempo real de mensagens com status: *Aberto*, *Em Análise*, *Resolvido*.

3. **Reembolso Seguro:**
   - Ao aprovar o estorno, o saldo do produtor/afiliado é debitado automaticamente no livro-razão e o comprador é ressarcido com conciliação contábil.`,
    actionLinks: [
      { label: '🎧 Acessar Central de Suporte', href: '/dashboard/support' },
    ],
    suggestedFollowUps: [
      'Como solicitar saque para conta bancária angolana',
      'Como pagar com Multicaixa Express e Referência',
    ],
  },

  // 10. GERAL & TAXAS
  {
    id: 'general-platform-fees',
    category: 'GENERAL',
    title: 'Quais são as taxas e comissões da plataforma HOT-M',
    keywords: ['taxa', 'taxas', 'quanto custa', 'comissao plataforma', 'gratis', 'mensalidade', 'preco'],
    intentPatterns: [
      /quanto custa/i,
      /quais (s[aã]o as )?taxas/i,
      /mensalidade/i,
      /tem custo fixo/i,
      /porcentagem/i,
    ],
    summary: 'Zero mensalidade. O HOT-M só ganha uma pequena porcentagem quando você vende.',
    answer: `No HOT-M você **NÃO paga nenhuma mensalidade fixa nem taxa de adesão**:

- **Cadastro Gratuito:** Crie sua conta, cadastre cursos ilimitados e publique checkouts sem pagar nada.
- **Taxa por Venda Realizada:** Apenas quando você realiza uma venda aprovada por Multicaixa ou cartão, uma pequena taxa de intermediação (padrão de 8.5% a 9.9%) é retida automaticamente para cobrir a infraestrutura e a compensação bancária ProxyPay.
- **Você só ganha se vender:** Risco zero para o criador de conteúdo começar seu negócio digital em Angola!`,
    actionLinks: [
      { label: '🚀 Criar Conta Gratuita', href: '/auth/signup' },
      { label: '🔥 Conhecer o Hotplace', href: '/marketplace' },
    ],
    suggestedFollowUps: [
      'Como pagar com Multicaixa Express e Referência',
      'Como solicitar saque para conta bancária angolana',
      'Como cadastrar um produto digital ou curso em vídeo',
    ],
  },
];

/**
 * Motor de Busca Inteligente Offline / Local do HOT-M.
 * Não utiliza chaves de API externas nem internet; utiliza pontuação probabilística ponderada.
 */
export function searchKnowledgeBase(query: string): AssistantAnswer {
  const normalized = query.toLowerCase().trim();

  if (!normalized) {
    return {
      topicId: 'welcome',
      title: 'Olá! Sou o Assistente Oficial do HOT-M ⚡',
      category: 'GENERAL',
      content: `Olá! Sou o guia autônomo da plataforma **HOT-M**. Conheço em detalhes todos os 21 módulos do sistema: pagamentos por **Multicaixa Express**, **saques para bancos angolanos**, **criação de cursos e LMS**, **afiliados**, **Order Bumps**, o catálogo **Hotplace** e o aplicativo **PWA**.

Como posso ajudar você hoje? Escolha um tema abaixo ou digite sua pergunta!`,
      actionLinks: [
        { label: '🔥 Explorar Hotplace', href: '/marketplace' },
        { label: '🚀 Ir para o Painel', href: '/dashboard' },
      ],
      suggestedFollowUps: [
        'Como pagar com Multicaixa Express?',
        'Como cadastrar um curso em vídeo?',
        'Como sacar dinheiro para minha conta bancária?',
        'O que é o Hotplace?',
        'Como instalar o app no celular?',
      ],
      confidence: 1.0,
    };
  }

  // Pontuar cada tópico na base
  const scoredTopics = HOTM_KNOWLEDGE_BASE.map((topic) => {
    let score = 0;

    // 1. Verificação de Regex de intenção (peso 40)
    for (const pattern of topic.intentPatterns) {
      if (pattern.test(normalized)) {
        score += 40;
      }
    }

    // 2. Verificação de palavras-chave (peso 15 cada)
    const queryTokens = normalized.split(/\s+/).filter((w) => w.length > 2);
    for (const token of queryTokens) {
      if (topic.title.toLowerCase().includes(token)) {
        score += 25;
      }
      for (const kw of topic.keywords) {
        if (kw.includes(token) || token.includes(kw)) {
          score += 15;
        }
      }
    }

    return { topic, score };
  });

  scoredTopics.sort((a, b) => b.score - a.score);
  const bestMatch = scoredTopics[0];

  // Se encontrou boa correspondência (score >= 25)
  if (bestMatch && bestMatch.score >= 25) {
    return {
      topicId: bestMatch.topic.id,
      title: bestMatch.topic.title,
      category: bestMatch.topic.category,
      content: bestMatch.topic.answer,
      actionLinks: bestMatch.topic.actionLinks,
      suggestedFollowUps: bestMatch.topic.suggestedFollowUps || [
        'Como pagar com Multicaixa Express?',
        'Como solicitar saque para minha conta?',
      ],
      confidence: Math.min(1.0, bestMatch.score / 60),
    };
  }

  // Fallback inteligente caso a pergunta seja atípica
  return {
    topicId: 'fallback',
    title: 'Posso ajudar com os principais módulos do HOT-M',
    category: 'GENERAL',
    content: `Não encontrei uma resposta exata para "${query}", mas aqui está o que você pode fazer no HOT-M:

1. **Pagamentos:** Saiba como pagar ou receber com Multicaixa Express e Referência bancária.
2. **Produtos & Cursos:** Como cadastrar e-books, módulos de vídeo e Área de Membros.
3. **Financeiro & Saques:** Como acompanhar seu saldo em Kwanzas e transferir para contas bancárias em Angola (BFA, BAI, BIC, etc.).
4. **Vendas & Afiliados:** Configuração de comissões, links exclusivos e Order Bumps.
5. **Hotplace & PWA:** Como navegar na vitrine ou instalar o app no seu smartphone.`,
    actionLinks: [
      { label: '🔥 Acessar Catálogo Hotplace', href: '/marketplace' },
      { label: '🚀 Ir para o Painel Geral', href: '/dashboard' },
      { label: '🎧 Abrir Chamado de Suporte', href: '/dashboard/support' },
    ],
    suggestedFollowUps: [
      'Como pagar com Multicaixa Express?',
      'Como cadastrar um curso em vídeo?',
      'Como solicitar saque para minha conta bancária?',
      'O que é o Hotplace?',
    ],
    confidence: 0.3,
  };
}
