import { eq, desc } from 'drizzle-orm';
import { db } from '../../config/db';
import {
  payment_transactions,
  escrow_transactions,
  umkm_procurement_orders,
} from '../../config/schema';
import type {
  PaymentTransactionRecord,
  PaymentTransactionInsertPayload,
  EscrowTransactionRecord,
  EscrowTransactionInsertPayload,
  EscrowStatus,
} from '../../types/payment-types';

export const insert_payment_transaction = async (
  payload: PaymentTransactionInsertPayload
): Promise<PaymentTransactionRecord> => {
  const inserted = await db
    .insert(payment_transactions)
    .values(payload)
    .returning();

  const data = inserted[0];
  if (!data) {
    throw new Error('Gagal mencatat transaksi pembayaran ke database');
  }

  return data;
};

export const find_payment_transaction_by_midtrans_order_id = async (
  midtrans_order_id: string
): Promise<PaymentTransactionRecord | null> => {
  const records = await db
    .select()
    .from(payment_transactions)
    .where(eq(payment_transactions.midtrans_order_id, midtrans_order_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_latest_payment_transaction_by_order_id = async (
  order_id: string
): Promise<PaymentTransactionRecord | null> => {
  const records = await db
    .select()
    .from(payment_transactions)
    .where(eq(payment_transactions.order_id, order_id))
    .orderBy(desc(payment_transactions.created_at))
    .limit(1);

  return records[0] ?? null;
};

export const update_payment_transaction = async (
  midtrans_order_id: string,
  payload: Partial<PaymentTransactionInsertPayload>
): Promise<PaymentTransactionRecord | null> => {
  const updated = await db
    .update(payment_transactions)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(payment_transactions.midtrans_order_id, midtrans_order_id))
    .returning();

  return updated[0] ?? null;
};

// ==========================================
// ESCROW TRANSACTIONS REPOSITORY
// ==========================================

export const insert_escrow_transaction = async (
  payload: EscrowTransactionInsertPayload
): Promise<EscrowTransactionRecord> => {
  const inserted = await db
    .insert(escrow_transactions)
    .values(payload)
    .returning();

  const data = inserted[0];
  if (!data) {
    throw new Error('Gagal menyimpan transaksi escrow ke database');
  }

  return data;
};

export const find_escrow_by_order_reference_id = async (
  order_reference_id: string
): Promise<EscrowTransactionRecord | null> => {
  const records = await db
    .select()
    .from(escrow_transactions)
    .where(eq(escrow_transactions.order_reference_id, order_reference_id))
    .limit(1);

  return records[0] ?? null;
};

export const update_escrow_status = async (
  order_reference_id: string,
  escrow_status: EscrowStatus
): Promise<EscrowTransactionRecord | null> => {
  const updated = await db
    .update(escrow_transactions)
    .set({
      escrow_status,
      updated_at: new Date(),
    })
    .where(eq(escrow_transactions.order_reference_id, order_reference_id))
    .returning();

  return updated[0] ?? null;
};
