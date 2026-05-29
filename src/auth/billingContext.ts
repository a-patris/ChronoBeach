import type { BillingStatus } from "./billing";
import type { UserRole } from "./roles";

type BillingContext = {
  billingStatus?: BillingStatus;
  role: UserRole | null;
};

let current: BillingContext = { role: null };

export function setBillingContext(
  billingStatus: BillingStatus | undefined,
  role: UserRole | null,
): void {
  current = { billingStatus, role };
}

export function getBillingContext(): BillingContext {
  return current;
}
