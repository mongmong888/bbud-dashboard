import { NextRequest, NextResponse } from 'next/server';
import { loadDauIssues, saveDauIssue } from '@/lib/dauIssues';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const issues = await loadDauIssues();
    return NextResponse.json({ issues });
  } catch (err) {
    console.error('DAU 이슈 메모 조회 실패', err);
    return NextResponse.json({ error: '메모를 불러오지 못했어요.' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const date = body?.date;
  const note = body?.note;
  if (typeof date !== 'string' || typeof note !== 'string') {
    return NextResponse.json({ error: 'date, note가 필요해요.' }, { status: 400 });
  }

  try {
    const issues = await saveDauIssue(date, note);
    return NextResponse.json({ issues });
  } catch (err) {
    console.error('DAU 이슈 메모 저장 실패', err);
    return NextResponse.json({ error: '메모를 저장하지 못했어요.' }, { status: 502 });
  }
}
