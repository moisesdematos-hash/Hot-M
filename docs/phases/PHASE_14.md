# RELATÓRIO DE FASE — PHASE 14: LMS (LEARNING MANAGEMENT SYSTEM)

## 1. Objective
Implementar a infraestrutura completa de LMS (Área de Membros e Gestão de Cursos Digitais) da plataforma HOT-M conforme a Seção 75 e o invariante de proteção a conteúdo digital e direitos do comprador:
- **INV-007: Entitlement access guarantee & DRM protection** (apenas compradores com direito ativo `entitlements.is_active = true` ou o próprio criador do produto têm acesso aos links de vídeo, áudio, materiais e atualização de progresso de aulas).
- Estrutura hierárquica canônica: `Course` $\to$ `Modules` $\to$ `Lessons` $\to$ `StudentProgress`.
- Suporte a múltiplos tipos de mídia: `VIDEO` (players embed YouTube, Vimeo, MP4 nativo), `AUDIO` (podcasts), `PDF` (materiais complementares) e `TEXT` (resumos e notas de aula).
- Sistema determinístico de rastreamento de progresso do aluno (aulas concluídas vs total de aulas $\to$ percentual de 0 a 100%).
- Construtor curricular visual no dashboard do produtor (`/dashboard/products/[id]/course`).
- Sala de aula imersiva moderna do aluno (`/library/courses/[productId]`).

## 2. Implementation
- **Serviço de LMS (`src/modules/lms/lms-service.ts`):**
  - **Inicialização e Gestão de Cursos (`getOrCreateCourse`):**
    - Defesa contra IDOR: verificação rigorosa de que `creator_id` coincide com o autor do produto.
    - Criação idempotente do registro na tabela `courses`.
  - **Consulta de Grade e Proteção DRM (`getCourseCurriculum` & `checkUserAccess`):**
    - Verificação de posse ou entitlement ativo (`entitlements.is_active = true`).
    - Se o usuário não possuir acesso: os metadados e títulos são expostos em modo bloqueado (`isLocked: true`), e os campos confidenciais `content_url` e `body_text` são expurgados (*redacted* como `null`).
    - Se o usuário for aluno matriculado ou criador: entrega os links de vídeo e textos na íntegra.
    - Anexa dados de conclusão individual por aula consultando `student_progress` e calcula percentual global do curso.
  - **Gestão Curricular pelo Produtor:**
    - `createModule`, `updateModule`, `deleteModule`: manipulação de módulos com ordenação e defesa contra IDOR (apenas o criador altera).
    - `createLesson`, `updateLesson`, `deleteLesson`: inclusão e edição de aulas vinculadas aos módulos com validação de tipo de conteúdo (`VIDEO`, `AUDIO`, `PDF`, `TEXT`).
  - **Rastreamento de Progresso do Aluno (`toggleLessonProgress`):**
    - Bloqueio estrito a não pagantes (tenta marcar aula sem entitlement $\to$ rejeição com `FORBIDDEN`).
    - Alternância atômica do estado de conclusão (`is_completed = true/false` com `completed_at`).
- **Rotas de API HTTP REST:**
  - `GET /api/v1/lms/courses/[productId]`: Retorna grade curricular, status de acesso e progresso do aluno autenticado.
  - `POST /api/v1/lms/courses/[productId]/modules`: Criação de módulos pelo criador.
  - `PUT /api/v1/lms/modules/[id]`: Atualização de módulo (título, ordem).
  - `DELETE /api/v1/lms/modules/[id]`: Exclusão de módulo e efeito cascata de aulas.
  - `POST /api/v1/lms/modules/[id]/lessons`: Criação de aula pelo criador.
  - `PUT /api/v1/lms/lessons/[id]`: Edição de aula (links, textos, tipo).
  - `DELETE /api/v1/lms/lessons/[id]`: Exclusão de aula.
  - `POST /api/v1/lms/lessons/[id]/progress`: Alternância do status de conclusão de aula pelo aluno.
- **Interfaces do Usuário (UI):**
  - **Editor Curricular do Produtor (`src/app/dashboard/products/[id]/course/page.tsx`):**
    - Indicadores de total de módulos e total de aulas.
    - Criação dinâmica de módulos e aulas.
    - Seleção de tipo de conteúdo (`VIDEO`, `AUDIO`, `PDF`, `TEXT`).
    - Link rápido para pré-visualização na sala de aula do aluno.
  - **Sala de Aula do Aluno (`src/app/library/courses/[productId]/page.tsx`):**
    - Barreira de DRM inteligente: aviso de aquisição necessária caso o usuário não tenha entitlement ativo.
    - Player adaptativo de vídeo (embed YouTube/Vimeo ou MP4 nativo com aceleração por hardware), player de áudio para podcasts, leitor/download de PDF.
    - Barra de progresso do curso em tempo real no topo da página.
    - Botão "Marcar como Concluída" com atualização otimista instantânea.
    - Navegação linear "Aula Anterior" e "Próxima Aula".
    - Barra lateral com módulos e aulas, indicadores de conclusão em verde e aula ativa em destaque.
  - **Integração na Biblioteca e Catálogo:**
    - Botão "▶ Acessar Aulas" em `src/app/library/page.tsx` redirecionando para a sala de aula digital do curso.
    - Atalho "📚 Grade Curricular" nos cards de produtos do tipo `COURSE` em `src/app/dashboard/products/page.tsx`.

## 3. Files Changed / Created
- `src/modules/lms/lms-service.ts`
- `src/app/api/v1/lms/courses/[productId]/route.ts`
- `src/app/api/v1/lms/courses/[productId]/modules/route.ts`
- `src/app/api/v1/lms/modules/[id]/route.ts`
- `src/app/api/v1/lms/modules/[id]/lessons/route.ts`
- `src/app/api/v1/lms/lessons/[id]/route.ts`
- `src/app/api/v1/lms/lessons/[id]/progress/route.ts`
- `src/app/dashboard/products/[id]/course/page.tsx`
- `src/app/library/courses/[productId]/page.tsx`
- `src/app/dashboard/products/page.tsx`
- `src/app/library/page.tsx`
- `src/tests/unit/lms-service.test.ts`
- `src/tests/integration/lms-lifecycle.test.ts`
- `docs/phases/PHASE_14.md`

## 4. Tests
- **Unit Tests:** 72 testes aprovados em 19 arquivos (`npm run test`).
- **Integration Tests:** 32 testes aprovados em 15 arquivos (`npm run test:integration`).
- **Typecheck:** 0 erros no TypeScript strict (`tsc --noEmit`).
- **Lint:** 0 avisos ou erros (`next lint`).
- **Build:** 39 rotas estáticas e dinâmicas compiladas com sucesso (`next build`).

## 5. Negative & Invariant Tests
- **Tentativa de Invasão IDOR na Grade:** Usuário não-proprietário tentando criar módulos ou aulas é sumariamente bloqueado com `FORBIDDEN`.
- **Proteção de Conteúdo DRM (INV-007):** Usuário não pagante recebendo `contentUrl: null` e `bodyText: null` e status `isLocked: true`.
- **Bloqueio de Progresso a Não Alunos:** Usuário sem entitlement ativo tentando registrar conclusão de aula rejeitado com `FORBIDDEN`.
- **Ciclo de Vida E2E:** Criação de módulo $\to$ criação de aula $\to$ barreira de DRM bloqueando não-aluno $\to$ concessão de acesso pós-pagamento $\to$ desbloqueio do player $\to$ marcação de conclusão $\to$ progressão até 100%.

## 6. Acceptance Criteria
- [x] Serviço de LMS com árvore curricular canônica (`LmsService`).
- [x] Defesa contra IDOR em todas as operações de mutação curricular.
- [x] Proteção DRM ocultando URLs de mídia de usuários sem entitlement ativo.
- [x] Marcação atômica de progresso com cálculo de percentual de conclusão.
- [x] Suporte a formatos de mídia VIDEO, AUDIO, PDF e TEXT.
- [x] Endpoints HTTP REST autenticados e tipados.
- [x] Interface do criador para estruturação visual de módulos e aulas.
- [x] Sala de aula do aluno com player multimídia, navegação e barra de progresso.
- [x] 100% dos testes unitários e de integração verdes.
- [x] Typecheck e build de produção Next.js 15 validados.
