import { describe, it, expect, vi } from 'vitest';
import { CheckoutCustomizerService, DEFAULT_CHECKOUT_SETTINGS } from '@/modules/checkout/checkout-customizer-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('CheckoutCustomizerService Unit Tests (Phase 16 - Checkout Customizer)', () => {
  const creatorId = 'creator-customizer-1';
  const strangerId = 'stranger-customizer-2';
  const productId = 'prod-customizer-uuid';
  const testimonialId = 'testimonial-uuid-1';

  it('returns default high-converting settings when unconfigured', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'checkout_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // No custom settings yet
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CheckoutCustomizerService(mockSupabase);
    const settings = await service.getCheckoutSettings(productId);

    expect(settings.productId).toBe(productId);
    expect(settings.showCountdownTimer).toBe(DEFAULT_CHECKOUT_SETTINGS.showCountdownTimer);
    expect(settings.countdownMinutes).toBe(15);
    expect(settings.guaranteeDays).toBe(7);
  });

  it('rejects settings update from non-owner (IDOR defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CheckoutCustomizerService(mockSupabase);

    await expect(
      service.upsertCheckoutSettings(productId, strangerId, {
        showCountdownTimer: false,
      })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('updates checkout settings for legitimate creator', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'checkout_settings') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    product_id: productId,
                    show_countdown_timer: true,
                    countdown_minutes: 20,
                    timer_headline: 'Desconto termina em breve:',
                    show_security_badges: true,
                    guarantee_days: 14,
                    show_social_proof: true,
                    primary_color: '#059669',
                    banner_url: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CheckoutCustomizerService(mockSupabase);
    const updated = await service.upsertCheckoutSettings(productId, creatorId, {
      countdownMinutes: 20,
      guaranteeDays: 14,
      primaryColor: '#059669',
    });

    expect(updated.countdownMinutes).toBe(20);
    expect(updated.guaranteeDays).toBe(14);
    expect(updated.primaryColor).toBe('#059669');
  });

  it('adds customer testimonial and clamps rating between 1 and 5', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'product_testimonials') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: testimonialId,
                    product_id: productId,
                    author_name: 'António K.',
                    author_role: 'Engenheiro de Software',
                    content: 'Excelente didática, aplicou-se perfeitamente no meu trabalho.',
                    rating: 5,
                    avatar_url: null,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const service = new CheckoutCustomizerService(mockSupabase);
    const testimonial = await service.createTestimonial(productId, creatorId, {
      authorName: 'António K.',
      authorRole: 'Engenheiro de Software',
      content: 'Excelente didática, aplicou-se perfeitamente no meu trabalho.',
      rating: 10, // Should be clamped to 5
    });

    expect(testimonial.id).toBe(testimonialId);
    expect(testimonial.authorName).toBe('António K.');
    expect(testimonial.rating).toBe(5);
  });
});
