import { describe, it, expect } from 'vitest';
import { OrderStateMachine, WithdrawalStateMachine } from '@/core/fintech/state-machines';

describe('Order State Machine (Section 19)', () => {
  it('should allow valid transitions: DRAFT -> PENDING_PAYMENT -> PAID -> FULFILLED', () => {
    expect(OrderStateMachine.canTransition('DRAFT', 'PENDING_PAYMENT')).toBe(true);
    expect(OrderStateMachine.canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
    expect(OrderStateMachine.canTransition('PAID', 'FULFILLED')).toBe(true);
  });

  it('should reject invalid arbitrary transitions (e.g. DRAFT -> PAID, CANCELLED -> PAID)', () => {
    expect(OrderStateMachine.canTransition('DRAFT', 'PAID')).toBe(false);
    expect(() => OrderStateMachine.transition('DRAFT', 'PAID')).toThrow('ILLEGAL_ORDER_TRANSITION');
    expect(OrderStateMachine.canTransition('CANCELLED', 'PAID')).toBe(false);
  });
});

describe('Withdrawal State Machine (Section 20)', () => {
  it('should allow valid transitions: REQUESTED -> UNDER_REVIEW -> APPROVED -> PROCESSING -> PAID', () => {
    expect(WithdrawalStateMachine.canTransition('REQUESTED', 'UNDER_REVIEW')).toBe(true);
    expect(WithdrawalStateMachine.canTransition('UNDER_REVIEW', 'APPROVED')).toBe(true);
    expect(WithdrawalStateMachine.canTransition('APPROVED', 'PROCESSING')).toBe(true);
    expect(WithdrawalStateMachine.canTransition('PROCESSING', 'PAID')).toBe(true);
  });

  it('should never allow jumping directly from REQUESTED to PAID', () => {
    expect(WithdrawalStateMachine.canTransition('REQUESTED', 'PAID')).toBe(false);
    expect(() => WithdrawalStateMachine.transition('REQUESTED', 'PAID')).toThrow(
      'ILLEGAL_WITHDRAWAL_TRANSITION'
    );
  });
});
