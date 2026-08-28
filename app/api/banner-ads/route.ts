import { NextRequest, NextResponse } from 'next/server';
import { resolvePeriod, isDateRangeError, getMaxSelectableDate, Preset } from '@/lib/ga4';
import {
  getBannerAdsData,
  getPopupAdsData,
  getActivePeriods,
  SimpleIdRow,
  ActivePeriod,
  AdRow,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

function mergePeriods(rows: SimpleIdRow[], periods: Map<string, ActivePeriod>): AdRow[] {
  return rows.map((row) => ({ ...row, period: periods.get(row.name) ?? null }));
}

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
    const [bannerData, popupRows, bannerPeriods, popupPeriods] = await Promise.all([
      getBannerAdsData(period),
      getPopupAdsData(period),
      getActivePeriods('customEvent:banner_id', 'banner_view', 'banner_click', period.startDate, period.endDate),
      getActivePeriods('customEvent:popup_id', 'popup_view', 'popup_click', period.startDate, period.endDate),
    ]);

    const bannerAdsByPlacement: Record<string, AdRow[]> = {};
    for (const [placement, rows] of Object.entries(bannerData.bannerAdsByPlacement)) {
      bannerAdsByPlacement[placement] = mergePeriods(rows, bannerPeriods);
    }

    const popupAds = mergePeriods(popupRows, popupPeriods);
    const POPUP_PLACEMENT_NAME = '팝업';
    bannerAdsByPlacement[POPUP_PLACEMENT_NAME] = popupAds;

    const popupView = popupRows.reduce((a, r) => a + r.view, 0);
    const popupClick = popupRows.reduce((a, r) => a + r.click, 0);
    const placementAgg = [
      ...bannerData.placementAgg,
      { name: POPUP_PLACEMENT_NAME, view: popupView, click: popupClick, ctr: popupView > 0 ? (popupClick / popupView) * 100 : 0 },
    ].sort((a, b) => b.view - a.view);

    return NextResponse.json({
      period,
      maxSelectableDate: getMaxSelectableDate(),
      placementAgg,
      bannerAdsByPlacement,
      popupAds,
    });
  } catch (err) {
    console.error('배너 광고 데이터 조회 실패', err);
    return NextResponse.json(
      { error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }
}
