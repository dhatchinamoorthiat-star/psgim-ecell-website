import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiErrorBody, Me, Page, Role, RoleAssignment, User, Vertical } from './api.types';

const BASE = '/api/v1';

/** A failed API call, carrying the contract's error shape (docs/12_API_CONTRACT.md). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Partial<ApiErrorBody> | null;
    if (body?.error)
      return new ApiError(err.status, body.error.code, body.error.message, body.error.fields ?? {});
    if (err.status === 0)
      return new ApiError(0, 'network', 'Cannot reach the server. Check your connection.');
    return new ApiError(err.status, 'error', `Request failed (${err.status}).`);
  }
  return new ApiError(0, 'error', 'Something went wrong.');
}

type Query = Record<string, string | number | boolean | undefined | null>;

function params(q: Query = {}): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  return p;
}

/**
 * Thin typed wrapper over the Phase 1 endpoints. Returns promises so
 * components can use async/await with signals. Authorization is decided by
 * the server; this class never assumes a call will be allowed.
 */
@Injectable()
export class ApiService {
  private http = inject(HttpClient);

  private async call<T>(req: Promise<T>): Promise<T> {
    try {
      return await req;
    } catch (e) {
      throw toApiError(e);
    }
  }

  get<T>(path: string, query?: Query): Promise<T> {
    return this.call(firstValueFrom(this.http.get<T>(BASE + path, { params: params(query) })));
  }
  post<T>(path: string, body: unknown = {}): Promise<T> {
    return this.call(firstValueFrom(this.http.post<T>(BASE + path, body)));
  }
  patch<T>(path: string, body: unknown): Promise<T> {
    return this.call(firstValueFrom(this.http.patch<T>(BASE + path, body)));
  }

  // --- auth
  csrf = () => this.get<{ csrf_token: string }>('/auth/csrf');
  me = () => this.get<Me>('/auth/me');
  login = (email: string, password: string) => this.post<Me>('/auth/login', { email, password });
  logout = () => this.post<void>('/auth/logout');
  forgotPassword = (email: string) =>
    this.post<{ detail: string }>('/auth/password/forgot', { email });
  resetPassword = (uid: string, token: string, new_password: string) =>
    this.post<{ detail: string }>('/auth/password/reset', { uid, token, new_password });

  // --- users
  users = (q: Query = {}) => this.get<Page<User>>('/users', q);
  createUser = (body: { email: string; full_name: string; send_invite: boolean }) =>
    this.post<User>('/users', body);
  updateUser = (id: string, body: { full_name: string }) => this.patch<User>(`/users/${id}`, body);
  deactivateUser = (id: string) => this.post<User>(`/users/${id}/deactivate`);
  reactivateUser = (id: string) => this.post<User>(`/users/${id}/reactivate`);

  // --- verticals
  verticals = (q: Query = {}) => this.get<Page<Vertical>>('/verticals', q);
  createVertical = (body: Partial<Vertical>) => this.post<Vertical>('/verticals', body);
  updateVertical = (id: string, body: Partial<Vertical>) =>
    this.patch<Vertical>(`/verticals/${id}`, body);
  archiveVertical = (id: string, confirm: string) =>
    this.post<Vertical>(`/verticals/${id}/archive`, { confirm });

  // --- roles & assignments
  roles = () => this.get<Role[]>('/roles');
  assignments = (q: Query = {}) => this.get<Page<RoleAssignment>>('/role-assignments', q);
  assign = (body: {
    user_id: string;
    role: string;
    scope_type: string;
    scope_id?: string | null;
    note?: string;
  }) => this.post<RoleAssignment>('/role-assignments', body);
  revoke = (id: string, reason: string) =>
    this.post<RoleAssignment>(`/role-assignments/${id}/revoke`, { reason });
}
