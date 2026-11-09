import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { PixelService } from '@/modules/marketing/pixel-service';

describe('PixelService Unit Tests (Phase 21 - Marketing & Pixel Tracking)', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  let service: PixelService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PixelService(mockSupabase as unknown as SupabaseClient);
  });

  it('lists active pixels for a product', async () => {
    const mockData = [
      {
        id: 'pix-1',
        product_id: 'prod-1',
        provider: 'FACEBOOK',
        pixel_id: '1234567890',
        trigger_events: ['INITIATE_CHECKOUT', 'PURCHASE'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((field: string) => {
        if (field === 'is_active') return Promise.resolve({ data: mockData, error: null });
        return mockQuery;
      }),
      order: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await service.listProductPixels('prod-1', true);
    expect(result).toHaveLength(1);
    expect(result[0]!.provider).toBe('FACEBOOK');
    expect(result[0]!.pixelId).toBe('1234567890');
  });

  it('blocks pixel creation if creator does not own product', async () => {
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'prod-1', creator_id: 'other-user' },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockProductQuery);

    await expect(
      service.savePixel('attacker-user', 'prod-1', {
        provider: 'FACEBOOK',
        pixelId: '1234567890',
        triggerEvents: ['PURCHASE'],
        isActive: true,
      })
    ).rejects.toThrow(/ACESSO_NEGADO/);
  });

  it('saves new pixel successfully when owned by creator', async () => {
    // 1. Mock ownership check
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'prod-1', creator_id: 'creator-1' },
        error: null,
      }),
    };

    // 2. Mock upsert
    const mockUpsertQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'new-pix-1',
          product_id: 'prod-1',
          provider: 'TIKTOK',
          pixel_id: 'C_TIKTOK_99',
          trigger_events: ['INITIATE_CHECKOUT', 'PURCHASE'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') return mockProductQuery;
      if (table === 'product_pixels') return mockUpsertQuery;
      return {};
    });

    const result = await service.savePixel('creator-1', 'prod-1', {
      provider: 'TIKTOK',
      pixelId: 'C_TIKTOK_99',
      triggerEvents: ['INITIATE_CHECKOUT', 'PURCHASE'],
      isActive: true,
    });

    expect(result.id).toBe('new-pix-1');
    expect(result.provider).toBe('TIKTOK');
    expect(result.pixelId).toBe('C_TIKTOK_99');
  });

  it('deletes pixel successfully when owned by creator', async () => {
    // 1. Mock ownership check
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'prod-1', creator_id: 'creator-1' },
        error: null,
      }),
    };

    // 2. Mock delete
    const mockDeleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((field: string) => {
        if (field === 'product_id') return Promise.resolve({ error: null });
        return mockDeleteQuery;
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'products') return mockProductQuery;
      if (table === 'product_pixels') return mockDeleteQuery;
      return {};
    });

    const success = await service.deletePixel('creator-1', 'prod-1', 'pix-1');
    expect(success).toBe(true);
  });
});
