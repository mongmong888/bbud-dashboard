import { NextRequest, NextResponse } from 'next/server';
import { loadDauIssues, addDauIssue, removeDauIssue } from '@/lib/dauIssues';

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
  const action = body?.action;

  if (typeof date !== 'string') {
    return NextResponse.json({ error: 'date가 필요해요.' }, { status: 400 });
  }

  try {
    if (action === 'add') {
      if (typeof body?.note !== 'string' || !body.note.trim()) {
        return NextResponse.json({ error: 'note가 필요해요.' }, { status: 400 });
      }
      const issues = await addDauIssue(date, body.note);
      return NextResponse.json({ issues });
    }
    if (action === 'remove') {
      if (typeof body?.index !== 'number') {
        return NextResponse.json({ error: 'index가 필요해요.' }, { status: 400 });
      }
      const issues = await removeDauIssue(date, body.index);
      return NextResponse.json({ issues });
    }
    return NextResponse.json({ error: "action은 'add' 또는 'remove'여야 해요." }, { status: 400 });
  } catch (err) {
    console.error('DAU 이슈 메모 저장 실패', err);
    return NextResponse.json({ error: '메모를 저장하지 못했어요.' }, { status: 502 });
  }
}
