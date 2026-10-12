import { createHmac, randomBytes } from 'node:crypto';

import { APIRequestContext, APIResponse, request } from '@playwright/test';

import { config, getLeadApiKey, type SalespersonCredentials } from './config';

export interface LeadPayload {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}

export interface LeadListItem {
  id: string;
  customerName: string;
  email?: string | null;
  phone: string;
  label: string;
  hasView: boolean;
  lastUpdate: string;
}

export interface PagedLeads {
  items: LeadListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface LeadDetailsBody extends Omit<LeadListItem, 'email'> {
  email?: string | null;
  source: 'INTERNAL' | 'EXTERNAL';
  message: string;
  createdAt: string;
  activities: LeadActivity[];
  activitiesTotal: number;
}

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

const accessTokens = new Map<string, string>();

export async function getAccessToken(account: SalespersonCredentials): Promise<string> {
  const cached = accessTokens.get(account.email);
  if (cached) {
    return cached;
  }
  const context = await request.newContext({ baseURL: config.apiBaseUrl });
  try {
    const response = await context.post('/api/v1/auth/login', {
      data: { email: account.email, password: account.password }
    });
    if (!response.ok()) {
      throw new Error(
        `Sign-in failed for salesperson ${account.label} (status ${response.status()})`
      );
    }
    const body = (await response.json()) as { accessToken: string };
    accessTokens.set(account.email, body.accessToken);
    return body.accessToken;
  } finally {
    await context.dispose();
  }
}

async function toResult<T>(response: APIResponse): Promise<ApiResult<T>> {
  const body = (await response.json().catch(() => undefined)) as T;
  return { status: response.status(), body };
}

interface RequestOptions {
  token?: string;
  data?: unknown;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export async function apiRequest<T = unknown>(
  api: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  const response = await api.fetch(`/api/v1${path}`, {
    method,
    data: options.data,
    params: options.params,
    headers
  });
  return toResult<T>(response);
}

export function ingestLeadViaApi(
  api: APIRequestContext,
  payload: LeadPayload,
  apiKey: string | null = getLeadApiKey()
): Promise<ApiResult<{ id: string } | { statusCode: number }>> {
  return apiRequest(api, 'POST', '/leads', {
    data: payload,
    headers: apiKey === null ? {} : { 'x-api-key': apiKey }
  });
}

export function listLeads(
  api: APIRequestContext,
  token: string,
  params: Record<string, string | number> = {}
): Promise<ApiResult<PagedLeads>> {
  return apiRequest<PagedLeads>(api, 'GET', '/leads', { token, params });
}

export function searchLeads(
  api: APIRequestContext,
  token: string,
  params: Record<string, string | number>
): Promise<ApiResult<PagedLeads>> {
  return apiRequest<PagedLeads>(api, 'GET', '/leads/search', { token, params });
}

export function getLeadDetails(
  api: APIRequestContext,
  token: string,
  leadId: string
): Promise<ApiResult<LeadDetailsBody>> {
  return apiRequest<LeadDetailsBody>(api, 'GET', `/leads/${leadId}`, { token });
}

export function setLeadLabel(
  api: APIRequestContext,
  token: string,
  leadId: string,
  label: string
): Promise<ApiResult> {
  return apiRequest(api, 'PUT', `/leads/${leadId}/label`, { token, data: { label } });
}

export function addLeadActivity(
  api: APIRequestContext,
  token: string,
  leadId: string,
  content: string,
  type = 'NOTE'
): Promise<ApiResult<LeadActivity>> {
  return apiRequest<LeadActivity>(api, 'POST', `/leads/${leadId}/activities`, {
    token,
    data: { type, content }
  });
}

export function listLeadActivities(
  api: APIRequestContext,
  token: string,
  leadId: string
): Promise<ApiResult<{ items: LeadActivity[]; page: number; limit: number; total: number }>> {
  return apiRequest(api, 'GET', `/leads/${leadId}/activities`, {
    token,
    params: { page: 1, limit: 50 }
  });
}

export function getServiceHealth(api: APIRequestContext): Promise<APIResponse> {
  return api.get('/api/v1/health');
}

// A token with an expiry in the past, signed with a random key the service does not know.
export function expiredToken(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: 'expired-user', exp: Math.floor(Date.now() / 1000) - 3600 });
  const signature = createHmac('sha256', randomBytes(32))
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}
