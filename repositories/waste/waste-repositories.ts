import { and, desc, eq, ilike, lte, sql } from 'drizzle-orm';
import { db } from '../../config/db.ts';
import {
  business_entities,
  business_roles,
  escrow_transactions,
  offtaker_directories,
  offtaker_referral_logs,
  waste_listings,
  waste_transactions,
  type NewWasteListing,
  type NewWasteTransaction,
  type WasteListing,
  type WasteTransaction,
} from '../../config/schema.ts';
import type { WasteListingFilterDTO } from '../../types/waste-types.ts';

export const insert_waste_listing = async (
  payload: NewWasteListing
): Promise<WasteListing> => {
  const [created_record] = await db
    .insert(waste_listings)
    .values(payload)
    .returning();

  if (!created_record) {
    throw new Error('Gagal menyimpan listing limbah ke database');
  }

  return created_record;
};

export const find_waste_listing_by_id = async (listing_id: string) => {
  const records = await db
    .select({
      id: waste_listings.id,
      umkm_product_id: waste_listings.umkm_product_id,
      seller_role_id: waste_listings.seller_role_id,
      listing_title: waste_listings.listing_title,
      waste_category: waste_listings.waste_category,
      available_weight: waste_listings.available_weight,
      price_per_kg: waste_listings.price_per_kg,
      is_marketplace_visible: waste_listings.is_marketplace_visible,
      listing_status: waste_listings.listing_status,
      notes: waste_listings.notes,
      expired_at: waste_listings.expired_at,
      created_at: waste_listings.created_at,
      updated_at: waste_listings.updated_at,
      seller_business_name: business_entities.legal_name,
      seller_address: business_entities.default_address,
      seller_latitude: business_entities.latitude,
      seller_longitude: business_entities.longitude,
    })
    .from(waste_listings)
    .innerJoin(business_roles, eq(waste_listings.seller_role_id, business_roles.id))
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(eq(waste_listings.id, listing_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_waste_listings_with_filter = async (
  filter: WasteListingFilterDTO
) => {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (filter.category) {
    conditions.push(eq(waste_listings.waste_category, filter.category));
  }

  if (filter.status) {
    conditions.push(eq(waste_listings.listing_status, filter.status));
  } else {
    conditions.push(eq(waste_listings.listing_status, 'AVAILABLE'));
  }

  if (filter.max_price !== undefined && filter.max_price !== null) {
    conditions.push(lte(waste_listings.price_per_kg, String(filter.max_price)));
  }

  if (filter.search) {
    conditions.push(ilike(waste_listings.listing_title, `%${filter.search}%`));
  }

  const where_clause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db
    .select({
      id: waste_listings.id,
      umkm_product_id: waste_listings.umkm_product_id,
      seller_role_id: waste_listings.seller_role_id,
      listing_title: waste_listings.listing_title,
      waste_category: waste_listings.waste_category,
      available_weight: waste_listings.available_weight,
      price_per_kg: waste_listings.price_per_kg,
      is_marketplace_visible: waste_listings.is_marketplace_visible,
      listing_status: waste_listings.listing_status,
      notes: waste_listings.notes,
      expired_at: waste_listings.expired_at,
      created_at: waste_listings.created_at,
      seller_business_name: business_entities.legal_name,
      seller_address: business_entities.default_address,
      seller_latitude: business_entities.latitude,
      seller_longitude: business_entities.longitude,
    })
    .from(waste_listings)
    .innerJoin(business_roles, eq(waste_listings.seller_role_id, business_roles.id))
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(where_clause)
    .orderBy(desc(waste_listings.created_at))
    .limit(limit)
    .offset(offset);

  return records;
};

export const update_waste_listing = async (
  listing_id: string,
  update_payload: Partial<NewWasteListing>
): Promise<WasteListing> => {
  const [updated_record] = await db
    .update(waste_listings)
    .set({
      ...update_payload,
      updated_at: new Date(),
    })
    .where(eq(waste_listings.id, listing_id))
    .returning();

  if (!updated_record) {
    throw new Error('Listing limbah tidak ditemukan untuk diperbarui');
  }

  return updated_record;
};

export const delete_waste_listing = async (
  listing_id: string
): Promise<WasteListing | null> => {
  const [deleted_record] = await db
    .delete(waste_listings)
    .where(eq(waste_listings.id, listing_id))
    .returning();

  return deleted_record ?? null;
};

export const insert_waste_transaction = async (
  payload: NewWasteTransaction
): Promise<WasteTransaction> => {
  const [created_record] = await db
    .insert(waste_transactions)
    .values(payload)
    .returning();

  if (!created_record) {
    throw new Error('Gagal menyimpan transaksi limbah ke database');
  }

  return created_record;
};

export const find_waste_transaction_by_id = async (transaction_id: string) => {
  const records = await db
    .select({
      id: waste_transactions.id,
      listing_id: waste_transactions.listing_id,
      buyer_role_id: waste_transactions.buyer_role_id,
      purchased_weight: waste_transactions.purchased_weight,
      total_amount: waste_transactions.total_amount,
      fulfillment_status: waste_transactions.fulfillment_status,
      pickup_date: waste_transactions.pickup_date,
      pickup_code: waste_transactions.pickup_code,
      picked_up_at: waste_transactions.picked_up_at,
      snap_token: waste_transactions.snap_token,
      snap_redirect_url: waste_transactions.snap_redirect_url,
      payment_status: waste_transactions.payment_status,
      created_at: waste_transactions.created_at,
      updated_at: waste_transactions.updated_at,
      listing_title: waste_listings.listing_title,
      seller_role_id: waste_listings.seller_role_id,
      price_per_kg: waste_listings.price_per_kg,
    })
    .from(waste_transactions)
    .innerJoin(waste_listings, eq(waste_transactions.listing_id, waste_listings.id))
    .where(eq(waste_transactions.id, transaction_id))
    .limit(1);

  return records[0] ?? null;
};

export const update_waste_transaction = async (
  transaction_id: string,
  update_payload: Partial<NewWasteTransaction>
): Promise<WasteTransaction> => {
  const [updated_record] = await db
    .update(waste_transactions)
    .set({
      ...update_payload,
      updated_at: new Date(),
    })
    .where(eq(waste_transactions.id, transaction_id))
    .returning();

  if (!updated_record) {
    throw new Error('Transaksi limbah tidak ditemukan untuk diperbarui');
  }

  return updated_record;
};

export const find_waste_transactions_by_buyer = async (buyer_role_id: string) => {
  return await db
    .select({
      id: waste_transactions.id,
      listing_id: waste_transactions.listing_id,
      listing_title: waste_listings.listing_title,
      waste_category: waste_listings.waste_category,
      purchased_weight: waste_transactions.purchased_weight,
      total_amount: waste_transactions.total_amount,
      fulfillment_status: waste_transactions.fulfillment_status,
      pickup_date: waste_transactions.pickup_date,
      pickup_code: waste_transactions.pickup_code,
      payment_status: waste_transactions.payment_status,
      snap_token: waste_transactions.snap_token,
      snap_redirect_url: waste_transactions.snap_redirect_url,
      created_at: waste_transactions.created_at,
    })
    .from(waste_transactions)
    .innerJoin(waste_listings, eq(waste_transactions.listing_id, waste_listings.id))
    .where(eq(waste_transactions.buyer_role_id, buyer_role_id))
    .orderBy(desc(waste_transactions.created_at));
};

export const find_waste_transactions_by_seller = async (seller_role_id: string) => {
  return await db
    .select({
      id: waste_transactions.id,
      listing_id: waste_transactions.listing_id,
      listing_title: waste_listings.listing_title,
      waste_category: waste_listings.waste_category,
      purchased_weight: waste_transactions.purchased_weight,
      total_amount: waste_transactions.total_amount,
      fulfillment_status: waste_transactions.fulfillment_status,
      pickup_date: waste_transactions.pickup_date,
      pickup_code: waste_transactions.pickup_code,
      picked_up_at: waste_transactions.picked_up_at,
      payment_status: waste_transactions.payment_status,
      created_at: waste_transactions.created_at,
    })
    .from(waste_transactions)
    .innerJoin(waste_listings, eq(waste_transactions.listing_id, waste_listings.id))
    .where(eq(waste_listings.seller_role_id, seller_role_id))
    .orderBy(desc(waste_transactions.created_at));
};

export const find_all_offtakers = async () => {
  return await db
    .select()
    .from(offtaker_directories)
    .orderBy(offtaker_directories.org_name);
};

export const find_offtaker_by_id = async (offtaker_id: string) => {
  const records = await db
    .select()
    .from(offtaker_directories)
    .where(eq(offtaker_directories.id, offtaker_id))
    .limit(1);

  return records[0] ?? null;
};

export const insert_offtaker_referral_log = async (
  listing_id: string,
  offtaker_id: string,
  manifest_number: string
) => {
  const [created_record] = await db
    .insert(offtaker_referral_logs)
    .values({
      listing_id,
      offtaker_id,
      manifest_number,
      referral_status: 'REQUESTED',
    })
    .returning();

  return created_record;
};

export const insert_waste_escrow = async (
  transaction_id: string,
  amount: string
) => {
  const [created_escrow] = await db
    .insert(escrow_transactions)
    .values({
      transaction_type: 'WASTE_ESCROW',
      order_reference_id: transaction_id,
      amount,
      escrow_status: 'HELD',
    })
    .returning();

  return created_escrow;
};

export const release_waste_escrow = async (transaction_id: string) => {
  const [updated_escrow] = await db
    .update(escrow_transactions)
    .set({
      escrow_status: 'RELEASED',
      updated_at: new Date(),
    })
    .where(
      and(
        eq(escrow_transactions.order_reference_id, transaction_id),
        eq(escrow_transactions.transaction_type, 'WASTE_ESCROW')
      )
    )
    .returning();

  return updated_escrow ?? null;
};

export const find_entity_by_role_id = async (role_id: string) => {
  const records = await db
    .select({
      role_id: business_roles.id,
      entity_id: business_entities.id,
      legal_name: business_entities.legal_name,
      address: business_entities.default_address,
      latitude: business_entities.latitude,
      longitude: business_entities.longitude,
    })
    .from(business_roles)
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(eq(business_roles.id, role_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_waste_transaction_by_midtrans_order_id = async (
  midtrans_order_id: string
) => {
  const records = await db
    .select()
    .from(waste_transactions)
    .where(eq(waste_transactions.midtrans_order_id, midtrans_order_id))
    .limit(1);

  return records[0] ?? null;
};
