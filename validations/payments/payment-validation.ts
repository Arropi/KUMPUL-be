import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const initiate_payment_schema = z.object({
  order_id: z.string().uuid({
    message: 'order_id harus berformat UUID valid',
  }),
});

const release_escrow_schema = z.object({
  order_reference_id: z.string().uuid({
    message: 'order_reference_id harus berformat UUID valid',
  }),
  notes: z.string().optional(),
});

const midtrans_notification_schema = z.object({
  order_id: z.string().min(1, { message: 'order_id wajib disertakan' }),
  status_code: z.string().min(1, { message: 'status_code wajib disertakan' }),
  gross_amount: z.string().min(1, { message: 'gross_amount wajib disertakan' }),
  signature_key: z.string().min(1, { message: 'signature_key wajib disertakan' }),
  transaction_status: z.string().min(1, { message: 'transaction_status wajib disertakan' }),
  fraud_status: z.string().optional(),
  transaction_id: z.string().optional(),
  payment_type: z.string().optional(),
  transaction_time: z.string().optional(),
  settlement_time: z.string().optional(),
}).passthrough();

export const initiate_payment_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = initiate_payment_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const release_escrow_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = release_escrow_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const midtrans_notification_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = midtrans_notification_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
