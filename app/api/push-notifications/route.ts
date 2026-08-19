import { NextRequest, NextResponse } from 'next/server';
import { resolvePeriod, isDateRangeError, getMaxSelectableDate, Preset } from '@/lib/ga4';
import { getPushTrend, getPushSentList } from '@/lib/queries';
import { isNotionConfigured, NotionNotConfiguredError } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get('preset') ?? '7d') as Preset;
  const start = searchParams.get('start') ?? undefined;
  const end = searchParams.get('end') ?? undefined;

  const period = resolvePeriod(preset, start, end);
  if (isDateRangeError(period)) {
    return NextResponse.json({ error: period.error }, { status: 400 });
  }

  let trend;
  try {
    trend = await getPushTrend(period);
  } catch (err) {
    console.error('푸시 알림 추이 조회 실패', err);
    return NextResponse.json(
      { error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }

  const sentList: { configured: boolean; error: string | null; fetchedAt: string | null; rows: Awaited<ReturnType<typeof getPushSentList>> } = {
    configured: isNotionConfigured(),
    error: null,
    fetchedAt: null,
    rows: [],
  };

  if (sentList.configured) {
    try {
      sentList.rows = await getPushSentList(period);
      sentList.fetchedAt = new Date().toISOString();
    } catch (err) {
      if (!(err instanceof NotionNotConfiguredError)) {
        console.error('푸시 발송 목록(노션) 조회 실패', err);
      }
      sentList.error = err instanceof Error ? err.message : '노션 발송 이력을 불러오지 못했어요.';
    }
  }

  return NextResponse.json({
    period,
    maxSelectableDate: getMaxSelectableDate(),
    trend,
    sentList,
  });
}
