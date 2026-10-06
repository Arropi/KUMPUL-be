import 'midtrans-client';

declare module 'midtrans-client' {
  export interface MidtransTransactionApi {
    status(transaction_id: string): Promise<Record<string, any>>;
    statusb2b(transaction_id: string): Promise<Record<string, any>>;
    approve(transaction_id: string): Promise<Record<string, any>>;
    deny(transaction_id: string): Promise<Record<string, any>>;
    cancel(transaction_id: string): Promise<Record<string, any>>;
    expire(transaction_id: string): Promise<Record<string, any>>;
    refund(
      transaction_id: string,
      parameter?: Record<string, any>
    ): Promise<Record<string, any>>;
  }

  export interface Snap {
    transaction: MidtransTransactionApi;
  }

  export interface CoreApi {
    transaction: MidtransTransactionApi;
  }
}
