/** @jest-environment node */
import { NextRequest } from 'next/server';

import { __setCookies } from '../../../../test/mocks/next-headers';
import * as routeModule from './route';

const { GET, POST, PUT } = routeModule;

type RequestOptions = ConstructorParameters<typeof NextRequest>[1];
type FetchCall = [string, { method?: string; headers?: HeadersInit; body?: BodyInit | null }];

const OBJECT_ID = '65f1a2b3c4d5e6f7a8b9c0d1';
const TOKEN = 'jwt-token-value';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

function context(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function request(url: string, init?: RequestOptions): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

beforeEach(() => {
  process.env.LEAD_SERVICE_URL = 'http://lead-service.test';
  fetchMock = jest.fn(
    async () =>
      new Response(JSON.stringify({ items: [], page: 1, limit: 20, total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  __setCookies({ lead_session: TOKEN });
});

afterEach(() => {
  global.fetch = originalFetch;
  __setCookies({});
});

describe('lead-service BFF proxy', () => {
  it('forwards an allowed GET with the query string and a bearer token from the session cookie', async () => {
    const response = await GET(
      request('/api/lead-service/leads?page=2&limit=20', {
        headers: { cookie: `lead_session=${TOKEN}`, 'x-api-key': 'internal-secret' }
      }),
      context('leads')
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as FetchCall;
    expect(url).toBe('http://lead-service.test/api/v1/leads?page=2&limit=20');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${TOKEN}`);
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('x-api-key')).toBeNull();
  });

  it('returns 401 in the shared error shape when there is no session cookie', async () => {
    __setCookies({});
    const response = await GET(request('/api/lead-service/leads'), context('leads'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 404 for paths outside the allowlist without calling the upstream', async () => {
    const response = await GET(request('/api/lead-service/admin/users'), context('admin', 'users'));

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 404 for traversal and encoded-slash segments', async () => {
    const traversal = await GET(
      request('/api/lead-service/leads/../auth'),
      context('leads', '..', 'auth')
    );
    const encodedSlash = await GET(
      request('/api/lead-service/leads/x%2Fy'),
      context('leads', 'x/y')
    );

    expect(traversal.status).toBe(404);
    expect(encodedSlash.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects the ingestion route for browsers (no POST /leads)', async () => {
    const response = await POST(
      request('/api/lead-service/leads', { method: 'POST', body: '{}' }),
      context('leads')
    );

    expect(response.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 405 for a known path with a disallowed method', async () => {
    const response = await PUT(
      request(`/api/lead-service/leads/${OBJECT_ID}`, { method: 'PUT', body: '{}' }),
      context('leads', OBJECT_ID)
    );

    expect(response.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards an activity POST body and content type', async () => {
    const body = JSON.stringify({ type: 'CALL', content: 'Called customer' });
    const response = await POST(
      request(`/api/lead-service/leads/${OBJECT_ID}/activities`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body
      }),
      context('leads', OBJECT_ID, 'activities')
    );

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as FetchCall;
    expect(url).toBe(`http://lead-service.test/api/v1/leads/${OBJECT_ID}/activities`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(body);
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
  });

  it('forwards a label PUT to the label route', async () => {
    await PUT(
      request(`/api/lead-service/leads/${OBJECT_ID}/label`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: 'SPAM' })
      }),
      context('leads', OBJECT_ID, 'label')
    );

    const [url, init] = fetchMock.mock.calls[0] as FetchCall;
    expect(url).toBe(`http://lead-service.test/api/v1/leads/${OBJECT_ID}/label`);
    expect(init.method).toBe('PUT');
  });

  it('rejects bodies over the size cap with 413', async () => {
    const response = await POST(
      request(`/api/lead-service/leads/${OBJECT_ID}/activities`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'x'.repeat(20 * 1024)
      }),
      context('leads', OBJECT_ID, 'activities')
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes upstream error status and body through unchanged', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ statusCode: 404, message: 'Lead not found', error: 'Not Found' }),
        {
          status: 404,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const response = await GET(
      request(`/api/lead-service/leads/${OBJECT_ID}`),
      context('leads', OBJECT_ID)
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      statusCode: 404,
      message: 'Lead not found',
      error: 'Not Found'
    });
  });

  it('returns 502 without echoing the token when the upstream is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error(`connect ECONNREFUSED with ${TOKEN}`));

    const response = await GET(request('/api/lead-service/leads'), context('leads'));

    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).not.toContain(TOKEN);
  });

  it('exports only the GET, POST and PUT verbs', () => {
    expect(GET).toBeDefined();
    expect(POST).toBeDefined();
    expect(PUT).toBeDefined();
    expect(routeModule).not.toHaveProperty('DELETE');
  });
});
