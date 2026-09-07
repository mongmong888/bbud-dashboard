import { NextRequest, NextResponse } from 'next/server';
import { analyzeDauTrend, DailyPushLog, DailyContentLog } from '@/lib/gemini';
import { loadDauIssues } from '@/lib/dauIssues';
import { loadContentPublishOverrides, loadExcludedContentTitles } from '@/lib/contentPublishOverrides';
import { fetchPushSentHistory, isNotionConfigured, NotionNotConfiguredError } from '@/lib/notion';
import { SummaryData, TrendPoint, getHourlyByDateInRange, getContentItems, applyContentOverrides } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const trend: TrendPoint[] | undefined = body?.trend;
  const rangeLabel: string | undefined = body?.rangeLabel;
  const summary: SummaryData | undefined = body?.summary;
  const period: { startDate: string; endDate: string } | undefined = body?.period;

  if (!Array.isArray(trend) || trend.length === 0 || typeof rangeLabel !== 'string' || !summary || !period?.startDate || !period?.endDate) {
    return NextResponse.json({ error: 'trend, rangeLabel, summary, period가 필요해요.' }, { status: 400 });
  }

  try {
    const [issues, hourlyByDate, rawContentItems, overrides, excluded, pushRecords] = await Promise.all([
      loadDauIssues().catch(() => ({})),
      getHourlyByDateInRange(period.startDate, period.endDate).catch(() => ({})),
      getContentItems({ startDate: period.startDate, endDate: period.endDate, compareStartDate: period.startDate, compareEndDate: period.endDate }).catch(() => []),
      loadContentPublishOverrides().catch(() => ({})),
      loadExcludedContentTitles().catch(() => new Set<string>()),
      isNotionConfigured()
        ? fetchPushSentHistory().catch((err) => {
            if (!(err instanceof NotionNotConfiguredError)) console.error('AI 분석용 푸시 발송 이력 조회 실패', err);
            return [];
          })
        : Promise.resolve([]),
    ]);

    const pushByDate: Record<string, DailyPushLog[]> = {};
    for (const r of pushRecords) {
      if (!r.sentDate || r.sentDate < period.startDate || r.sentDate > period.endDate) continue;
      if (!pushByDate[r.sentDate]) pushByDate[r.sentDate] = [];
      pushByDate[r.sentDate].push({ time: r.sentAt.trim().slice(-5), content: r.content });
    }

    const contentItems = applyContentOverrides(rawContentItems, overrides, excluded);
    const contentByDate: Record<string, DailyContentLog[]> = {};
    for (const it of contentItems) {
      if (it.isUnknownDate || it.publishDate < period.startDate || it.publishDate > period.endDate) continue;
      if (!contentByDate[it.publishDate]) contentByDate[it.publishDate] = [];
      contentByDate[it.publishDate].push({ category: it.category, title: it.title });
    }

    const result = await analyzeDauTrend(trend, rangeLabel, issues, summary, hourlyByDate, pushByDate, contentByDate);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('AI 분석 실패', err);
    return NextResponse.json({ error: 'AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
}
