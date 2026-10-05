import { describe, it, expect } from 'vitest';
import {
  createProductSchema,
  generateProductSlug,
  transitionProductStatusSchema,
} from '@/modules/products/schemas';

describe('Product Validation Schemas & Slug Generator', () => {
  it('should validate valid DIGITAL_DOWNLOAD product input', () => {
    const valid = {
      title: 'E-book de Investimentos Imobiliários',
      description: 'Guia prático para investidores em Luanda',
      productType: 'DIGITAL_DOWNLOAD',
      assetFileUrl: 'products/ebook-investimentos.pdf',
    };

    const res = createProductSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('should validate valid COURSE product input', () => {
    const valid = {
      title: 'Curso Completo de Marketing Digital',
      description: 'Formação completa com mais de 30 aulas gravadas',
      productType: 'COURSE',
      coverImageUrl: 'https://cdn.hot-m.com/covers/marketing.jpg',
    };

    const res = createProductSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('should reject titles shorter than 3 characters', () => {
    const invalid = {
      title: 'Oi',
      productType: 'COURSE',
    };
    expect(createProductSchema.safeParse(invalid).success).toBe(false);
  });

  it('should reject invalid product types', () => {
    const invalid = {
      title: 'Produto Físico',
      productType: 'PHYSICAL_GOOD',
    };
    expect(createProductSchema.safeParse(invalid).success).toBe(false);
  });

  it('should generate URL-friendly slugs normalizing accents and special characters', () => {
    const slug = generateProductSlug('Aprenda Programação Rápido em Angola & 2026!');
    expect(slug).toMatch(/^aprenda-programacao-rapido-em-angola-2026-[a-z0-9]{4}$/);
  });

  it('should validate status transition payloads', () => {
    expect(transitionProductStatusSchema.safeParse({ status: 'PUBLISHED' }).success).toBe(true);
    expect(transitionProductStatusSchema.safeParse({ status: 'INVALID_STATUS' }).success).toBe(false);
  });
});
