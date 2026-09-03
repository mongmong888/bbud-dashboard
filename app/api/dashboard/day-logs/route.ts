import { NextRequest, NextResponse } from 'next/server';
import { getContentItems } from '@/lib/queries';
import { loadContentPublishOverrides } from '@/lib/contentPublishOverrides';
import { CONTENT_CATEGORIES } from '@/lib/contentCategories';
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

    // GA4 조회 범위(발행일 기준 최근 90일) 안에서 자연스럽게 이 날짜로 잡히는 항목.
    // override가 있는 pageTitle은 아래에서 별도로 처리하므로 여기서는 제외한다.
    const naturalMatches = items
      .filter((it) => !overrides[it.pageTitle] && !it.isUnknownDate && it.publishDate === date)
      .map((it) => ({ category: it.category, title: it.title }));

    // 수기로 발행일을 이 날짜로 지정한 항목. 원래 활동 이력이 GA4 조회 범위보다 오래돼 위 목록에
    // 안 잡히더라도(예: 콘텐츠 현황에서 옛 콘텐츠의 발행일을 최근으로 수정한 경우) 항상 반영한다.
    const overrideMatches = Object.entries(overrides)
      .filter(([, overrideDate]) => overrideDate === date)
      .map(([pageTitle]) => {
        const category = CONTENT_CATEGORIES.find((c) => pageTitle.startsWith(c.prefix));
        if (!category) return null;
        return { category: category.label as string, title: pageTitle.slice(category.prefix.length).trim() };
      })
      .filter((x): x is { category: string; title: string } => x !== null);

    contentLogs = [...naturalMatches, ...overrideMatches];
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
