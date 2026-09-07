import { GoogleGenAI, Type } from '@google/genai';
import { SummaryData, TrendPoint, HourlyPoint } from './queries';

export interface DailyPushLog {
  time: string;
  content: string;
}

export interface DailyContentLog {
  category: string;
  title: string;
}

export interface AiInsight {
  evidence: string; // 수치 근거
  meaning: string; // 의미
  action: string; // 제안 액션
}

export interface AiAnalysisResult {
  headline: string;
  insights: AiInsight[];
}

// gemini-flash-latest는 현재 트래픽이 몰려 503(UNAVAILABLE)이 잦아, 구버전 지원 종료 시 구글이
// 안내한 후속 모델(gemini-3.6-flash)을 직접 지정한다.
const MODEL = 'gemini-3.6-flash';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: '기간 전체 트래픽 추세를 한 문장으로 요약' },
    insights: {
      type: Type.ARRAY,
      description: '데이터에서 발견한, 실제로 의미 있는 인사이트만. 없으면 빈 배열.',
      items: {
        type: Type.OBJECT,
        properties: {
          evidence: { type: Type.STRING, description: '수치 근거: 주어진 데이터에서 인용한 구체적인 날짜·수치' },
          meaning: { type: Type.STRING, description: '의미: 그 수치가 무엇을 뜻하는지에 대한 해석' },
          action: { type: Type.STRING, description: '제안 액션: 데이터에 기반한 실행 가능한 제안' },
        },
        required: ['evidence', 'meaning', 'action'],
      },
    },
  },
  required: ['headline', 'insights'],
};

function formatMetric(label: string, value: number, unit: string, delta: number | null): string {
  const deltaText = delta === null ? '' : ` (직전 기간 대비 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)`;
  return `${label}: ${value.toLocaleString('ko-KR')}${unit}${deltaText}`;
}

export async function analyzeDauTrend(
  trend: TrendPoint[],
  rangeLabel: string,
  issues: Record<string, string[]>,
  summary: SummaryData,
  hourlyByDate: Record<string, HourlyPoint[]>,
  pushByDate: Record<string, DailyPushLog[]>,
  contentByDate: Record<string, DailyContentLog[]>
): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');

  const toIso = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

  const seriesText = trend
    .map((d) => {
      const iso = toIso(d.date);
      const lines = [`${d.label}: 활성 사용자 ${d.total}명`];

      const hours = hourlyByDate[d.date];
      if (hours && hours.length > 0) {
        const peak = hours.reduce((a, b) => (b.users > a.users ? b : a), hours[0]);
        lines.push(`  - 시간대 피크: ${String(peak.hour).padStart(2, '0')}시(${peak.users}명)`);
      }

      const notes = issues[d.date];
      if (notes && notes.length > 0) lines.push(`  - 운영 메모: ${notes.join(' / ')}`);

      const pushes = pushByDate[iso];
      if (pushes && pushes.length > 0) lines.push(`  - 발송 푸시: ${pushes.map((p) => `${p.time} ${p.content}`).join(' / ')}`);

      const contents = contentByDate[iso];
      if (contents && contents.length > 0) {
        lines.push(`  - 발행 콘텐츠: ${contents.map((c) => `[${c.category}] ${c.title}`).join(' / ')}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');

  const summaryText = [
    formatMetric('활성 사용자수', summary.activeUsers.value, '명', summary.activeUsers.delta),
    formatMetric('페이지뷰', summary.pageViews.value, '', summary.pageViews.delta),
    formatMetric('회원가입', summary.signUps.value, '명', summary.signUps.delta),
    `신규/재방문 비율: 신규 ${summary.newPct}% / 재방문 ${summary.returnPct}%`,
  ].join('\n');

  const prompt = `너는 웹서비스 트래픽 데이터를 분석하는 마케팅 데이터 분석가야. 아래는 "${rangeLabel}" 기간의 종합 지표와, 일자별로 활성 사용자수(DAU)·시간대별 피크·운영 메모·발송된 푸시 알림·발행된 콘텐츠를 함께 정리한 데이터야. 날짜별로 값이 있는 항목만 붙어있고 없는 항목은 생략되어 있어.

[종합 지표]
${summaryText}

[일자별 데이터]
${seriesText}

이 데이터만 근거로 DAU와 관련된 인사이트를 다각도로 도출해줘. 숫자를 지어내지 말고, 위에 주어진 값만 인용해. 특히 아래 관점들을 함께 살펴봐:
- 일별 DAU 추이와 종합 지표(페이지뷰, 회원가입, 신규/재방문 비율)의 관계
- 시간대별 피크 패턴(특정 요일이나 특정 시간대에 반복되는 경향이 있는지)
- 발송된 푸시 알림이나 발행된 콘텐츠가 그 날 또는 다음 날 DAU 변화와 맞물리는지(상관관계)
- 운영 메모에 기록된 이벤트가 DAU 변동을 설명하는지

한국어로, 다음 형식에 맞춰 답해:
- headline: 기간 전체 추세를 한 문장으로 요약
- insights: 데이터에서 실제로 유의미한 인사이트만 골라서 담아. 뻔하거나 근거가 약한 항목은 빼고, 위 관점들을 골고루 반영해서 보통 3~6개 정도면 충분해. 각 인사이트는 evidence(인용한 구체적 날짜·수치), meaning(그 수치가 의미하는 바), action(그에 대한 실행 가능한 제안)으로 구성해.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('AI 응답이 비어 있어요.');

  const parsed = JSON.parse(text) as AiAnalysisResult;
  return parsed;
}
