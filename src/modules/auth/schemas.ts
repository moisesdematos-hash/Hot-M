import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  fullName: z.string().trim().min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  country: z.string().length(2, 'Código do país deve ter 2 caracteres (ISO 3166-1)').default('AO'),
});

export const signInSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const passwordRecoverySchema = z.object({
  email: z.string().trim().email('Email inválido'),
});

export const passwordResetSchema = z.object({
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PasswordRecoveryInput = z.infer<typeof passwordRecoverySchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
