/**
 * HOT-M FINTECH STATE MACHINES
 * 
 * Strict deterministic state transitions. No arbitrary jumps allowed.
 */

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FULFILLED'
  | 'PAYMENT_FAILED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'CHARGEBACK';

export type WithdrawalStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PAID'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID: ['FULFILLED', 'REFUND_REQUESTED', 'CHARGEBACK'],
  FULFILLED: ['REFUND_REQUESTED', 'CHARGEBACK'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  CANCELLED: [],
  REFUND_REQUESTED: ['REFUND_PROCESSING', 'PAID', 'FULFILLED'], // Can reject back to original or proceed
  REFUND_PROCESSING: ['REFUNDED', 'PAID'], // If refund fails at gateway, reverts to paid
  REFUNDED: [],
  CHARGEBACK: [],
};

const WITHDRAWAL_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  REQUESTED: ['UNDER_REVIEW', 'CANCELLED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PAID', 'FAILED'],
  PAID: [],
  REJECTED: [],
  FAILED: ['PROCESSING', 'CANCELLED'],
  CANCELLED: [],
};

export class OrderStateMachine {
  static canTransition(current: OrderStatus, next: OrderStatus): boolean {
    const allowed = ORDER_TRANSITIONS[current];
    return allowed?.includes(next) ?? false;
  }

  static transition(current: OrderStatus, next: OrderStatus): OrderStatus {
    if (!this.canTransition(current, next)) {
      throw new Error(`ILLEGAL_ORDER_TRANSITION: Cannot transition Order from ${current} to ${next}`);
    }
    return next;
  }
}

export class WithdrawalStateMachine {
  static canTransition(current: WithdrawalStatus, next: WithdrawalStatus): boolean {
    const allowed = WITHDRAWAL_TRANSITIONS[current];
    return allowed?.includes(next) ?? false;
  }

  static transition(current: WithdrawalStatus, next: WithdrawalStatus): WithdrawalStatus {
    if (!this.canTransition(current, next)) {
      throw new Error(`ILLEGAL_WITHDRAWAL_TRANSITION: Cannot transition Withdrawal from ${current} to ${next}`);
    }
    return next;
  }
}
