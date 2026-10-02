import type {
  ProcurementPool,
  NewProcurementPool,
  PoolParticipant,
  NewPoolParticipant,
  ConsolidatedPO,
  NewConsolidatedPO,
  UmkmProcurementOrder,
  NewUmkmProcurementOrder,
} from './database-types';

export type PoolStatus = 'OPEN' | 'AGGREGATING' | 'LOCKED' | 'COMPLETED' | 'FAILED';
export type DeliveryMethod = 'HEMAT_HUB' | 'DIRECT_DOOR_TO_DOOR';
export type POStatus = 'ISSUED' | 'PAID_TO_ESCROW' | 'SHIPPED' | 'DELIVERED';
export type PaymentStatus = 'PENDING' | 'SETTLED' | 'REFUNDED';

// DTO untuk pembuatan pool procurement / pre-order
export interface CreateProcurementPoolDTO {
  commodity_id: string;
  target_moq: number | string;
  expires_at: string;
  default_hub_address?: string | null;
  hub_latitude?: number | string | null;
  hub_longitude?: number | string | null;
}

// DTO untuk bergabung ke dalam pool (Pre-Order)
export interface JoinProcurementPoolDTO {
  pool_id: string;
  umkm_role_id: string;
  order_qty: number | string;
  delivery_method: DeliveryMethod;
  final_delivery_address: string;
  final_delivery_lat: number | string;
  final_delivery_lng: number | string;
}

// DTO untuk pembuatan pesanan pengadaan UMKM
export interface CreateProcurementOrderDTO {
  participant_id: string;
  shipping_fee?: number | string;
}

// Detail Response
export interface PoolWithParticipants extends ProcurementPool {
  commodity_name?: string;
  wholesale_unit?: string;
  participants: PoolParticipant[];
  consolidated_po?: ConsolidatedPO | null;
}

export interface ProcurementOrderDetail extends UmkmProcurementOrder {
  participant?: PoolParticipant | null;
  pool?: ProcurementPool | null;
  commodity?: {
    id: string;
    name: string;
    wholesale_unit: string;
  } | null;
}

export type ProcurementPoolRecord = ProcurementPool;
export type ProcurementPoolInsertPayload = NewProcurementPool;
export type PoolParticipantRecord = PoolParticipant;
export type PoolParticipantInsertPayload = NewPoolParticipant;
export type ConsolidatedPORecord = ConsolidatedPO;
export type ConsolidatedPOInsertPayload = NewConsolidatedPO;
export type UmkmProcurementOrderRecord = UmkmProcurementOrder;
export type UmkmProcurementOrderInsertPayload = NewUmkmProcurementOrder;
