import { NextRequest, NextResponse } from 'next/server';

import { getLeadServiceUrl } from '../../../../lib/server/session';

async function proxyRequest(request: NextRequest, path: string[]): Promise<NextResponse> {
  const baseUrl = getLeadServiceUrl();
  const targetUrl = `${baseUrl}/${path.join('/')}${request.nextUrl.search}`;
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method === 'GET' ? undefined : await request.text()
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' }
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
