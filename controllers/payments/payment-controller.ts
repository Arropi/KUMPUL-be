import type { Request, Response, NextFunction } from 'express';
import {
  initiate_order_payment_service,
  handle_midtrans_webhook_service,
  check_and_sync_payment_status_service,
  release_escrow_funds_service,
} from '../../services/payments/payment-service';

export const initiate_order_payment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order_id = req.body.order_id as string;
    const snap_data = await initiate_order_payment_service(order_id);

    res.status(201).json({
      status: 'success',
      message: 'Token pembayaran Midtrans Snap berhasil dibuat',
      data: snap_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const handle_midtrans_webhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification_payload = req.body;
    const result = await handle_midtrans_webhook_service(notification_payload);

    res.status(200).json({
      status: 'success',
      message: 'Notifikasi webhook Midtrans berhasil diproses',
      data: result,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const check_payment_status = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order_id = req.params.order_id as string;
    const status_data = await check_and_sync_payment_status_service(order_id);

    res.status(200).json({
      status: 'success',
      message: 'Status transaksi pembayaran berhasil diverifikasi',
      data: status_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const release_escrow_funds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const escrow_payload = {
      order_reference_id: req.body.order_reference_id,
      notes: req.body.notes,
    };

    const released_escrow = await release_escrow_funds_service(escrow_payload);

    res.status(200).json({
      status: 'success',
      message: 'Dana escrow berhasil diteruskan ke Supplier',
      data: released_escrow,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
