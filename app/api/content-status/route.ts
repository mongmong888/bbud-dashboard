import { NextRequest, NextResponse } from 'next/server';
import { resolvePeriod, isDateRangeError, getMaxSelectableDate, addDays, Preset } from '@/lib/ga4';
import { getContentItems, ContentItem } from '@/lib/queries';

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

  try {
    const items = await getContentItems(period);

    const inRange = items.filter(
      (it) => !it.isUnknownDate && it.publishDate >= period.startDate && it.publishDate <= period.endDate
    );
    const unknown = items.filter((it) => it.isUnknownDate);

    const byDate = new Map<string, ContentItem[]>();
    for (const it of inRange) {
      if (!byDate.has(it.publishDate)) byDate.set(it.publishDate, []);
      byDate.get(it.publishDate)!.push(it);
    }
    for (const list of byDate.values()) {
      list.sort((a, b) => b.viewEvent - a.viewEvent);
    }

    // 최신 날짜가 위로 오도록, 콘텐츠가 없는 날짜도 빈 배열로 채워서 내려준다.
    const dates: { date: string; items: ContentItem[] }[] = [];
    for (let d = period.endDate; d >= period.startDate; d = addDays(d, -1)) {
      dates.push({ date: d, items: byDate.get(d) ?? [] });
    }

    return NextResponse.json({
      period,
      maxSelectableDate: getMaxSelectableDate(),
      dates,
      unknown,
    });
  } catch (err) {
    console.error('콘텐츠 현황 데이터 조회 실패', err);
    return NextResponse.json(
      { error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }
}
