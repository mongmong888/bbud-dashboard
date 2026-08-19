import { NextResponse } from 'next/server';
import { loadSnapshot } from '@/lib/members';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await loadSnapshot();
  return NextResponse.json({ snapshot });
}
