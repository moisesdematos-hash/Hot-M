import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '@/modules/notifications/email-service';

describe('EmailService Unit Tests (Phase 18 - Transactional Email Gateway)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('runs in simulation mode when RESEND_API_KEY is not configured', async () => {
    const service = new EmailService(undefined);
    const result = await service.sendEmail({
      to: 'cliente@exemplo.com',
      subject: 'Teste de Envio',
      html: '<p>Olá mundo</p>',
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.messageId).toContain('sim_');
  });

  it('calls Resend API when API key is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'resend_msg_123' }),
    });
    global.fetch = mockFetch;

    const service = new EmailService('re_mock_api_key_valid');
    const result = await service.sendEmail({
      to: 'cliente@exemplo.com',
      subject: 'Teste Real',
      html: '<p>Conteúdo</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('resend_msg_123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_mock_api_key_valid',
        }),
      })
    );
  });

  it('handles Resend API HTTP error cleanly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: 'Invalid recipient domain' }),
    });

    const service = new EmailService('re_mock_api_key');
    const result = await service.sendEmail({
      to: 'invalido@dominio',
      subject: 'Falha',
      html: '<p>Erro</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid recipient domain');
  });

  it('generates order confirmation template with complete details', () => {
    const service = new EmailService();
    const email = service.createOrderPaidEmail({
      buyerName: 'João Lourenço',
      orderId: 'order-1234-uuid',
      totalAmount: '15000.00',
      currency: 'AOA',
      productTitle: 'Mentoria Exclusiva de Ecommerce',
      libraryUrl: 'https://hot-m.com/library',
    });

    expect(email.subject).toContain('Mentoria Exclusiva de Ecommerce');
    expect(email.html).toContain('João Lourenço');
    expect(email.html).toContain('15000.00 AOA');
    expect(email.html).toContain('https://hot-m.com/library');
  });

  it('generates withdrawal status template for approved and rejected cases', () => {
    const service = new EmailService();

    const approved = service.createWithdrawalStatusEmail({
      userName: 'Teresa B.',
      amount: '50000.00',
      currency: 'AOA',
      status: 'APPROVED',
    });
    expect(approved.subject).toContain('✅ Levantamento Aprovado');
    expect(approved.html).toContain('liquidado e transferido');

    const rejected = service.createWithdrawalStatusEmail({
      userName: 'Teresa B.',
      amount: '50000.00',
      currency: 'AOA',
      status: 'REJECTED',
      reason: 'IBAN inválido no sistema bancário.',
    });
    expect(rejected.subject).toContain('⚠️ Atualização do seu pedido de levantamento');
    expect(rejected.html).toContain('IBAN inválido no sistema bancário');
  });

  it('generates creator sale alert template with correct role styling', () => {
    const service = new EmailService();
    const alert = service.createSaleAlertEmail({
      beneficiaryName: 'Mateus P.',
      role: 'CREATOR',
      productTitle: 'Guia Definitivo Next.js',
      netAmount: '12500.00',
      currency: 'AOA',
    });

    expect(alert.subject).toContain('Venda de Produtor: +12500.00 AOA');
    expect(alert.html).toContain('Guia Definitivo Next.js');
    expect(alert.html).toContain('+12500.00 AOA');
  });
});
