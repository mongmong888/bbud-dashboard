import { NextRequest, NextResponse } from 'next/server';
import { analyzeDauTrend } from '@/lib/gemini';
import { loadDauIssues } from '@/lib/dauIssues';
import { TrendPoint } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const trend: TrendPoint[] | undefined = body?.trend;
  const rangeLabel: string | undefined = body?.rangeLabel;

  if (!Array.isArray(trend) || trend.length === 0 || typeof rangeLabel !== 'string') {
    return NextResponse.json({ error: 'trend, rangeLabel이 필요해요.' }, { status: 400 });
  }

  try {
    const issues = await loadDauIssues().catch(() => ({}));
    const result = await analyzeDauTrend(trend, rangeLabel, issues);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('AI 분석 실패', err);
    return NextResponse.json({ error: 'AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
}
