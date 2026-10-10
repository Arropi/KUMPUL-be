import { AppError } from '../../middleware/error-middleware.ts';
import {
  find_all_offtakers,
  find_entity_by_role_id,
  find_offtaker_by_id,
  find_waste_listing_by_id,
  find_waste_listings_with_filter,
  find_waste_transaction_by_id,
  find_waste_transactions_by_buyer,
  find_waste_transactions_by_seller,
  insert_offtaker_referral_log,
  insert_waste_escrow,
  insert_waste_listing,
  insert_waste_transaction,
  release_waste_escrow,
  update_waste_listing,
  update_waste_transaction,
} from '../../repositories/waste/waste-repositories.ts';
import { create_snap_transaction } from '../payments/midtrans-service.ts';
import type {
  BuyWasteListingDTO,
  CreateWasteListingDTO,
  NearestOfftakerQueryDTO,
  NearestOfftakerResult,
  WasteListingFilterDTO,
} from '../../types/waste-types.ts';

const calculate_haversine_distance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const EARTH_RADIUS_KM = 6371;
  const d_lat = ((lat2 - lat1) * Math.PI) / 180;
  const d_lon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(d_lat / 2) * Math.sin(d_lat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(d_lon / 2) *
      Math.sin(d_lon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
};

export const create_waste_listing_service = async (
  seller_role_id: string,
  payload: CreateWasteListingDTO
) => {
  const expired_date = new Date(payload.expired_at);
  if (expired_date <= new Date()) {
    throw new AppError('Tanggal kedaluwarsa limbah harus di masa depan', 400, 'INVALID_EXPIRY_DATE');
  }

  const created_listing = await insert_waste_listing({
    seller_role_id,
    listing_title: payload.listing_title,
    waste_category: payload.waste_category,
    available_weight: String(payload.available_weight),
    price_per_kg: String(payload.price_per_kg),
    expired_at: expired_date,
    notes: payload.notes ?? null,
    umkm_product_id: payload.umkm_product_id ?? null,
    is_marketplace_visible: payload.is_marketplace_visible ?? true,
    listing_status: 'AVAILABLE',
  });

  return created_listing;
};

export const get_waste_listings_service = async (filter: WasteListingFilterDTO) => {
  return await find_waste_listings_with_filter(filter);
};

export const get_waste_listing_detail_service = async (listing_id: string) => {
  const listing_record = await find_waste_listing_by_id(listing_id);
  if (!listing_record) {
    throw new AppError('Listing limbah tidak ditemukan', 404, 'WASTE_LISTING_NOT_FOUND');
  }
  return listing_record;
};

export const buy_waste_listing_service = async (
  buyer_role_id: string,
  listing_id: string,
  payload: BuyWasteListingDTO
) => {
  const listing_record = await find_waste_listing_by_id(listing_id);
  if (!listing_record) {
    throw new AppError('Listing limbah tidak ditemukan', 404, 'WASTE_LISTING_NOT_FOUND');
  }

  if (listing_record.seller_role_id === buyer_role_id) {
    throw new AppError('Anda tidak dapat membeli listing limbah milik sendiri', 400, 'CANNOT_BUY_OWN_LISTING');
  }

  if (listing_record.listing_status !== 'AVAILABLE') {
    throw new AppError('Listing limbah ini sudah tidak tersedia', 400, 'LISTING_UNAVAILABLE');
  }

  const current_available = Number(listing_record.available_weight);
  if (payload.purchased_weight > current_available) {
    throw new AppError(
      `Jumlah pembelian (${payload.purchased_weight} kg) melebihi stok limbah yang tersedia (${current_available} kg)`,
      400,
      'INSUFFICIENT_WASTE_WEIGHT'
    );
  }

  const price_per_kg = Number(listing_record.price_per_kg);
  const total_amount = Math.round(payload.purchased_weight * price_per_kg);
  const pickup_code = `WST-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  let snap_token: string | null = null;
  let snap_redirect_url: string | null = null;
  let temp_order_id: string | null = null;
  const payment_status = total_amount === 0 ? 'SETTLED' : 'PENDING';

  if (total_amount > 0) {
    temp_order_id = `KMPL-WST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const snap_res = await create_snap_transaction({
      transaction_details: {
        order_id: temp_order_id,
        gross_amount: total_amount,
      },
      item_details: [
        {
          id: listing_record.id,
          name: listing_record.listing_title.substring(0, 45),
          price: price_per_kg,
          quantity: payload.purchased_weight,
        },
      ],
    });
    snap_token = snap_res.token;
    snap_redirect_url = snap_res.redirect_url;
  }

  const created_transaction = await insert_waste_transaction({
    listing_id: listing_record.id,
    buyer_role_id,
    purchased_weight: String(payload.purchased_weight),
    total_amount: String(total_amount),
    fulfillment_status: 'PAID_HELD_IN_ESCROW',
    pickup_date: payload.pickup_date,
    pickup_code,
    snap_token,
    snap_redirect_url,
    midtrans_order_id: temp_order_id,
    payment_status,
  });

  if (total_amount > 0) {
    await insert_waste_escrow(created_transaction.id, String(total_amount));
  }

  const remaining_weight = current_available - payload.purchased_weight;
  await update_waste_listing(listing_record.id, {
    available_weight: String(remaining_weight),
    listing_status: remaining_weight <= 0 ? 'SOLD_OUT' : 'AVAILABLE',
  });

  return created_transaction;
};

export const confirm_waste_pickup_service = async (
  seller_role_id: string,
  transaction_id: string,
  pickup_code: string
) => {
  const transaction_record = await find_waste_transaction_by_id(transaction_id);
  if (!transaction_record) {
    throw new AppError('Transaksi limbah tidak ditemukan', 404, 'TRANSACTION_NOT_FOUND');
  }

  if (transaction_record.seller_role_id !== seller_role_id) {
    throw new AppError('Hanya pemilik listing limbah yang dapat mengonfirmasi pengambilan', 403, 'UNAUTHORIZED_CONFIRMATION');
  }

  if (transaction_record.fulfillment_status === 'ACCEPTED_COMPLETED') {
    throw new AppError('Transaksi limbah ini telah selesai diambil sebelumnya', 400, 'ALREADY_COMPLETED');
  }

  if (transaction_record.pickup_code?.toUpperCase() !== pickup_code.trim().toUpperCase()) {
    throw new AppError('Kode pickup tidak valid atau tidak cocok', 400, 'INVALID_PICKUP_CODE');
  }

  const updated_transaction = await update_waste_transaction(transaction_id, {
    fulfillment_status: 'ACCEPTED_COMPLETED',
    picked_up_at: new Date(),
  });

  await release_waste_escrow(transaction_id);

  return updated_transaction;
};

export const get_nearest_offtakers_service = async (
  role_id: string,
  query: NearestOfftakerQueryDTO
): Promise<NearestOfftakerResult[]> => {
  let user_lat: number | null = query.latitude ?? null;
  let user_lon: number | null = query.longitude ?? null;

  if (user_lat === null || user_lon === null) {
    if (query.listing_id) {
      const listing = await find_waste_listing_by_id(query.listing_id);
      if (listing?.seller_latitude && listing?.seller_longitude) {
        user_lat = Number(listing.seller_latitude);
        user_lon = Number(listing.seller_longitude);
      }
    }
  }

  if (user_lat === null || user_lon === null) {
    const entity_info = await find_entity_by_role_id(role_id);
    if (entity_info?.latitude && entity_info?.longitude) {
      user_lat = Number(entity_info.latitude);
      user_lon = Number(entity_info.longitude);
    }
  }

  if (user_lat === null || user_lon === null || isNaN(user_lat) || isNaN(user_lon)) {
    user_lat = -7.3248;
    user_lon = 112.7758;
  }

  const all_offtakers = await find_all_offtakers();
  const max_limit = query.limit && query.limit > 0 ? query.limit : 5;

  const offtakers_with_distance: NearestOfftakerResult[] = all_offtakers
    .map((offtaker) => {
      const off_lat = Number(offtaker.latitude ?? -7.797068);
      const off_lon = Number(offtaker.longitude ?? 110.370529);
      const dist = calculate_haversine_distance(user_lat!, user_lon!, off_lat, off_lon);
      return {
        id: offtaker.id,
        org_name: offtaker.org_name,
        contact_person: offtaker.contact_person,
        phone: offtaker.phone,
        address: offtaker.address,
        latitude: off_lat,
        longitude: off_lon,
        accepted_waste_types: Array.isArray(offtaker.accepted_waste_types)
          ? (offtaker.accepted_waste_types as string[])
          : [],
        service_area_city: offtaker.service_area_city,
        distance_km: dist,
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, max_limit);

  return offtakers_with_distance;
};

export const refer_listing_to_offtaker_service = async (
  seller_role_id: string,
  listing_id: string,
  offtaker_id: string
) => {
  const listing_record = await find_waste_listing_by_id(listing_id);
  if (!listing_record) {
    throw new AppError('Listing limbah tidak ditemukan', 404, 'WASTE_LISTING_NOT_FOUND');
  }

  if (listing_record.seller_role_id !== seller_role_id) {
    throw new AppError('Hanya pemilik listing limbah yang dapat merujuk ke bank sampah', 403, 'UNAUTHORIZED_REFERRAL');
  }

  const offtaker_record = await find_offtaker_by_id(offtaker_id);
  if (!offtaker_record) {
    throw new AppError('Bank Sampah / TPS3R tidak ditemukan', 404, 'OFFTAKER_NOT_FOUND');
  }

  const manifest_number = `MFT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  await update_waste_listing(listing_id, {
    listing_status: 'REFERRED_TO_OFFTAKER',
  });

  const referral_log = await insert_offtaker_referral_log(
    listing_id,
    offtaker_id,
    manifest_number
  );

  return {
    ...referral_log,
    offtaker_name: offtaker_record.org_name,
    contact_person: offtaker_record.contact_person,
    phone: offtaker_record.phone,
    address: offtaker_record.address,
  };
};

export const get_buyer_waste_transactions_service = async (buyer_role_id: string) => {
  return await find_waste_transactions_by_buyer(buyer_role_id);
};

export const get_seller_waste_transactions_service = async (seller_role_id: string) => {
  return await find_waste_transactions_by_seller(seller_role_id);
};
