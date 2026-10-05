import type {
  PaymentTransaction,
  NewPaymentTransaction,
  EscrowTransaction,
  NewEscrowTransaction,
} from './database-types';

export type EscrowType = 'PROCUREMENT_ESCROW' | 'WASTE_ESCROW';
export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED';

export interface InitiatePaymentDTO {
  order_id: string;
  delivery_method?: 'HEMAT_HUB' | 'DIRECT_DOOR_TO_DOOR';
}

export interface SnapPaymentResponse {
  order_id: string;
  midtrans_order_id: string;
  snap_token: string;
  snap_redirect_url: string;
  gross_amount: string;
}

export interface MidtransNotificationDTO {
  order_id: string;
  transaction_id?: string;
  transaction_status: string;
  fraud_status?: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  [key: string]: unknown;
}

export interface PaymentStatusResponse {
  order_id: string;
  midtrans_order_id: string;
  transaction_status: string;
  payment_status: string;
  payment_type?: string | null;
  gross_amount: string;
  settlement_time?: Date | string | null;
  escrow_status?: EscrowStatus | null;
}

export interface ReleaseEscrowDTO {
  order_reference_id: string;
  notes?: string;
}

export type PaymentTransactionRecord = PaymentTransaction;
export type PaymentTransactionInsertPayload = NewPaymentTransaction;
export type EscrowTransactionRecord = EscrowTransaction;
export type EscrowTransactionInsertPayload = NewEscrowTransaction;
