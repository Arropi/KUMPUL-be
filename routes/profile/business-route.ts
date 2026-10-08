import { Router } from 'express';
import {
  update_profile,
  patch_profile,
  delete_profile,
  create_business_role,
  update_business_role,
  delete_business_role,
  list_business_roles,
} from '../../controllers/profile/profile-controller.ts';
import {
  update_profile_validation,
  patch_profile_validation,
  get_profile_by_id_validation,
  create_business_role_validation,
  update_business_role_validation,
  delete_business_role_validation,
} from '../../validations/profile/profile-validation.ts';

const router = Router();

// Endpoint Entitas Bisnis (/api/business/entities/...)
router.put(
  '/entities/:id',
  get_profile_by_id_validation,
  update_profile_validation,
  update_profile
);

router.patch(
  '/entities/:id',
  get_profile_by_id_validation,
  patch_profile_validation,
  patch_profile
);

router.patch(
  '/entities/:id/profile',
  get_profile_by_id_validation,
  patch_profile_validation,
  patch_profile
);

router.delete(
  '/entities/:id',
  get_profile_by_id_validation,
  delete_profile
);

// Endpoint Peran Usaha (/api/business/roles/...)
router.get('/roles', list_business_roles);
router.post('/roles', create_business_role_validation, create_business_role);
router.put('/roles/:role_id', update_business_role_validation, update_business_role);
router.delete('/roles/:role_id', delete_business_role_validation, delete_business_role);

router.put('/roles/:id', update_business_role_validation, update_business_role);
router.delete('/roles/:id', delete_business_role_validation, delete_business_role);

export default router;
