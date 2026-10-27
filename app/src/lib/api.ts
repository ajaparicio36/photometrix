import { record, type Decoder } from './contract.ts';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api').replace(
  /\/+$/,
  '',
);
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly ambiguous: boolean;
  constructor(message: string, status = 0, code = 'NETWORK_ERROR', ambiguous = true) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.ambiguous = ambiguous;
  }
}
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export function query(path: string, params: Record<string, string | undefined>): string {
  const values = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  return `${path}${values.length ? '?' : ''}${values.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}
export async function request(
  path: string,
  token: string | null,
  options: RequestOptions = {},
): Promise<Response> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  options.signal?.addEventListener('abort', abort);
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: path.endsWith('.pdf') ? 'application/pdf' : 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
    });
    if (!response.ok) {
      let code = 'REQUEST_FAILED';
      let message = `Request failed (${response.status}). Please try again.`;
      try {
        const body = record((await response.json()) as unknown);
        if (typeof body.code === 'string') code = body.code;
        if (typeof body.message === 'string') message = body.message;
      } catch {
        /* The status still identifies an HTTP failure. */
      }
      if (response.status === 401)
        message = token
          ? 'Your session has expired. Sign in again.'
          : 'The email or password is incorrect.';
      if (code === 'RESOURCE_ACTIVE')
        message = 'This room or module has an active session. Stop that session first.';
      if (code === 'RESOURCE_ARCHIVED')
        message = 'This item is archived. Its history is still available.';
      if (response.status === 429)
        message = 'Too many requests. Wait a moment before trying again.';
      throw new ApiError(message, response.status, code, response.status >= 500);
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? 'The request timed out. Check your connection and refresh.'
        : 'Cannot reach Photometrix. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export async function requestJson<T>(
  path: string,
  token: string | null,
  decode: Decoder<T>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await request(path, token, options);
  try {
    return decode((await response.json()) as unknown);
  } catch {
    throw new ApiError(
      'The server returned an unexpected response. Refresh before trying again.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
}
