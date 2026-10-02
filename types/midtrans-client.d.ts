declare module 'midtrans-client' {
  export interface MidtransClientOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  export interface ItemDetail {
    id: string;
    price: number;
    quantity: number;
    name: string;
    brand?: string;
    category?: string;
    merchant_name?: string;
  }

  export interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  }

  export interface SnapTransactionParameters {
    transaction_details: TransactionDetails;
    item_details?: ItemDetail[] | any[];
    customer_details?: CustomerDetails | any;
    [key: string]: any;
  }

  export interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  export interface MidtransTransactionApi {
    status(transactionId: string): Promise<Record<string, any>>;
    statusb2b(transactionId: string): Promise<Record<string, any>>;
    approve(transactionId: string): Promise<Record<string, any>>;
    deny(transactionId: string): Promise<Record<string, any>>;
    cancel(transactionId: string): Promise<Record<string, any>>;
    expire(transactionId: string): Promise<Record<string, any>>;
    refund(transactionId: string, parameter?: Record<string, any>): Promise<Record<string, any>>;
  }

  export class Snap {
    constructor(options: MidtransClientOptions);
    transaction: MidtransTransactionApi;
    createTransaction(parameter: SnapTransactionParameters): Promise<SnapTransactionResponse>;
    createTransactionToken(parameter: SnapTransactionParameters): Promise<string>;
    createTransactionRedirectUrl(parameter: SnapTransactionParameters): Promise<string>;
  }

  export class CoreApi {
    constructor(options: MidtransClientOptions);
    transaction: MidtransTransactionApi;
    charge(parameter: Record<string, any>): Promise<Record<string, any>>;
    capture(parameter: Record<string, any>): Promise<Record<string, any>>;
  }
}
