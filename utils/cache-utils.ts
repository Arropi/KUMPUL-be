import { LRUCache } from 'lru-cache';

/**
 * KUMPUL Backend In-Memory Multi-Layer LRU Cache
 * Sesuai spesifikasi arsitektur teknis pada PPT Slide 8:
 * - authRoleCache: TTL 5 menit
 * - marketplaceCache: TTL 45 detik
 * - dashboardCache: TTL 30 detik
 * - offtakerCache: TTL 1 jam
 * - poolCutoffGate: TTL 60 detik
 * - aiDocumentCache: TTL 24 jam
 * - orderPoCache: TTL 60 detik (instans ke-7 pelengkap transaksi PO)
 */

// 1. authRoleCache: Cache resolusi active role entity (TTL 5 menit)
export const authRoleCache = new LRUCache<string, string>({
  max: 500,
  ttl: 5 * 60 * 1000, // 5 menit
});

// 2. marketplaceCache: Cache daftar katalog komoditas & benchmark harga (TTL 45 detik)
export const marketplaceCache = new LRUCache<string, any>({
  max: 200,
  ttl: 45 * 1000, // 45 detik
});

// 3. dashboardCache: Cache metrik dashboard operasional UMKM & Supplier (TTL 30 detik)
export const dashboardCache = new LRUCache<string, any>({
  max: 200,
  ttl: 30 * 1000, // 30 detik
});

// 4. offtakerCache: Cache direktori geospasial Bank Sampah / offtakers di DIY (TTL 1 jam)
export const offtakerCache = new LRUCache<string, any>({
  max: 100,
  ttl: 60 * 60 * 1000, // 1 jam
});

// 5. poolCutoffGate: Cache status pooling & cutoff timer (TTL 60 detik)
export const poolCutoffGate = new LRUCache<string, any>({
  max: 300,
  ttl: 60 * 1000, // 60 detik
});

// 6. aiDocumentCache: Cache hasil ekstraksi dokumen verifikasi mutu AI Gemini (TTL 24 jam)
export const aiDocumentCache = new LRUCache<string, any>({
  max: 500,
  ttl: 24 * 60 * 60 * 1000, // 24 jam
});

// 7. orderPoCache: Cache ringkasan Consolidated PO & pesanan partisipan (TTL 60 detik)
export const orderPoCache = new LRUCache<string, any>({
  max: 300,
  ttl: 60 * 1000, // 60 detik
});

// 8. profileCache: Cache profil entitas & roles (TTL 5 menit)
export const profileCache = new LRUCache<string, any>({
  max: 300,
  ttl: 5 * 60 * 1000, // 5 menit
});

// 9. recommendationsCache: Cache rekomendasi cerdas UMKM & Supplier (TTL 60 detik)
export const recommendationsCache = new LRUCache<string, any>({
  max: 200,
  ttl: 60 * 1000, // 60 detik
});

// 10. wasteListingCache: Cache bursa listing limbah sirkular (TTL 45 detik)
export const wasteListingCache = new LRUCache<string, any>({
  max: 200,
  ttl: 45 * 1000, // 45 detik
});

// 11. poolListCache: Cache daftar procurement pools (TTL 30 detik)
export const poolListCache = new LRUCache<string, any>({
  max: 100,
  ttl: 30 * 1000, // 30 detik
});

/**
 * EVENT-DRIVEN CACHE INVALIDATION HELPERS
 * Dipanggil otomatis saat mutasi data terjadi agar cache tetap konsisten (ACID compliant).
 */

export const invalidate_marketplace_cache = (): void => {
  marketplaceCache.clear();
};

export const invalidate_dashboard_cache = (role_id?: string): void => {
  if (role_id) {
    for (const key of dashboardCache.keys()) {
      if (key.includes(role_id)) {
        dashboardCache.delete(key);
      }
    }
  } else {
    dashboardCache.clear();
  }
};

export const invalidate_pool_cache = (pool_id?: string): void => {
  if (pool_id) {
    poolCutoffGate.delete(pool_id);
    for (const key of poolCutoffGate.keys()) {
      if (key.includes(pool_id)) {
        poolCutoffGate.delete(key);
      }
    }
  } else {
    poolCutoffGate.clear();
  }
  // Mutasi pool mempengaruhi katalog marketplace, pool list, dan rekomendasi
  invalidate_marketplace_cache();
  poolListCache.clear();
  recommendationsCache.clear();
};

export const invalidate_order_po_cache = (po_id?: string): void => {
  if (po_id) {
    orderPoCache.delete(po_id);
    for (const key of orderPoCache.keys()) {
      if (key.includes(po_id)) {
        orderPoCache.delete(key);
      }
    }
  } else {
    orderPoCache.clear();
  }
  dashboardCache.clear();
};

export const invalidate_auth_role_cache = (key?: string): void => {
  if (key) {
    authRoleCache.delete(key);
  } else {
    authRoleCache.clear();
  }
};

export const invalidate_profile_cache = (entity_id?: string): void => {
  if (entity_id) {
    profileCache.delete(`profile_detail_${entity_id}`);
    for (const key of profileCache.keys()) {
      if (key.includes(entity_id) || key.startsWith('profile_list_')) {
        profileCache.delete(key);
      }
    }
  } else {
    profileCache.clear();
  }
};

export const invalidate_recommendations_cache = (): void => {
  recommendationsCache.clear();
};

export const invalidate_waste_cache = (listing_id?: string): void => {
  if (listing_id) {
    wasteListingCache.delete(`waste_detail_${listing_id}`);
    for (const key of wasteListingCache.keys()) {
      if (key.startsWith('waste_listings_')) {
        wasteListingCache.delete(key);
      }
    }
  } else {
    wasteListingCache.clear();
  }
};

export const invalidate_pool_list_cache = (): void => {
  poolListCache.clear();
};

export const invalidate_all_caches = (): void => {
  authRoleCache.clear();
  marketplaceCache.clear();
  dashboardCache.clear();
  offtakerCache.clear();
  poolCutoffGate.clear();
  aiDocumentCache.clear();
  orderPoCache.clear();
  profileCache.clear();
  recommendationsCache.clear();
  wasteListingCache.clear();
  poolListCache.clear();
};
