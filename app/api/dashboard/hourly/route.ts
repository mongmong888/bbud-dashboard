import { NextRequest, NextResponse } from 'next/server';
import { getMaxSelectableDate } from '@/lib/ga4';
import { getHourlyTraffic } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? '';

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date는 YYYY-MM-DD 형식이어야 해요.' }, { status: 400 });
  }
  if (date > getMaxSelectableDate()) {
    return NextResponse.json({ error: `조회 가능한 최신 데이터는 ${getMaxSelectableDate()}(D-1)까지예요.` }, { status: 400 });
  }

  try {
    const hours = await getHourlyTraffic(date);
    return NextResponse.json({ date, hours });
  } catch (err) {
    console.error('시간대별 유입량 조회 실패', err);
    return NextResponse.json({ error: '데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
}
