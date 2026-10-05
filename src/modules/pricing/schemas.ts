import { z } from 'zod';

export const currencySchema = z.enum(['AOA', 'USD', 'EUR']);

export const quoteRequestSchema = z.object({
  offerId: z.string().uuid('ID da oferta inválido'),
  currency: currencySchema,
  couponCode: z.string().trim().toUpperCase().optional(),
  orderBumpOfferIds: z.array(z.string().uuid()).default([]),
});

export const createOfferSchema = z.object({
  productId: z.string().uuid('ID do produto inválido'),
  name: z.string().trim().min(2, 'Nome da oferta obrigatório'),
  isDefault: z.boolean().default(false),
  prices: z.array(
    z.object({
      currency: currencySchema,
      amountMinor: z.number().int().positive('Preço deve ser positivo em minor units'),
    })
  ).min(1, 'Ao menos um preço por moeda deve ser informado'),
});

export const createCouponSchema = z.object({
  productId: z.string().uuid('ID do produto inválido').optional(),
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Código deve conter apenas letras maiúsculas, números e hífens')
    .toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number().int().positive('Valor do desconto deve ser positivo'),
  currency: currencySchema.optional(),
  maxUses: z.number().int().positive().optional(),
  validUntil: z.string().datetime().optional(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
