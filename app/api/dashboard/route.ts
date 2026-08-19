import { NextRequest, NextResponse } from 'next/server';
import { resolvePeriod, isDateRangeError, getMaxSelectableDate, Preset } from '@/lib/ga4';
import { getSummary, getTrend, getBanners, getPopups, getPartners, getTopPages } from '@/lib/queries';

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
    const [summary, trend, banners, popups, partners, topPages] = await Promise.all([
      getSummary(period),
      getTrend(period),
      getBanners(period),
      getPopups(period),
      getPartners(period),
      getTopPages(period),
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
    });
  } catch (err) {
    console.error('GA4 dashboard fetch failed', err);
    return NextResponse.json(
      { error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }
}
