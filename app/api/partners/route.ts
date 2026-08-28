import { NextRequest, NextResponse } from 'next/server';
import { resolvePeriod, isDateRangeError, getMaxSelectableDate, Preset } from '@/lib/ga4';
import { getPartnerStatusRows } from '@/lib/queries';

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
    const rows = await getPartnerStatusRows(period);

    return NextResponse.json({
      period,
      maxSelectableDate: getMaxSelectableDate(),
      rows,
    });
  } catch (err) {
    console.error('제휴사 현황 데이터 조회 실패', err);
    return NextResponse.json(
      { error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    );
  }
}
