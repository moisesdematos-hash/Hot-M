import { z } from 'zod';

export const createOrderSchema = z.object({
  quoteId: z.string().uuid('ID da cotação inválido'),
  affiliateCode: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .optional()
    .or(z.literal('')),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
