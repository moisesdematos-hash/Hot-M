import { describe, it, expect } from 'vitest';
import { ProductStateMachine } from '@/modules/products/state-machine';

describe('Product State Machine (Section 25)', () => {
  it('should allow canonical forward transitions: DRAFT -> UNDER_REVIEW -> PUBLISHED -> SUSPENDED', () => {
    expect(ProductStateMachine.canTransition('DRAFT', 'UNDER_REVIEW')).toBe(true);
    expect(ProductStateMachine.canTransition('UNDER_REVIEW', 'PUBLISHED')).toBe(true);
    expect(ProductStateMachine.canTransition('PUBLISHED', 'SUSPENDED')).toBe(true);
    expect(ProductStateMachine.canTransition('SUSPENDED', 'PUBLISHED')).toBe(true);
  });

  it('should allow archiving from non-terminal states', () => {
    expect(ProductStateMachine.canTransition('DRAFT', 'ARCHIVED')).toBe(true);
    expect(ProductStateMachine.canTransition('UNDER_REVIEW', 'ARCHIVED')).toBe(true);
    expect(ProductStateMachine.canTransition('PUBLISHED', 'ARCHIVED')).toBe(true);
    expect(ProductStateMachine.canTransition('SUSPENDED', 'ARCHIVED')).toBe(true);
  });

  it('should reject arbitrary illegal state transitions', () => {
    // Cannot skip UNDER_REVIEW directly to PUBLISHED from DRAFT
    expect(ProductStateMachine.canTransition('DRAFT', 'PUBLISHED')).toBe(false);
    expect(() => ProductStateMachine.transition('DRAFT', 'PUBLISHED')).toThrow(
      'ILLEGAL_PRODUCT_TRANSITION'
    );

    // Terminal archived state cannot transition back arbitrarily
    expect(ProductStateMachine.canTransition('ARCHIVED', 'PUBLISHED')).toBe(false);
    expect(() => ProductStateMachine.transition('ARCHIVED', 'PUBLISHED')).toThrow(
      'ILLEGAL_PRODUCT_TRANSITION'
    );
  });
});
