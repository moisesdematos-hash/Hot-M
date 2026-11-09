import { z } from 'zod';

export const PixelProviderEnum = z.enum(['FACEBOOK', 'TIKTOK', 'GOOGLE_ADS']);
export type PixelProvider = z.infer<typeof PixelProviderEnum>;

export const PixelEventEnum = z.enum([
  'PAGE_VIEW',
  'INITIATE_CHECKOUT',
  'ADD_PAYMENT_INFO',
  'PURCHASE',
]);
export type PixelEvent = z.infer<typeof PixelEventEnum>;

export const savePixelSchema = z.object({
  id: z.string().uuid().optional(),
  provider: PixelProviderEnum,
  pixelId: z
    .string()
    .trim()
    .min(3, 'O ID do pixel deve conter pelo menos 3 caracteres')
    .max(100, 'O ID do pixel não pode exceder 100 caracteres')
    .regex(/^[A-Za-z0-9_-]+$/, 'O ID do pixel contém caracteres inválidos'),
  triggerEvents: z.array(PixelEventEnum).min(1, 'Selecione pelo menos um evento para disparar'),
  isActive: z.boolean().default(true),
});

export type SavePixelInput = z.infer<typeof savePixelSchema>;
