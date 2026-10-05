import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { ProxyPayAdapter } from '@/modules/payments/providers/proxypay';
import { Money } from '@/core/fintech/money';

describe('ProxyPayAdapter Integration Test (Section 9.4 & 29)', () => {
  const mockConfig = {
    apiUrl: 'https://api.sandbox.proxypay.co.ao',
    token: 'test_token_123',
    entity: '99999',
    webhookSecret: 'secret_hmac_key_for_testing',
  };

  const adapter = new ProxyPayAdapter(mockConfig);

  it('should generate a valid Multicaixa reference contract for AOA currency', async () => {
    const res = await adapter.createPayment({
      orderId: 'ord-test-001',
      amount: Money.fromMinor(500000, 'AOA'), // 5,000.00 AOA
      customer: {
        id: 'cust-1',
        email: 'buyer@test.ao',
        name: 'Comprador Teste',
      },
    });

    expect(res.paymentMethod).toBe('MULTICAIXA_REFERENCE');
    expect(res.instructions.entity).toBe('99999');
    expect(res.instructions.reference).toHaveLength(9);
    expect(res.instructions.amount).toBe('5000.00');
  });

  it('should reject payment creation with non-AOA currency', async () => {
    await expect(
      adapter.createPayment({
        orderId: 'ord-test-err',
        amount: Money.fromMinor(1000, 'USD'),
        customer: {
          id: 'cust-1',
          email: 'buyer@test.ao',
          name: 'Comprador Teste',
        },
      })
    ).rejects.toThrow('ProxyPay only supports AOA currency');
  });

  it('should verify authentic webhook signature with HMAC SHA256', () => {
    const payload = JSON.stringify({
      id: 'evt-100',
      reference_id: '123456789',
      amount: '5000.00',
      datetime: '2026-03-01T12:00:00Z',
      status: 'accepted',
    });

    const hmac = crypto.createHmac('sha256', mockConfig.webhookSecret);
    hmac.update(payload);
    const validSignature = hmac.digest('hex');

    const isValid = adapter.verifyWebhook({ 'x-signature': validSignature }, payload);
    expect(isValid).toBe(true);

    const isInvalid = adapter.verifyWebhook({ 'x-signature': 'forged_fake_sig' }, payload);
    expect(isInvalid).toBe(false);
  });

  it('should parse normalized event from webhook body', () => {
    const payload = JSON.stringify({
      id: 'tx-888',
      reference_id: '123456789',
      amount: '5000.00',
      datetime: '2026-03-01T12:00:00Z',
      status: 'accepted',
      custom_fields: { order_id: 'ord-canonical-1' },
    });

    const event = adapter.parseEvent(payload);
    expect(event.eventId).toBe('tx-888');
    expect(event.orderId).toBe('ord-canonical-1');
    expect(event.status).toBe('PAID');
    expect(event.paidAmount?.amount).toBe(500000n);
    expect(event.paidAmount?.currency).toBe('AOA');
  });
});
