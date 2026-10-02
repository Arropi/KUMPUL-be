import type {
  UmkmProduct,
  NewUmkmProduct,
  RecipeDetail,
  NewRecipeDetail,
} from './database-types';

export type UnitType =
  | 'KG'
  | 'GRAM'
  | 'MG'
  | 'TON'
  | 'KUINTAL'
  | 'LITER'
  | 'ML'
  | 'KUBIK'
  | 'PCS'
  | 'EKOR'
  | 'BUTIR'
  | 'LEMBAR'
  | 'IKAT'
  | 'PORSI'
  | 'CUP'
  | 'BUNGKUS'
  | 'PACK'
  | 'PAX'
  | 'DUS'
  | 'BOX'
  | 'KARTON'
  | 'KARUNG'
  | 'SAK'
  | 'KRAT'
  | 'BAL'
  | 'BOTOL'
  | 'KALENG'
  | 'TRAY'
  | 'KERANJANG'
  | 'BASKOM'
  | 'LUSIN'
  | 'PALLET'
  | 'KOLI';

export interface CreateProductDTO {
  umkm_role_id: string;
  product_name: string;
  unit?: UnitType;
  target_selling_price_per_unit: number | string;
  expected_batch_units?: number;
}

export interface UpdateProductDTO {
  product_name?: string;
  unit?: UnitType;
  target_selling_price_per_unit?: number | string;
  expected_batch_units?: number;
}

export interface ProductWithRecipes extends UmkmProduct {
  recipes: RecipeDetail[];
}

export type ProductRecord = UmkmProduct;
export type ProductInsertPayload = NewUmkmProduct;

export interface CreateRecipeDTO {
  umkm_product_id: string;
  ingredient_name: string;
  required_qty_per_unit: number | string;
  unit: UnitType;
  estimated_cost_per_unit?: number | string;
}

export interface UpdateRecipeDTO {
  ingredient_name?: string;
  required_qty_per_unit?: number | string;
  unit?: UnitType;
  estimated_cost_per_unit?: number | string;
}

export type RecipeRecord = RecipeDetail;
export type RecipeInsertPayload = NewRecipeDetail;
