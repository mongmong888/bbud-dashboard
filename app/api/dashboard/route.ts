import { NextRequest, NextResponse } from 'next/server';
import { resolvePeriod, isDateRangeError, getMaxSelectableDate, Preset } from '@/lib/ga4';
import { getSummary, getTrend, getBanners, getPopups, getPartners, getTopPages, getHourlyMaxInRange } from '@/lib/queries';

export const dynamic = 'force-dynamic';
// GA4 요청을 병렬로 여러 번 보내는 라우트라, GA4 쪽이 순간적으로 느려지면 기본 10초 제한에
// 걸려 연결이 그냥 끊길 수 있다. 플랜이 허용하는 한도까지 여유를 둔다.
export const maxDuration = 60;

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
    const [summary, trend, banners, popups, partners, topPages, hourlyMax] = await Promise.all([
      getSummary(period),
      getTrend(period),
      getBanners(period),
      getPopups(period),
      getPartners(period),
      getTopPages(period),
      getHourlyMaxInRange(period.startDate, period.endDate),
    ]);

    return NextResponse.json({
      period,
      maxSelectableDate: getMaxSelectableDate(),
      summary,
      trend,
      banners,
      popups,
      partners,
      topPages,
      hourlyMax,
    });
  } catch (err) {
    console.error('GA4 dashboard fetch failed', err);
    return NextResponse.json(
      { error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }
}
