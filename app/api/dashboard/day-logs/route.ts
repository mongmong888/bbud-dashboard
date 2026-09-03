import { NextRequest, NextResponse } from 'next/server';
import { getContentItems } from '@/lib/queries';
import { loadContentPublishOverrides } from '@/lib/contentPublishOverrides';
import { fetchPushSentHistory, isNotionConfigured, NotionNotConfiguredError } from '@/lib/notion';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? '';

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date는 YYYY-MM-DD 형식이어야 해요.' }, { status: 400 });
  }

  let contentLogs: { category: string; title: string }[] = [];
  try {
    const period = { startDate: date, endDate: date, compareStartDate: date, compareEndDate: date };
    const [items, overrides] = await Promise.all([getContentItems(period), loadContentPublishOverrides()]);
    contentLogs = items
      .filter((it) => (overrides[it.pageTitle] ?? (it.isUnknownDate ? null : it.publishDate)) === date)
      .map((it) => ({ category: it.category, title: it.title }));
  } catch (err) {
    console.error('일자별 콘텐츠 발행 조회 실패', err);
    return NextResponse.json({ error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }

  let pushLogs: { time: string; content: string }[] = [];
  if (isNotionConfigured()) {
    try {
      const records = await fetchPushSentHistory();
      pushLogs = records
        .filter((r) => r.sentDate === date)
        .map((r) => ({ time: r.sentAt.trim().slice(-5), content: r.content }))
        .sort((a, b) => (a.time < b.time ? -1 : 1));
    } catch (err) {
      if (!(err instanceof NotionNotConfiguredError)) {
        console.error('일자별 푸시 발송 조회 실패', err);
      }
    }
  }

  return NextResponse.json({ date, pushLogs, contentLogs });
}
