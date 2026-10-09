import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. ENUMS DEFINITIONS
// ==========================================

export const role_type_enum = pgEnum('role_type_enum', ['SUPPLIER', 'UMKM']);

export const sector_type_enum = pgEnum('sector_type_enum', [
  'PERTANIAN',
  'PETERNAKAN',
  'PERIKANAN',
  'PERKEBUNAN',
  'FNB_PENGOLAHAN',
  'RITEL',
  'LOGISTIK',
]);

export const unit_enum = pgEnum('unit_enum', [
  'KG',
  'GRAM',
  'MG',
  'TON',
  'KUINTAL',
  'LITER',
  'ML',
  'KUBIK',
  'PCS',
  'EKOR',
  'BUTIR',
  'LEMBAR',
  'IKAT',
  'PORSI',
  'CUP',
  'BUNGKUS',
  'PACK',
  'PAX',
  'DUS',
  'BOX',
  'KARTON',
  'KARUNG',
  'SAK',
  'KRAT',
  'BAL',
  'BOTOL',
  'KALENG',
  'TRAY',
  'KERANJANG',
  'BASKOM',
  'LUSIN',
  'PALLET',
  'KOLI',
]);

export const wholesale_unit_enum = pgEnum('wholesale_unit_enum', [
  'KARUNG',
  'SAK',
  'KRAT',
  'PAX',
  'BAL',
  'KG',
  'GRAM',
  'TON',
  'KUINTAL',
  'LITER',
  'ML',
  'KUBIK',
  'PCS',
  'PACK',
  'DUS',
  'BOX',
  'KARTON',
  'BOTOL',
  'KALENG',
  'TRAY',
  'KERANJANG',
  'BASKOM',
  'EKOR',
  'BUTIR',
  'LEMBAR',
  'IKAT',
  'PORSI',
  'CUP',
  'BUNGKUS',
  'LUSIN',
  'PALLET',
  'KOLI',
]);

export const storage_temp_enum = pgEnum('storage_temp_enum', [
  'AMBIENT',
  'CHILLED',
  'FROZEN',
]);

export const pool_status_enum = pgEnum('pool_status_enum', [
  'OPEN',
  'AGGREGATING',
  'LOCKED',
  'COMPLETED',
  'FAILED',
]);

export const delivery_method_enum = pgEnum('delivery_method_enum', [
  'HEMAT_HUB',
  'DIRECT_DOOR_TO_DOOR',
]);

export const po_status_enum = pgEnum('po_status_enum', [
  'ISSUED',
  'PAID_TO_ESCROW',
  'SHIPPED',
  'DELIVERED',
]);

export const payment_status_enum = pgEnum('payment_status_enum', [
  'PENDING',
  'SETTLED',
  'REFUNDED',
]);

export const escrow_type_enum = pgEnum('escrow_type_enum', [
  'PROCUREMENT_ESCROW',
  'WASTE_ESCROW',
]);

export const escrow_status_enum = pgEnum('escrow_status_enum', [
  'HELD',
  'RELEASED',
  'REFUNDED',
]);

export const cost_category_enum = pgEnum('cost_category_enum', [
  'LABOR',
  'OVERHEAD_GAS_ELECTRICITY',
  'PACKAGING',
  'LOGISTICS_OTHER',
]);

export const waste_category_enum = pgEnum('waste_category_enum', [
  'ORGANIK_BASAH',
  'ORGANIK_KERING',
  'TEKSTIL_PERCA',
  'ANORGANIK',
]);

export const waste_listing_status_enum = pgEnum('waste_listing_status_enum', [
  'AVAILABLE',
  'SOLD_OUT',
  'REFERRED_TO_OFFTAKER',
]);

export const waste_fulfillment_enum = pgEnum('waste_fulfillment_enum', [
  'PAID_HELD_IN_ESCROW',
  'PICKED_UP',
  'ACCEPTED_COMPLETED',
]);

export const referral_status_enum = pgEnum('referral_status_enum', [
  'REQUESTED',
  'PICKED_UP_BY_OFFTAKER',
]);

// ==========================================
// 2. TABLES DEFINITIONS
// ==========================================

// 2.1. Business Entities
export const business_entities = pgTable('business_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  auth_user_id: uuid('auth_user_id'),
  legal_name: varchar('legal_name').notNull(),
  npwp_nib: varchar('npwp_nib').notNull().unique(),
  default_address: text('default_address').notNull(),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  phone_number: varchar('phone_number', { length: 20 }),
  bank_account_info: jsonb('bank_account_info').default({}),
  profile_picture_url: text('profile_picture_url'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.2. Business Roles
export const business_roles = pgTable('business_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  entity_id: uuid('entity_id')
    .references(() => business_entities.id)
    .notNull(),
  role_type: role_type_enum('role_type').notNull(),
  sector_type: sector_type_enum('sector_type'),
  storage_capacity: integer('storage_capacity').default(0).notNull(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.3. Offtaker Directories
export const offtaker_directories = pgTable('offtaker_directories', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_name: varchar('org_name').notNull(),
  contact_person: varchar('contact_person'),
  phone: varchar('phone'),
  address: text('address'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  accepted_waste_types: jsonb('accepted_waste_types').default([]).notNull(),
  service_area_city: varchar('service_area_city').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2.4. Supplier Commodities
export const supplier_commodities = pgTable('supplier_commodities', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplier_role_id: uuid('supplier_role_id')
    .references(() => business_roles.id)
    .notNull(),
  name: varchar('name').notNull(),
  sku: varchar('sku').notNull(),
  wholesale_unit: wholesale_unit_enum('wholesale_unit').notNull(),
  base_price: numeric('base_price').notNull(),
  stock: numeric('stock').default('0.00').notNull(),
  base_moq: numeric('base_moq').notNull(),
  lead_time_days: integer('lead_time_days').default(1).notNull(),
  image_url: text('image_url'),
  description: text('description'),
  production_date: date('production_date'),
  closed_date: date('closed_date'),
  reserved_stock: numeric('reserved_stock').default('0.00').notNull(),
  auto_activate_marketplace: boolean('auto_activate_marketplace')
    .default(false)
    .notNull(),
  allows_under_moq: boolean('allows_under_moq').default(false).notNull(),
  under_moq_price_per_kg: numeric('under_moq_price_per_kg'),
  is_marketplace_active: boolean('is_marketplace_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.5. Commodity Price Tiers
export const commodity_price_tiers = pgTable('commodity_price_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  commodity_id: uuid('commodity_id')
    .references(() => supplier_commodities.id)
    .notNull(),
  min_qty: numeric('min_qty').notNull(),
  max_qty: numeric('max_qty').notNull(),
  tier_price: numeric('tier_price').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2.6. Commodity Batch Tags
export const commodity_batch_tags = pgTable('commodity_batch_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  commodity_id: uuid('commodity_id')
    .references(() => supplier_commodities.id)
    .notNull(),
  supporting_file_url: text('supporting_file_url'),
  storage_temperature_type: storage_temp_enum('storage_temperature_type')
    .default('AMBIENT')
    .notNull(),
  is_verified: boolean('is_verified').default(false).notNull(),
  verification_notes: text('verification_notes'),
  verified_at: timestamp('verified_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2.7. Procurement Pools
export const procurement_pools = pgTable('procurement_pools', {
  id: uuid('id').defaultRandom().primaryKey(),
  commodity_id: uuid('commodity_id')
    .references(() => supplier_commodities.id)
    .notNull(),
  host_umkm_role_id: uuid('host_umkm_role_id').references(() => business_roles.id),
  target_moq: numeric('target_moq').notNull(),
  accumulated_qty: numeric('accumulated_qty').default('0.00').notNull(),
  pool_status: pool_status_enum('pool_status').default('OPEN').notNull(),
  locked_tier_price: numeric('locked_tier_price'),
  target_delivery_date: date('target_delivery_date'),
  cutoff_date: date('cutoff_date'),
  is_asap_allowed: boolean('is_asap_allowed').default(true),
  is_direct_order: boolean('is_direct_order').default(false).notNull(),
  estimated_delivery_date: date('estimated_delivery_date'),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  default_hub_address: text('default_hub_address'),
  hub_latitude: numeric('hub_latitude'),
  hub_longitude: numeric('hub_longitude'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.8. Pool Participants
export const pool_participants = pgTable('pool_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  pool_id: uuid('pool_id')
    .references(() => procurement_pools.id)
    .notNull(),
  umkm_role_id: uuid('umkm_role_id')
    .references(() => business_roles.id)
    .notNull(),
  order_qty: numeric('order_qty').notNull(),
  delivery_method: delivery_method_enum('delivery_method'),
  required_delivery_date: date('required_delivery_date'),
  is_urgent_asap: boolean('is_urgent_asap').default(false).notNull(),
  final_delivery_address: text('final_delivery_address').notNull(),
  final_delivery_lat: numeric('final_delivery_lat').notNull(),
  final_delivery_lng: numeric('final_delivery_lng').notNull(),
  allocated_shipping_fee: numeric('allocated_shipping_fee').default('0.00').notNull(),
  pickup_code: varchar('pickup_code', { length: 10 }),
  is_picked_up: boolean('is_picked_up').default(false).notNull(),
  picked_up_at: timestamp('picked_up_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2.9. Consolidated POs
export const consolidated_pos = pgTable('consolidated_pos', {
  id: uuid('id').defaultRandom().primaryKey(),
  pool_id: uuid('pool_id')
    .references(() => procurement_pools.id)
    .notNull()
    .unique(),
  supplier_role_id: uuid('supplier_role_id')
    .references(() => business_roles.id)
    .notNull(),
  total_amount: numeric('total_amount').notNull(),
  po_status: po_status_enum('po_status').default('ISSUED').notNull(),
  delivery_date: date('delivery_date'),
  driver_name: varchar('driver_name', { length: 150 }),
  tracking_number: varchar('tracking_number', { length: 150 }),
  delivery_proof_url: text('delivery_proof_url'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.10. UMKM Procurement Orders
export const umkm_procurement_orders = pgTable('umkm_procurement_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  participant_id: uuid('participant_id')
    .references(() => pool_participants.id)
    .notNull()
    .unique(),
  raw_material_subtotal: numeric('raw_material_subtotal').notNull(),
  shipping_fee: numeric('shipping_fee').notNull(),
  grand_total: numeric('grand_total').notNull(),
  payment_status: payment_status_enum('payment_status').default('PENDING').notNull(),
  payment_deadline: timestamp('payment_deadline', { withTimezone: true }),
  snap_token: text('snap_token'),
  snap_redirect_url: text('snap_redirect_url'),
  payment_method: varchar('payment_method'),
  settlement_time: timestamp('settlement_time', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.11. Payment Transactions
export const payment_transactions = pgTable('payment_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  order_id: uuid('order_id')
    .references(() => umkm_procurement_orders.id, { onDelete: 'cascade' })
    .notNull(),
  midtrans_order_id: varchar('midtrans_order_id', { length: 150 }).notNull().unique(),
  transaction_id: varchar('transaction_id', { length: 150 }),
  payment_type: varchar('payment_type', { length: 100 }),
  gross_amount: numeric('gross_amount').notNull(),
  transaction_status: varchar('transaction_status', { length: 100 }).notNull(),
  fraud_status: varchar('fraud_status', { length: 50 }),
  snap_token: text('snap_token'),
  snap_redirect_url: text('snap_redirect_url'),
  raw_response: jsonb('raw_response'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.12. Escrow Transactions
export const escrow_transactions = pgTable('escrow_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  transaction_type: escrow_type_enum('transaction_type').notNull(),
  order_reference_id: uuid('order_reference_id').notNull(),
  amount: numeric('amount').notNull(),
  escrow_status: escrow_status_enum('escrow_status').default('HELD').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.12. UMKM Products
export const umkm_products = pgTable('umkm_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  umkm_role_id: uuid('umkm_role_id')
    .references(() => business_roles.id)
    .notNull(),
  product_name: varchar('product_name').notNull(),
  unit: unit_enum('unit').default('PCS').notNull(),
  target_selling_price_per_unit: numeric('target_selling_price_per_unit').notNull(),
  expected_batch_units: integer('expected_batch_units').default(1).notNull(),
  calculated_hpp_per_unit: numeric('calculated_hpp_per_unit').default('0.00'),
  projected_margin_percentage: numeric('projected_margin_percentage').default('0.00'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.13. Recipe Details
export const recipe_details = pgTable('recipe_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  umkm_product_id: uuid('umkm_product_id')
    .references(() => umkm_products.id)
    .notNull(),
  ingredient_name: varchar('ingredient_name').notNull(),
  required_qty_per_unit: numeric('required_qty_per_unit').notNull(),
  unit: unit_enum('unit').notNull(),
  total_batch_required_qty: numeric('total_batch_required_qty').notNull(),
  estimated_cost_per_unit: numeric('estimated_cost_per_unit').default('0.00').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2.14. Production Cost Items
export const production_cost_items = pgTable('production_cost_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  umkm_product_id: uuid('umkm_product_id')
    .references(() => umkm_products.id)
    .notNull(),
  cost_category: cost_category_enum('cost_category').notNull(),
  description: varchar('description').notNull(),
  cost_per_batch: numeric('cost_per_batch').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2.15. Waste Listings
export const waste_listings = pgTable('waste_listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  umkm_product_id: uuid('umkm_product_id').references(() => umkm_products.id),
  seller_role_id: uuid('seller_role_id')
    .references(() => business_roles.id)
    .notNull(),
  listing_title: varchar('listing_title').notNull(),
  waste_category: waste_category_enum('waste_category').notNull(),
  available_weight: numeric('available_weight').notNull(),
  price_per_kg: numeric('price_per_kg').notNull(),
  is_marketplace_visible: boolean('is_marketplace_visible').default(true),
  listing_status: waste_listing_status_enum('listing_status')
    .default('AVAILABLE')
    .notNull(),
  notes: text('notes'),
  expired_at: timestamp('expired_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.16. Waste Transactions
export const waste_transactions = pgTable('waste_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  listing_id: uuid('listing_id')
    .references(() => waste_listings.id)
    .notNull(),
  buyer_role_id: uuid('buyer_role_id')
    .references(() => business_roles.id)
    .notNull(),
  purchased_weight: numeric('purchased_weight').notNull(),
  total_amount: numeric('total_amount').notNull(),
  fulfillment_status: waste_fulfillment_enum('fulfillment_status')
    .default('PAID_HELD_IN_ESCROW')
    .notNull(),
  pickup_date: date('pickup_date'),
  pickup_code: varchar('pickup_code', { length: 10 }),
  picked_up_at: timestamp('picked_up_at', { withTimezone: true }),
  snap_token: text('snap_token'),
  snap_redirect_url: text('snap_redirect_url'),
  midtrans_order_id: varchar('midtrans_order_id', { length: 150 }),
  payment_status: payment_status_enum('payment_status').default('PENDING').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2.17. Offtaker Referral Logs
export const offtaker_referral_logs = pgTable('offtaker_referral_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  listing_id: uuid('listing_id')
    .references(() => waste_listings.id)
    .notNull(),
  offtaker_id: uuid('offtaker_id')
    .references(() => offtaker_directories.id)
    .notNull(),
  manifest_number: varchar('manifest_number').notNull().unique(),
  referral_status: referral_status_enum('referral_status')
    .default('REQUESTED')
    .notNull(),
  dispatched_at: timestamp('dispatched_at', { withTimezone: true }).defaultNow(),
});

// 2.18. UMKM Inventory Stocks
export const umkm_inventory_stocks = pgTable('umkm_inventory_stocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  umkm_role_id: uuid('umkm_role_id')
    .references(() => business_roles.id, { onDelete: 'cascade' })
    .notNull(),
  ingredient_name: varchar('ingredient_name', { length: 255 }).notNull(),
  current_stock: numeric('current_stock').default('0.00').notNull(),
  unit: unit_enum('unit').default('KG').notNull(),
  last_restocked_at: timestamp('last_restocked_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ==========================================
// 3. RELATIONS DEFINITIONS
// ==========================================

export const business_entities_relations = relations(business_entities, ({ many }) => ({
  roles: many(business_roles),
}));

export const business_roles_relations = relations(business_roles, ({ one, many }) => ({
  entity: one(business_entities, {
    fields: [business_roles.entity_id],
    references: [business_entities.id],
  }),
  supplier_commodities: many(supplier_commodities),
  pool_participants: many(pool_participants),
  consolidated_pos: many(consolidated_pos),
  umkm_products: many(umkm_products),
  waste_listings: many(waste_listings),
  waste_transactions: many(waste_transactions),
  inventory_stocks: many(umkm_inventory_stocks),
}));

export const offtaker_directories_relations = relations(offtaker_directories, ({ many }) => ({
  referral_logs: many(offtaker_referral_logs),
}));

export const supplier_commodities_relations = relations(supplier_commodities, ({ one, many }) => ({
  supplier_role: one(business_roles, {
    fields: [supplier_commodities.supplier_role_id],
    references: [business_roles.id],
  }),
  price_tiers: many(commodity_price_tiers),
  batch_tags: many(commodity_batch_tags),
  procurement_pools: many(procurement_pools),
}));

export const commodity_price_tiers_relations = relations(commodity_price_tiers, ({ one }) => ({
  commodity: one(supplier_commodities, {
    fields: [commodity_price_tiers.commodity_id],
    references: [supplier_commodities.id],
  }),
}));

export const commodity_batch_tags_relations = relations(commodity_batch_tags, ({ one }) => ({
  commodity: one(supplier_commodities, {
    fields: [commodity_batch_tags.commodity_id],
    references: [supplier_commodities.id],
  }),
}));

export const procurement_pools_relations = relations(procurement_pools, ({ one, many }) => ({
  commodity: one(supplier_commodities, {
    fields: [procurement_pools.commodity_id],
    references: [supplier_commodities.id],
  }),
  participants: many(pool_participants),
  consolidated_po: one(consolidated_pos),
}));

export const pool_participants_relations = relations(pool_participants, ({ one }) => ({
  pool: one(procurement_pools, {
    fields: [pool_participants.pool_id],
    references: [procurement_pools.id],
  }),
  umkm_role: one(business_roles, {
    fields: [pool_participants.umkm_role_id],
    references: [business_roles.id],
  }),
  procurement_order: one(umkm_procurement_orders),
}));

export const consolidated_pos_relations = relations(consolidated_pos, ({ one }) => ({
  pool: one(procurement_pools, {
    fields: [consolidated_pos.pool_id],
    references: [procurement_pools.id],
  }),
  supplier_role: one(business_roles, {
    fields: [consolidated_pos.supplier_role_id],
    references: [business_roles.id],
  }),
}));

export const umkm_procurement_orders_relations = relations(umkm_procurement_orders, ({ one, many }) => ({
  participant: one(pool_participants, {
    fields: [umkm_procurement_orders.participant_id],
    references: [pool_participants.id],
  }),
  payments: many(payment_transactions),
}));

export const payment_transactions_relations = relations(payment_transactions, ({ one }) => ({
  order: one(umkm_procurement_orders, {
    fields: [payment_transactions.order_id],
    references: [umkm_procurement_orders.id],
  }),
}));

export const umkm_products_relations = relations(umkm_products, ({ one, many }) => ({
  umkm_role: one(business_roles, {
    fields: [umkm_products.umkm_role_id],
    references: [business_roles.id],
  }),
  recipes: many(recipe_details),
  production_cost_items: many(production_cost_items),
  waste_listings: many(waste_listings),
}));

export const recipe_details_relations = relations(recipe_details, ({ one }) => ({
  product: one(umkm_products, {
    fields: [recipe_details.umkm_product_id],
    references: [umkm_products.id],
  }),
}));

export const production_cost_items_relations = relations(production_cost_items, ({ one }) => ({
  product: one(umkm_products, {
    fields: [production_cost_items.umkm_product_id],
    references: [umkm_products.id],
  }),
}));

export const waste_listings_relations = relations(waste_listings, ({ one, many }) => ({
  umkm_product: one(umkm_products, {
    fields: [waste_listings.umkm_product_id],
    references: [umkm_products.id],
  }),
  seller_role: one(business_roles, {
    fields: [waste_listings.seller_role_id],
    references: [business_roles.id],
  }),
  transactions: many(waste_transactions),
  referral_logs: many(offtaker_referral_logs),
}));

export const waste_transactions_relations = relations(waste_transactions, ({ one }) => ({
  listing: one(waste_listings, {
    fields: [waste_transactions.listing_id],
    references: [waste_listings.id],
  }),
  buyer_role: one(business_roles, {
    fields: [waste_transactions.buyer_role_id],
    references: [business_roles.id],
  }),
}));

export const offtaker_referral_logs_relations = relations(offtaker_referral_logs, ({ one }) => ({
  listing: one(waste_listings, {
    fields: [offtaker_referral_logs.listing_id],
    references: [waste_listings.id],
  }),
  offtaker: one(offtaker_directories, {
    fields: [offtaker_referral_logs.offtaker_id],
    references: [offtaker_directories.id],
  }),
}));

export const umkm_inventory_stocks_relations = relations(umkm_inventory_stocks, ({ one }) => ({
  umkm_role: one(business_roles, {
    fields: [umkm_inventory_stocks.umkm_role_id],
    references: [business_roles.id],
  }),
}));

// ==========================================
// 4. INFERRED TYPES
// ==========================================

export type BusinessEntity = InferSelectModel<typeof business_entities>;
export type NewBusinessEntity = InferInsertModel<typeof business_entities>;

export type BusinessRole = InferSelectModel<typeof business_roles>;
export type NewBusinessRole = InferInsertModel<typeof business_roles>;

export type OfftakerDirectory = InferSelectModel<typeof offtaker_directories>;
export type NewOfftakerDirectory = InferInsertModel<typeof offtaker_directories>;

export type SupplierCommodity = InferSelectModel<typeof supplier_commodities>;
export type NewSupplierCommodity = InferInsertModel<typeof supplier_commodities>;

export type CommodityPriceTier = InferSelectModel<typeof commodity_price_tiers>;
export type NewCommodityPriceTier = InferInsertModel<typeof commodity_price_tiers>;

export type CommodityBatchTag = InferSelectModel<typeof commodity_batch_tags>;
export type NewCommodityBatchTag = InferInsertModel<typeof commodity_batch_tags>;

export type ProcurementPool = InferSelectModel<typeof procurement_pools>;
export type NewProcurementPool = InferInsertModel<typeof procurement_pools>;

export type PoolParticipant = InferSelectModel<typeof pool_participants>;
export type NewPoolParticipant = InferInsertModel<typeof pool_participants>;

export type ConsolidatedPO = InferSelectModel<typeof consolidated_pos>;
export type NewConsolidatedPO = InferInsertModel<typeof consolidated_pos>;

export type UmkmProcurementOrder = InferSelectModel<typeof umkm_procurement_orders>;
export type NewUmkmProcurementOrder = InferInsertModel<typeof umkm_procurement_orders>;

export type PaymentTransaction = InferSelectModel<typeof payment_transactions>;
export type NewPaymentTransaction = InferInsertModel<typeof payment_transactions>;

export type EscrowTransaction = InferSelectModel<typeof escrow_transactions>;
export type NewEscrowTransaction = InferInsertModel<typeof escrow_transactions>;

export type UmkmProduct = InferSelectModel<typeof umkm_products>;
export type NewUmkmProduct = InferInsertModel<typeof umkm_products>;

export type RecipeDetail = InferSelectModel<typeof recipe_details>;
export type NewRecipeDetail = InferInsertModel<typeof recipe_details>;

export type ProductionCostItem = InferSelectModel<typeof production_cost_items>;
export type NewProductionCostItem = InferInsertModel<typeof production_cost_items>;

export type WasteListing = InferSelectModel<typeof waste_listings>;
export type NewWasteListing = InferInsertModel<typeof waste_listings>;

export type WasteTransaction = InferSelectModel<typeof waste_transactions>;
export type NewWasteTransaction = InferInsertModel<typeof waste_transactions>;

export type OfftakerReferralLog = InferSelectModel<typeof offtaker_referral_logs>;
export type NewOfftakerReferralLog = InferInsertModel<typeof offtaker_referral_logs>;

export type UmkmInventoryStock = InferSelectModel<typeof umkm_inventory_stocks>;
export type NewUmkmInventoryStock = InferInsertModel<typeof umkm_inventory_stocks>;
