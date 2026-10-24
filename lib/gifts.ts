import { PaymentMethod } from '@/lib/types';

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'check', 'card', 'online', 'other'];

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  card: 'Card',
  online: 'Online',
  other: 'Other',
};
