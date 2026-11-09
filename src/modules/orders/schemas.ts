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
  // Marketing & Ad Traffic Attribution (UTM parameters)
  utmSource: z.string().trim().max(100).optional(),
  utmMedium: z.string().trim().max(100).optional(),
  utmCampaign: z.string().trim().max(100).optional(),
  utmContent: z.string().trim().max(100).optional(),
  utmTerm: z.string().trim().max(100).optional(),
  src: z.string().trim().max(100).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
