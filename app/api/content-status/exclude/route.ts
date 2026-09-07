import { NextRequest, NextResponse } from 'next/server';
import { excludeContentTitle } from '@/lib/contentPublishOverrides';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pageTitle: string | undefined = body?.pageTitle;

  if (!pageTitle || typeof pageTitle !== 'string') {
    return NextResponse.json({ error: 'pageTitle이 필요해요.' }, { status: 400 });
  }

  try {
    await excludeContentTitle(pageTitle);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('콘텐츠 삭제(숨김) 실패', err);
    return NextResponse.json({ error: '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
}
