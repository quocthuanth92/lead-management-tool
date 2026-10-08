import { NextResponse } from 'next/server';

import { fetchLeadServiceHealth } from '../../../lib/server/lead-service-client';

export async function GET() {
  const upstream = await fetchLeadServiceHealth();
  return NextResponse.json({
    status: 'ok',
    upstream
  });
}
