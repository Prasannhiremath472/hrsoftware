import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const TOKEN_STORAGE_KEY = 'auth_token';
export const USER_STORAGE_KEY = 'auth_user';

/** Envelope every backend endpoint responds with. */
export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface ApiFieldError {
  field?: string;
  message: string;
}

export interface ApiErrorBody {
  success?: boolean;
  message?: string;
  errors?: Array<ApiFieldError | string>;
}

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const axiosError = error as AxiosError<ApiErrorBody> | undefined;
  const body = axiosError?.response?.data;

  if (body?.message) return body.message;

  if (body?.errors?.length) {
    return body.errors
      .map((e) => (typeof e === 'string' ? e : e.message))
      .filter(Boolean)
      .join(', ');
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

/** Field-level validation errors returned by the backend, if any. */
export function extractFieldErrors(error: unknown): ApiFieldError[] {
  const axiosError = error as AxiosError<ApiErrorBody> | undefined;
  const errors = axiosError?.response?.data?.errors;
  if (!errors?.length) return [];
  return errors.map((e) => (typeof e === 'string' ? { message: e } : e));
}

/**
 * Build an absolute API URL carrying the bearer token as a query param — used for
 * links opened in a new tab / <img> sources where request headers can't be set.
 */
export function buildAuthedUrl(path: string, params: Record<string, string | undefined> = {}): string {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  const search = new URLSearchParams({ token });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalized}?${search.toString()}`;
}

export default api;
