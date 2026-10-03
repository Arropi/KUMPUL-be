import {
  find_order_with_details_by_id,
  update_order_payment_status,
  update_procurement_order,
} from '../../repositories/orders/procurement-order-repositories';
import {
  insert_payment_transaction,
  find_payment_transaction_by_midtrans_order_id,
  find_latest_payment_transaction_by_order_id,
  update_payment_transaction,
  insert_escrow_transaction,
  find_escrow_by_order_reference_id,
  update_escrow_status,
} from '../../repositories/payments/payment-repositories';
import {
  find_consolidated_po_by_pool_id,
  update_consolidated_po_status,
} from '../../repositories/orders/procurement-pool-repositories';
import {
  create_snap_transaction,
  verify_midtrans_signature,
  check_midtrans_transaction_status,
} from './midtrans-service';
import { AppError } from '../../middleware/error-middleware';
import type {
  SnapPaymentResponse,
  MidtransNotificationDTO,
  PaymentStatusResponse,
  ReleaseEscrowDTO,
} from '../../types/payment-types';

export const initiate_order_payment_service = async (
  order_id: string
): Promise<SnapPaymentResponse> => {
  const order_data = await find_order_with_details_by_id(order_id);
  if (!order_data) {
    throw new AppError('Pesanan pengadaan tidak ditemukan', 404, 'ORDER_NOT_FOUND');
  }

  if (order_data.order.payment_status === 'SETTLED') {
    throw new AppError('Pesanan ini sudah berhasil dibayar', 400, 'ORDER_ALREADY_PAID');
  }

  const gross_amount_num = Math.round(parseFloat(order_data.order.grand_total));
  if (gross_amount_num <= 0) {
    throw new AppError('Nominal pesanan harus lebih besar dari 0', 400, 'INVALID_AMOUNT');
  }

  const midtrans_order_id = `KUMPUL-${order_id.slice(0, 8)}-${Date.now()}`;

  const snap_params = {
    transaction_details: {
      order_id: midtrans_order_id,
      gross_amount: gross_amount_num,
    },
    item_details: [
      {
        id: order_data.commodity.id,
        price: Math.round(parseFloat(order_data.order.raw_material_subtotal) / parseFloat(order_data.participant.order_qty)),
        quantity: Math.round(parseFloat(order_data.participant.order_qty)),
        name: order_data.commodity.name.slice(0, 50),
      },
      {
        id: 'SHIPPING-FEE',
        price: Math.round(parseFloat(order_data.order.shipping_fee)),
        quantity: 1,
        name: `Ongkos Kirim (${order_data.participant.delivery_method})`,
      },
    ],
    customer_details: {
      first_name: `UMKM Member`,
    },
  };

  const snap_result = await create_snap_transaction(snap_params);

  await update_procurement_order(order_id, {
    snap_token: snap_result.token,
    snap_redirect_url: snap_result.redirect_url,
  });

  await insert_payment_transaction({
    order_id,
    midtrans_order_id,
    gross_amount: String(gross_amount_num),
    transaction_status: 'pending',
    snap_token: snap_result.token,
    snap_redirect_url: snap_result.redirect_url,
  });

  return {
    order_id,
    midtrans_order_id,
    snap_token: snap_result.token,
    snap_redirect_url: snap_result.redirect_url,
    gross_amount: String(gross_amount_num),
  };
};

export const handle_midtrans_webhook_service = async (
  notification: MidtransNotificationDTO
): Promise<{ processed: boolean; order_id: string; status: string }> => {
  const is_valid_signature = verify_midtrans_signature(notification);
  if (!is_valid_signature) {
    throw new AppError('Tanda tangan digital (signature key) Midtrans tidak valid', 403, 'INVALID_SIGNATURE');
  }

  const midtrans_order_id = notification.order_id;
  const payment_tx = await find_payment_transaction_by_midtrans_order_id(midtrans_order_id);
  if (!payment_tx) {
    throw new AppError('Transaksi pembayaran tidak ditemukan di sistem', 404, 'TRANSACTION_NOT_FOUND');
  }

  const order_id = payment_tx.order_id;
  const status = notification.transaction_status;
  const fraud = notification.fraud_status;

  await update_payment_transaction(midtrans_order_id, {
    transaction_id: notification.transaction_id,
    payment_type: notification.payment_type,
    transaction_status: status,
    fraud_status: fraud,
    raw_response: notification,
  });

  const is_settled =
    status === 'settlement' || (status === 'capture' && fraud === 'accept');

  if (is_settled) {
    const settlement_date = notification.settlement_time
      ? new Date(notification.settlement_time)
      : new Date();

    await update_order_payment_status(
      order_id,
      'SETTLED',
      settlement_date,
      notification.payment_type
    );

    const existing_escrow = await find_escrow_by_order_reference_id(order_id);
    if (!existing_escrow) {
      await insert_escrow_transaction({
        transaction_type: 'PROCUREMENT_ESCROW',
        order_reference_id: order_id,
        amount: payment_tx.gross_amount,
        escrow_status: 'HELD',
      });
    }

    const order_detail = await find_order_with_details_by_id(order_id);
    if (order_detail?.pool?.id) {
      const consolidated_po = await find_consolidated_po_by_pool_id(order_detail.pool.id);
      if (consolidated_po && consolidated_po.po_status === 'ISSUED') {
        await update_consolidated_po_status(consolidated_po.id, 'PAID_TO_ESCROW');
      }
    }
  } else if (['deny', 'cancel', 'expire'].includes(status)) {
    await update_order_payment_status(order_id, 'PENDING');
  } else if (status === 'refund') {
    await update_order_payment_status(order_id, 'REFUNDED');
    await update_escrow_status(order_id, 'REFUNDED');
  }

  return {
    processed: true,
    order_id,
    status,
  };
};

export const check_and_sync_payment_status_service = async (
  order_id: string
): Promise<PaymentStatusResponse> => {
  const latest_tx = await find_latest_payment_transaction_by_order_id(order_id);
  if (!latest_tx) {
    throw new AppError('Belum ada transaksi pembayaran yang dibuat untuk pesanan ini', 404, 'PAYMENT_NOT_INITIALIZED');
  }

  const midtrans_status = await check_midtrans_transaction_status(latest_tx.midtrans_order_id);

  const status = midtrans_status.transaction_status;
  const fraud = midtrans_status.fraud_status;
  const is_settled =
    status === 'settlement' || (status === 'capture' && fraud === 'accept');

  if (is_settled) {
    const settlement_date = midtrans_status.settlement_time
      ? new Date(midtrans_status.settlement_time)
      : new Date();

    await update_order_payment_status(
      order_id,
      'SETTLED',
      settlement_date,
      midtrans_status.payment_type
    );

    const existing_escrow = await find_escrow_by_order_reference_id(order_id);
    if (!existing_escrow) {
      await insert_escrow_transaction({
        transaction_type: 'PROCUREMENT_ESCROW',
        order_reference_id: order_id,
        amount: latest_tx.gross_amount,
        escrow_status: 'HELD',
      });
    }
  }

  await update_payment_transaction(latest_tx.midtrans_order_id, {
    transaction_status: status,
    payment_type: midtrans_status.payment_type,
    raw_response: midtrans_status,
  });

  const escrow = await find_escrow_by_order_reference_id(order_id);

  return {
    order_id,
    midtrans_order_id: latest_tx.midtrans_order_id,
    transaction_status: status,
    payment_status: is_settled ? 'SETTLED' : 'PENDING',
    payment_type: midtrans_status.payment_type,
    gross_amount: latest_tx.gross_amount,
    settlement_time: midtrans_status.settlement_time ?? null,
    escrow_status: escrow?.escrow_status ?? null,
  };
};

export const release_escrow_funds_service = async (
  payload: ReleaseEscrowDTO
) => {
  const escrow = await find_escrow_by_order_reference_id(payload.order_reference_id);
  if (!escrow) {
    throw new AppError('Transaksi escrow pesanan tidak ditemukan', 404, 'ESCROW_NOT_FOUND');
  }

  if (escrow.escrow_status !== 'HELD') {
    throw new AppError(
      `Escrow tidak dapat dilepas karena berstatus ${escrow.escrow_status}`,
      400,
      'ESCROW_NOT_IN_HELD_STATE'
    );
  }

  const released_escrow = await update_escrow_status(payload.order_reference_id, 'RELEASED');
  return released_escrow;
};
