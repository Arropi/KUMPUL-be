export type WasteCategoryType = 'ORGANIK_BASAH' | 'ORGANIK_KERING' | 'TEKSTIL_PERCA' | 'ANORGANIK';
export type WasteListingStatusType = 'AVAILABLE' | 'SOLD_OUT' | 'REFERRED_TO_OFFTAKER';
export type WasteFulfillmentStatusType = 'PAID_HELD_IN_ESCROW' | 'PICKED_UP' | 'ACCEPTED_COMPLETED';
export type ReferralStatusType = 'REQUESTED' | 'PICKED_UP_BY_OFFTAKER';

export interface CreateWasteListingDTO {
  listing_title: string;
  waste_category: WasteCategoryType;
  available_weight: number;
  price_per_kg: number;
  expired_at: string;
  notes?: string;
  umkm_product_id?: string;
  is_marketplace_visible?: boolean;
}

export interface UpdateWasteListingDTO {
  listing_title?: string;
  waste_category?: WasteCategoryType;
  available_weight?: number;
  price_per_kg?: number;
  expired_at?: string;
  notes?: string;
  is_marketplace_visible?: boolean;
  listing_status?: WasteListingStatusType;
}

export interface WasteListingFilterDTO {
  category?: WasteCategoryType;
  max_price?: number;
  status?: WasteListingStatusType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BuyWasteListingDTO {
  purchased_weight: number;
  pickup_date: string;
}

export interface NearestOfftakerQueryDTO {
  listing_id?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}

export interface NearestOfftakerResult {
  id: string;
  org_name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  accepted_waste_types: string[];
  service_area_city: string;
  distance_km: number;
}
