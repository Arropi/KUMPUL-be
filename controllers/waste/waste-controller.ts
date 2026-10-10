import type { Request, Response, NextFunction } from 'express';
import {
  buy_waste_listing_service,
  confirm_waste_pickup_service,
  create_waste_listing_service,
  delete_waste_listing_service,
  get_buyer_waste_transactions_service,
  get_nearest_offtakers_service,
  get_seller_waste_transactions_service,
  get_waste_listing_detail_service,
  get_waste_listings_service,
  refer_listing_to_offtaker_service,
  update_waste_listing_service,
} from '../../services/waste/waste-service.ts';
import type { WasteCategoryType, WasteListingStatusType } from '../../types/waste-types.ts';
import { get_authenticated_role_id } from '../../utils/auth-utils.ts';

export const create_waste_listing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const seller_role_id = await get_authenticated_role_id(req);
    const new_listing = await create_waste_listing_service(seller_role_id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Listing limbah berhasil dibuat',
      data: new_listing,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_waste_listings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter = {
      category: req.query.category as WasteCategoryType | undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      status: req.query.status as WasteListingStatusType | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    };

    const listings = await get_waste_listings_service(filter);

    res.status(200).json({
      status: 'success',
      message: 'Daftar limbah berhasil diambil',
      data: listings,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_waste_listing_detail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const listing_id = req.params.id as string;
    const listing_detail = await get_waste_listing_detail_service(listing_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail listing limbah berhasil diambil',
      data: listing_detail,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_waste_listing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const seller_role_id = await get_authenticated_role_id(req);
    const listing_id = req.params.id as string;
    const updated_listing = await update_waste_listing_service(
      seller_role_id,
      listing_id,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Listing limbah berhasil diperbarui',
      data: updated_listing,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const delete_waste_listing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const seller_role_id = await get_authenticated_role_id(req);
    const listing_id = req.params.id as string;
    await delete_waste_listing_service(seller_role_id, listing_id);

    res.status(200).json({
      status: 'success',
      message: 'Listing limbah berhasil dihapus',
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const buy_waste_listing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const buyer_role_id = await get_authenticated_role_id(req);
    const listing_id = req.params.id as string;

    const transaction = await buy_waste_listing_service(
      buyer_role_id,
      listing_id,
      req.body
    );

    res.status(201).json({
      status: 'success',
      message: 'Pesanan limbah berhasil dibuat',
      data: transaction,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const confirm_waste_pickup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const seller_role_id = await get_authenticated_role_id(req);
    const transaction_id = req.params.id as string;
    const pickup_code = req.body.pickup_code as string;

    const updated_transaction = await confirm_waste_pickup_service(
      seller_role_id,
      transaction_id,
      pickup_code
    );

    res.status(200).json({
      status: 'success',
      message: 'Pengambilan limbah berhasil dikonfirmasi dan dana escrow diteruskan',
      data: updated_transaction,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_nearest_offtakers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_id = await get_authenticated_role_id(req);
    const query = {
      listing_id: req.query.listing_id as string | undefined,
      latitude: req.query.latitude ? Number(req.query.latitude) : undefined,
      longitude: req.query.longitude ? Number(req.query.longitude) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 5,
    };

    const nearest_offtakers = await get_nearest_offtakers_service(role_id, query);

    res.status(200).json({
      status: 'success',
      message: 'Daftar Bank Sampah / TPS3R terdekat berhasil diambil',
      data: nearest_offtakers,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const refer_listing_to_offtaker = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const seller_role_id = await get_authenticated_role_id(req);
    const listing_id = req.params.id as string;
    const offtaker_id = req.body.offtaker_id as string;

    const referral_result = await refer_listing_to_offtaker_service(
      seller_role_id,
      listing_id,
      offtaker_id
    );

    res.status(200).json({
      status: 'success',
      message: 'Limbah berhasil dirujuk ke Bank Sampah / TPS3R mitra',
      data: referral_result,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_buyer_waste_transactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const buyer_role_id = await get_authenticated_role_id(req);
    const transactions = await get_buyer_waste_transactions_service(buyer_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Daftar pembelian limbah berhasil diambil',
      data: transactions,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_seller_waste_transactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const seller_role_id = await get_authenticated_role_id(req);
    const transactions = await get_seller_waste_transactions_service(seller_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Daftar penjualan limbah berhasil diambil',
      data: transactions,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
