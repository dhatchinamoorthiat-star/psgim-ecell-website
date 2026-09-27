/**
 * Typed models of the Phase 1 API (/api/v1). Hand-written to mirror the
 * Django serializers; the generated OpenAPI schema (/api/v1/schema) is the
 * authority if the two ever disagree.
 */

export type ScopeType = 'GLOBAL' | 'VERTICAL' | 'EVENT' | 'PROJECT';

export interface Grant {
  permission: string;
  scope_type: ScopeType;
  scope_id: string | null;
  own_only: boolean;
}

export interface MeUser {
  id: string;
  email: string;
  full_name: string;
  status: 'active' | 'inactive' | 'alumni';
  email_verified_at: string | null;
}

export interface Me {
  user: MeUser;
  permissions: Grant[];
  organization: { name: string; timezone: string };
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User extends MeUser {
  created_at: string;
  updated_at: string;
  last_login: string | null;
  deactivated_at: string | null;
}

export interface Vertical {
  id: string;
  slug: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  archived_at: string | null;
  is_platform_custodian: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string;
  is_system: boolean;
  is_privileged: boolean;
  assign_permission: string;
  permissions: { code: string; own_only: boolean }[];
}

export interface RoleAssignment {
  id: string;
  user: { id: string; email: string; full_name: string };
  role: string;
  role_name: string;
  scope_type: ScopeType;
  scope_id: string | null;
  academic_year: string | null;
  starts_at: string;
  ends_at: string | null;
  note: string;
  assigned_by: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}
