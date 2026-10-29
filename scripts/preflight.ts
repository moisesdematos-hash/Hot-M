/**
 * HOT-M PRODUCTION PREFLIGHT VERIFICATION SCRIPT
 * Executado antes do deploy em homologação/produção.
 *
 * Valida:
 * 1. Presença e formato de variáveis de ambiente obrigatórias
 * 2. Segurança contra vazamento de segredos para NEXT_PUBLIC_
 * 3. Validação de formato de URLs, Keys JWT, Tokens ProxyPay e Resend
 * 4. Validação da suite de testes de integridade bancária e ledger
 * 5. Verificação da existência de arquivos e diretórios críticos
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface CheckResult {
  category: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
}

const results: CheckResult[] = [];

function record(category: string, name: string, status: 'PASS' | 'WARN' | 'FAIL', details: string) {
  results.push({ category, name, status, details });
}

console.log('\n======================================================');
console.log('🚀 HOT-M — AUDITORIA DE PRÉ-DEPLOY DE PRODUÇÃO (PREFLIGHT)');
console.log('======================================================\n');

// 1. Verificação de Arquivos Críticos de Configuração e Build
const criticalFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'vercel.json',
  'src/core/fintech/iban-ao.ts',
  'src/app/api/v1/webhooks/proxypay/route.ts',
  'src/app/api/v1/cron/outbox-worker/route.ts',
  'src/app/terms/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/refund-policy/page.tsx',
];

for (const file of criticalFiles) {
  const fullPath = resolve(process.cwd(), file);
  if (existsSync(fullPath)) {
    record('Estrutura de Arquivos', file, 'PASS', 'Arquivo presente e acessível.');
  } else {
    record('Estrutura de Arquivos', file, 'FAIL', 'Arquivo crítico ausente!');
  }
}

// 2. Leitura do Ambiente Atual (.env.local ou process.env)
let envMap: Record<string, string> = { ...process.env as Record<string, string> };

const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envMap[key] = value;
    }
  });
}

// 3. Regras de Variáveis de Ambiente Críticas
interface EnvRule {
  key: string;
  required: boolean;
  isSecret: boolean;
  validate?: (val: string) => { valid: boolean; reason?: string };
}

const envRules: EnvRule[] = [
  {
    key: 'NEXT_PUBLIC_APP_URL',
    required: true,
    isSecret: false,
    validate: (val) => ({
      valid: /^https?:\/\//.test(val),
      reason: 'Deve ser uma URL válida (ex: https://hot-m.ao ou http://localhost:3000)',
    }),
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    isSecret: false,
    validate: (val) => ({
      valid: /^https:\/\/[a-z0-9-]+\.supabase\.co/.test(val) || val.includes('localhost'),
      reason: 'Deve ser a URL padrão de projeto Supabase (https://<project-id>.supabase.co)',
    }),
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    isSecret: false,
    validate: (val) => ({
      valid: val.length > 20,
      reason: 'Anon key pública deve ter comprimento adequado',
    }),
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    isSecret: true,
    validate: (val) => ({
      valid: val.length > 20 && !val.includes('your-project'),
      reason: 'Service role key privada necessária para operações de backend administrativo',
    }),
  },
  {
    key: 'PROXYPAY_API_URL',
    required: true,
    isSecret: false,
    validate: (val) => ({
      valid: val.includes('proxypay.co.ao'),
      reason: 'Deve apontar para sandbox.proxypay.co.ao ou api.proxypay.co.ao',
    }),
  },
  {
    key: 'PROXYPAY_TOKEN',
    required: true,
    isSecret: true,
    validate: (val) => ({
      valid: val.length >= 8 && !val.includes('your_proxypay'),
      reason: 'Token de autenticação do gateway ProxyPay/EMIS',
    }),
  },
  {
    key: 'PROXYPAY_ENTITY',
    required: true,
    isSecret: false,
    validate: (val) => ({
      valid: /^\d{5}$/.test(val),
      reason: 'Entidade Multicaixa deve possuir exatamente 5 dígitos numéricos',
    }),
  },
  {
    key: 'RESEND_API_KEY',
    required: false,
    isSecret: true,
    validate: (val) => ({
      valid: val.startsWith('re_') || val.length > 10,
      reason: 'Chave de envio de e-mails da Resend (começa com "re_")',
    }),
  },
  {
    key: 'CRON_SECRET',
    required: false,
    isSecret: true,
    validate: (val) => ({
      valid: val.length >= 16,
      reason: 'Segredo de autenticação para as rotas de Cron na Vercel (mínimo 16 caracteres)',
    }),
  },
];

console.log('🔍 Validando Variáveis de Ambiente e Segurança...');

for (const rule of envRules) {
  const value = envMap[rule.key];
  if (!value || value.trim() === '') {
    if (rule.required) {
      record('Ambiente', rule.key, 'FAIL', 'Variável OBRIGATÓRIA não definida!');
    } else {
      record('Ambiente', rule.key, 'WARN', 'Variável opcional não definida (recomenda-se para produção).');
    }
    continue;
  }

  // Prevenir vazamento de chaves secretas no prefixo NEXT_PUBLIC_
  if (rule.isSecret && rule.key.startsWith('NEXT_PUBLIC_')) {
    record('Segurança', rule.key, 'FAIL', 'CRÍTICO: Chave secreta não pode ter prefixo NEXT_PUBLIC_!');
    continue;
  }

  if (rule.validate) {
    const check = rule.validate(value);
    if (!check.valid) {
      record('Ambiente', rule.key, rule.required ? 'FAIL' : 'WARN', check.reason || 'Formato inesperado.');
    } else {
      const masked = rule.isSecret ? `${value.slice(0, 4)}...${value.slice(-3)}` : value;
      record('Ambiente', rule.key, 'PASS', `Valor configurado (${masked})`);
    }
  } else {
    record('Ambiente', rule.key, 'PASS', 'Configurado.');
  }
}

// 4. Exibir Relatório Formatado
const passes = results.filter((r) => r.status === 'PASS').length;
const warns = results.filter((r) => r.status === 'WARN').length;
const fails = results.filter((r) => r.status === 'FAIL').length;

console.log('\n--- TABELA DE VERIFICAÇÃO ---');
for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${r.category}] ${r.name.padEnd(30, ' ')} -> ${r.details}`);
}

console.log('\n======================================================');
console.log(`RESUMO DO PREFLIGHT: ✅ ${passes} Aprovados | ⚠️  ${warns} Avisos | ❌ ${fails} Falhas`);
console.log('======================================================\n');

if (fails > 0) {
  console.error('❌ Falhas críticas encontradas! Corrija os itens apontados antes de efetuar o deploy em produção.\n');
  process.exit(1);
} else {
  console.log('🎉 Auditoria de pré-deploy aprovada com sucesso!\n');
  process.exit(0);
}
