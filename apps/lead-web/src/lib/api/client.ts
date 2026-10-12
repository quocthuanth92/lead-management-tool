export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const BFF_BASE_PATH = '/api/lead-service';
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Try again.';

type QueryValue = string | number | boolean | null | undefined;

export function buildQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function messageFrom(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null || !('message' in payload)) {
    return GENERIC_ERROR_MESSAGE;
  }
  const { message } = payload as { message: unknown };
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join('. ');
  }
  return GENERIC_ERROR_MESSAGE;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown
): Promise<T> {
  const hasBody = body !== undefined;
  const response = await fetch(`${BFF_BASE_PATH}${path}`, {
    method,
    headers: hasBody
      ? { 'content-type': 'application/json', accept: 'application/json' }
      : { accept: 'application/json' },
    body: hasBody ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(payload));
  }
  return payload as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body)
};
