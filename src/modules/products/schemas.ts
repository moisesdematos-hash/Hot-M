import { z } from 'zod';

export const productTypeSchema = z.enum(['DIGITAL_DOWNLOAD', 'COURSE']);
export const productStatusSchema = z.enum([
  'DRAFT',
  'UNDER_REVIEW',
  'PUBLISHED',
  'SUSPENDED',
  'ARCHIVED',
]);

export const createProductSchema = z.object({
  title: z.string().trim().min(3, 'O título deve ter no mínimo 3 caracteres').max(150),
  description: z.string().trim().max(5000).optional(),
  productType: productTypeSchema,
  coverImageUrl: z.string().url('URL inválida para imagem de capa').optional().or(z.literal('')),
  assetFileUrl: z.string().optional().or(z.literal('')),
});

export const updateProductSchema = z.object({
  title: z.string().trim().min(3, 'O título deve ter no mínimo 3 caracteres').max(150).optional(),
  description: z.string().trim().max(5000).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  assetFileUrl: z.string().optional().or(z.literal('')),
});

export const transitionProductStatusSchema = z.object({
  status: productStatusSchema,
  reason: z.string().max(500).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type TransitionProductStatusInput = z.infer<typeof transitionProductStatusSchema>;

export function generateProductSlug(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${normalized}-${randomSuffix}`;
}
