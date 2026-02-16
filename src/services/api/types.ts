/**
 * Shared API Service Types
 * 
 * These types define the contract between frontend hooks and backend services.
 * Swap the implementation (Supabase, REST API, etc.) without changing hooks.
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface ServiceUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ServiceSession {
  accessToken: string;
  user: ServiceUser;
}
