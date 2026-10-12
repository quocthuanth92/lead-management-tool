import type { ErrorResponse } from '@lead/shared-contracts';
import { NextResponse } from 'next/server';

export function jsonError(statusCode: number, message: string, error: string): NextResponse {
  const body: ErrorResponse = { statusCode, message, error };
  return NextResponse.json(body, {
    status: statusCode,
    headers: { 'cache-control': 'no-store' }
  });
}
