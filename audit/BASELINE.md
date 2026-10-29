# BASELINE DIAGNÓSTICO REPRODUZÍVEL — HOT-M

- **Data/Hora:** 2026-10-29T10:18:00Z
- **Branch:** `audit-saas-master-360`
- **Commit SHA Inicial:** `329a55178ebc044542f11b6ae3bb0c0333852072`
- **Ambiente:** Local / Windows 11 / Node.js 22 / Next.js 15.5.27

---

## 1. Versões e Dependências Chave
- `next`: `15.5.27` / `15.2.1`
- `react`: `19.0.0`
- `react-dom`: `19.0.0`
- `typescript`: `5.8.x`
- `vitest`: `3.2.7`
- `@supabase/supabase-js`: `^2.48.1`
- `@supabase/ssr`: `^0.5.2`
- `zod`: `^3.24.2`
- `lucide-react`: `^0.475.0`

---

## 2. Resultados dos Comandos de Baseline

| Comando | Executado? | Resultado | Detalhes / Evidências |
| :--- | :---: | :---: | :--- |
| `npx tsc --noEmit` | Sim | **PASS** | 0 erros de tipagem. Modo estrito aprovado. |
| `npm test` | Sim | **PASS** | 28 arquivos de teste unitário, 119 testes aprovados (100%). |
| `npm run test:integration` | Sim | **PASS** | 22 arquivos de teste de integração, 40 testes aprovados (100%). |
| `npm run lint` | Sim | **PASS** | 0 erros. (Avisos não impeditivos de img mantidos). |
| `npm run build` | Sim | **PASS** | Compilado e gerado com sucesso (56/56 páginas e rotas geradas). |

---

## 3. Problemas e Falhas Diagnosticadas

### Defeito BL-001 (Severidade: P2) — Violação de Regra ESLint (`no-explicit-any`) em Teste de Auditoria
- **Arquivo:** `src/tests/integration/master-production-audit.test.ts`
- **Linhas:** 47, 175, 252, 273
- **Sintoma:** O ESLint acusa `Unexpected any. Specify a different type` ao verificar tipos genéricos mockados no teste de integração mestre.
- **Impacto:** Bloqueia o comando `next build` em pipeline de CI/CD que roda `next lint` embutido.

### Defeito BL-002 (Severidade: P3) — Avisos de Performance / Lint no Marketplace
- **Arquivo:** `src/app/marketplace/page.tsx`
- **Linhas:** 79, 348, 466
- **Sintoma:** Dependência ausente no `useEffect` (`categories.length`) e uso de `<img>` ao invés de `<Image />` do Next.js.
- **Impacto:** Menor otimização de imagem (LCP) e potencial re-execução de hook.

---

## 4. Estado de Configuração Segura
- `.env.local` configurado com chaves seguras e isoladas.
- Secrets de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `PROXYPAY_TOKEN`, etc.) nunca prefixadas com `NEXT_PUBLIC_`.
- Políticas RLS presentes em todas as tabelas do Supabase.
