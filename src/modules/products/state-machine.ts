/**
 * HOT-M PRODUCT STATE MACHINE (Section 25)
 * 
 * Strict deterministic lifecycle transitions:
 * DRAFT -> UNDER_REVIEW -> PUBLISHED -> SUSPENDED -> ARCHIVED
 */

export type ProductStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'PUBLISHED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export type ProductType = 'DIGITAL_DOWNLOAD' | 'COURSE';

const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['PUBLISHED', 'ARCHIVED'],
  ARCHIVED: [],
};

export class ProductStateMachine {
  static canTransition(current: ProductStatus, next: ProductStatus): boolean {
    const allowed = PRODUCT_TRANSITIONS[current];
    return allowed?.includes(next) ?? false;
  }

  static transition(current: ProductStatus, next: ProductStatus): ProductStatus {
    if (!this.canTransition(current, next)) {
      throw new Error(`ILLEGAL_PRODUCT_TRANSITION: Cannot transition Product from ${current} to ${next}`);
    }
    return next;
  }
}
