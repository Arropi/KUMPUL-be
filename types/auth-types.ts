import type {
  BusinessRoleRecord,
  BusinessEntityRecord,
  RoleType,
  SectorType,
} from './profile-types';

export interface AuthUserPayload {
  user_id?: string;
  auth_user_id?: string;
  sub?: string;
  email?: string;
  role?: RoleType | string;
  role_type?: RoleType | string;
  roles?: (RoleType | string)[];
  entity_id?: string;
  active_role?: BusinessRoleRecord;
  app_metadata?: {
    role?: RoleType | string;
    roles?: (RoleType | string)[];
    [key: string]: unknown;
  };
  user_metadata?: {
    role?: RoleType | string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RegisterUserInputDTO {
  user_id: string;
  role: RoleType;
  sector: SectorType;
  legal_name: string;
  npwp_nib: string;
  default_address: string;
  latitude: number | string;
  longitude: number | string;
  bank_account_info: Record<string, unknown>;
  profile_picture_url: string;
  storage_capacity?: number;
}

export interface RegisterUserResultDTO {
  user_id: string;
  entity_id: string;
  role: RoleType;
  sector: SectorType;
  business_role: BusinessRoleRecord;
  business_entity: BusinessEntityRecord;
}

export interface LoginUserInputDTO {
  user_id: string;
  role?: RoleType;
}

export interface LoginUserResultDTO {
  token: string;
  user_id: string;
  entity_id: string;
  active_role: BusinessRoleRecord;
  available_roles: BusinessRoleRecord[];
  business_entity: BusinessEntityRecord;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
