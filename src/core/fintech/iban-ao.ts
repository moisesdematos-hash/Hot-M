/**
 * VALIDADOR E FORMATADOR DE IBAN DA REPÚBLICA DE ANGOLA (AO06)
 * Em conformidade com o Banco Nacional de Angola (BNA) e normas ISO 13616 / ISO 7064.
 *
 * Estrutura do IBAN Angolano (25 caracteres):
 * - Código do País (2 caracteres): "AO"
 * - Dígitos de Controlo Internacionais (2 caracteres): tipicamente "06"
 * - Código do Banco / BBAN (21 dígitos numéricos):
 *   - Código do Banco: 4 dígitos
 *   - Código do Balcão/Agência: 4 dígitos
 *   - Número da Conta: 11 dígitos
 *   - Dígitos de Controlo Nacionais: 2 dígitos
 */

export interface IBANValidationResult {
  isValid: boolean;
  ibanFormatted: string;
  bankCode?: string;
  bankName?: string;
  errorMessage?: string;
}

export const ANGOLAN_BANKS: Record<string, string> = {
  '0040': 'BAI — Banco Angolano de Investimentos',
  '0006': 'BFA — Banco de Fomento Angola',
  '0055': 'Banco BIC / Banco BAI Microfinanças',
  '0051': 'Banco Millennium Atlântico',
  '0043': 'BPC — Banco de Poupança e Crédito',
  '0058': 'Standard Bank de Angola',
  '0059': 'Banco Sol',
  '0060': 'Banco Yetu',
  '0052': 'BCI — Banco de Comércio e Indústria',
  '0045': 'Banco Keve',
  '0048': 'BNI — Banco de Negócios Internacional',
  '0054': 'Banco Valor',
  '0056': 'VTB África',
  '0066': 'Banco Postal',
  '0067': 'Banco de Crédito do Sul (BCS)',
  '0071': 'Access Bank Angola',
};

/**
 * Remove espaços, pontos e traços de uma string de IBAN.
 */
export function sanitizeIBAN(raw: string): string {
  return raw.replace(/[\s.-]/g, '').toUpperCase();
}

/**
 * Formata um IBAN angolano em blocos legíveis: AO06.XXXX.XXXX.XXXX.XXXX.XXXX.X
 */
export function formatAngolanIBAN(raw: string): string {
  const clean = sanitizeIBAN(raw);
  if (clean.length === 0) return '';
  
  // Agrupar em blocos de 4 caracteres
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join('.');
}

/**
 * Validação do algoritmo MOD-97-10 (ISO 7064).
 */
function isValidMod97(cleanIBAN: string): boolean {
  // 1. Mover os primeiros 4 caracteres para o fim: ex. AO06... -> ...AO06
  const rearranged = cleanIBAN.substring(4) + cleanIBAN.substring(0, 4);

  // 2. Substituir letras por valores numéricos (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numericString += (code - 55).toString();
    } else {
      numericString += char;
    }
  }

  // 3. Calcular o resto da divisão por 97 usando BigInt
  try {
    return BigInt(numericString) % 97n === 1n;
  } catch {
    return false;
  }
}

/**
 * Validador rigoroso de IBAN Angolano (AO06).
 */
export function validateAngolanIBAN(input: string): IBANValidationResult {
  const clean = sanitizeIBAN(input);

  if (!clean) {
    return {
      isValid: false,
      ibanFormatted: '',
      errorMessage: 'O IBAN é obrigatório.',
    };
  }

  // 1. Deve iniciar por AO
  if (!clean.startsWith('AO')) {
    return {
      isValid: false,
      ibanFormatted: clean,
      errorMessage: 'O IBAN de Angola deve iniciar com as letras "AO".',
    };
  }

  // 2. Deve ter exatamente 25 caracteres
  if (clean.length !== 25) {
    return {
      isValid: false,
      ibanFormatted: formatAngolanIBAN(clean),
      errorMessage: `O IBAN angolano deve conter exatamente 25 caracteres (foram informados ${clean.length}).`,
    };
  }

  // 3. Os caracteres após "AO" devem ser estritamente dígitos numéricos
  const numericPart = clean.substring(2);
  if (!/^\d{23}$/.test(numericPart)) {
    return {
      isValid: false,
      ibanFormatted: formatAngolanIBAN(clean),
      errorMessage: 'O IBAN angolano deve conter apenas números após o prefixo "AO".',
    };
  }

  // 4. Validação matemática oficial MOD-97 (ISO 7064)
  if (!isValidMod97(clean)) {
    return {
      isValid: false,
      ibanFormatted: formatAngolanIBAN(clean),
      errorMessage: 'Dígitos de verificação do IBAN inválidos (falha no cálculo bancário MOD-97).',
    };
  }

  // Identificar banco emissor pelos primeiros 4 dígitos da conta (caracteres 4 a 8)
  const bankCode = clean.substring(4, 8);
  const bankName = ANGOLAN_BANKS[bankCode] || 'Outro Banco Angolano';

  return {
    isValid: true,
    ibanFormatted: formatAngolanIBAN(clean),
    bankCode,
    bankName,
  };
}
