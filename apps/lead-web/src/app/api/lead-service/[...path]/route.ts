import { NextRequest, NextResponse } from 'next/server';
import { API_PREFIX } from '@lead/shared-contracts';

import { matchProxyRoute, type ProxyMethod } from '../../../../lib/server/proxy-allowlist';
import { jsonError } from '../../../../lib/server/json-error';
import { getAccessToken, getLeadServiceUrl } from '../../../../lib/server/session';

const MAX_BODY_BYTES = 16 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;

type RouteContext = { params: Promise<{ path: string[] }> };

async function readBodyWithLimit(request: NextRequest, maxBytes: number): Promise<string | null> {
  if (!request.body) {
    return '';
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function forward(
  request: NextRequest,
  context: RouteContext,
  method: ProxyMethod
): Promise<NextResponse> {
  const { path } = await context.params;
  const match = matchProxyRoute(method, path);
  if (match === 'not-found') {
    return jsonError(404, 'Not found', 'Not Found');
  }
  if (match === 'method-not-allowed') {
    return jsonError(405, 'Method not allowed', 'Method Not Allowed');
  }

  const token = await getAccessToken();
  if (!token) {
    return jsonError(401, 'Unauthorized', 'Unauthorized');
  }

  const headers = new Headers({
    authorization: `Bearer ${token}`,
    accept: request.headers.get('accept') ?? 'application/json'
  });

  let body: string | undefined;
  if (method !== 'GET') {
    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > MAX_BODY_BYTES) {
      return jsonError(413, 'Request body is too large', 'Payload Too Large');
    }
    const text = await readBodyWithLimit(request, MAX_BODY_BYTES);
    if (text === null) {
      return jsonError(413, 'Request body is too large', 'Payload Too Large');
    }
    body = text;
    headers.set('content-type', request.headers.get('content-type') ?? 'application/json');
  }

  const targetUrl = `${getLeadServiceUrl()}/${API_PREFIX}/${path.join('/')}${request.nextUrl.search}`;

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store'
      }
    });
  } catch {
    return jsonError(502, 'Lead service is unavailable', 'Bad Gateway');
  }
}

export function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forward(request, context, 'GET');
}

export function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forward(request, context, 'POST');
}

export function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forward(request, context, 'PUT');
}
