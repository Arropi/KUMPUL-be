import crypto from 'crypto';
import {
  snap_client,
  core_api_client,
  MIDTRANS_SERVER_KEY,
} from '../../config/midtrans';
import { AppError } from '../../middleware/error-middleware';
import type { MidtransNotificationDTO } from '../../types/payment-types';

export interface SnapTransactionParameter {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  item_details?: {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }[];
  customer_details?: {
    first_name: string;
    email?: string;
    phone?: string;
  };
  expiry?: {
    start_time?: string;
    unit?: string;
    duration?: number;
  };
}

export const create_snap_transaction = async (
  params: SnapTransactionParameter
): Promise<{ token: string; redirect_url: string }> => {
  // Jika menggunakan dummy test key (lingkungan testing/local sandbox tanpa credentials riil)
  if (MIDTRANS_SERVER_KEY.includes('TEST-SANDBOX-KEY')) {
    const dummy_token = `mock-snap-${params.transaction_details.order_id}`;
    return {
      token: dummy_token,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${dummy_token}`,
    };
  }

  try {
    const payload_with_expiry = {
      ...params,
      expiry: params.expiry ?? {
        unit: 'hours',
        duration: 12,
      },
    };

    const snap_response = await snap_client.createTransaction(payload_with_expiry);

    if (!snap_response || !snap_response.token) {
      throw new Error('Midtrans Snap tidak mengembalikan token transaksi yang valid');
    }

    return {
      token: snap_response.token,
      redirect_url: snap_response.redirect_url,
    };
  } catch (error: any) {
    console.error('[Midtrans Snap Error]:', error);
    throw new AppError(
      `Gagal membuat transaksi Midtrans Snap: ${error.message || 'Kesalahan server Midtrans'}`,
      502,
      'MIDTRANS_GATEWAY_ERROR'
    );
  }
};

export const verify_midtrans_signature = (
  notification_payload: MidtransNotificationDTO
): boolean => {
  const { order_id, status_code, gross_amount, signature_key } = notification_payload;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return false;
  }

  const raw_signature_string = `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`;
  const calculated_signature = crypto
    .createHash('sha512')
    .update(raw_signature_string)
    .digest('hex');

  return calculated_signature.toLowerCase() === signature_key.toLowerCase();
};

export const check_midtrans_transaction_status = async (
  midtrans_order_id: string
): Promise<any> => {
  if (MIDTRANS_SERVER_KEY.includes('TEST-SANDBOX-KEY')) {
    return {
      transaction_status: 'settlement',
      payment_type: 'bank_transfer',
      gross_amount: '100000.00',
      settlement_time: new Date().toISOString(),
    };
  }

  try {
    const status_response = await core_api_client.transaction.status(midtrans_order_id);
    return status_response;
  } catch (error: any) {
    console.error('[Midtrans Status Check Error]:', error);
    throw new AppError(
      `Gagal memeriksa status transaksi Midtrans: ${error.message || 'Transaksi tidak ditemukan'}`,
      error.ApiResponse?.status_code ? parseInt(error.ApiResponse.status_code, 10) : 502,
      'MIDTRANS_STATUS_CHECK_ERROR'
    );
  }
};

export const cancel_midtrans_transaction = async (
  midtrans_order_id: string
): Promise<any> => {
  if (MIDTRANS_SERVER_KEY.includes('TEST-SANDBOX-KEY')) {
    return {
      status_code: '200',
      transaction_status: 'cancel',
    };
  }

  try {
    const cancel_response = await core_api_client.transaction.cancel(midtrans_order_id);
    return cancel_response;
  } catch (error: any) {
    console.error('[Midtrans Cancel Error]:', error);
    throw new AppError(
      `Gagal membatalkan transaksi di Midtrans: ${error.message}`,
      502,
      'MIDTRANS_CANCEL_ERROR'
    );
  }
};
