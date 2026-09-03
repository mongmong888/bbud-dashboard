import { NextRequest, NextResponse } from 'next/server';
import { saveContentPublishOverride } from '@/lib/contentPublishOverrides';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pageTitle: string | undefined = body?.pageTitle;
  const date: string | undefined = body?.date;

  if (!pageTitle || typeof pageTitle !== 'string') {
    return NextResponse.json({ error: 'pageTitle이 필요해요.' }, { status: 400 });
  }
  if (!date || typeof date !== 'string' || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date는 YYYY-MM-DD 형식이어야 해요.' }, { status: 400 });
  }

  try {
    await saveContentPublishOverride(pageTitle, date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('콘텐츠 발행일 수정 실패', err);
    return NextResponse.json({ error: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
}
