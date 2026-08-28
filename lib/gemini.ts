import { GoogleGenAI, Type } from '@google/genai';
import { SummaryData, TrendPoint } from './queries';

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
  issues: Record<string, string>,
  summary: SummaryData
): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');

  const seriesText = trend.map((d) => `${d.label}: ${d.total}명${issues[d.date] ? ` (운영 메모: ${issues[d.date]})` : ''}`).join('\n');

  const summaryText = [
    formatMetric('활성 사용자수', summary.activeUsers.value, '명', summary.activeUsers.delta),
    formatMetric('페이지뷰', summary.pageViews.value, '', summary.pageViews.delta),
    formatMetric('회원가입', summary.signUps.value, '명', summary.signUps.delta),
    `신규/재방문 비율: 신규 ${summary.newPct}% / 재방문 ${summary.returnPct}%`,
  ].join('\n');

  const prompt = `너는 웹서비스 트래픽 데이터를 분석하는 마케팅 데이터 분석가야. 아래는 "${rangeLabel}" 기간의 종합 지표와 일별 활성 사용자수(DAU) 추이야. 일부 날짜에는 운영자가 남긴 이슈 메모가 같이 붙어있어.

[종합 지표]
${summaryText}

[일별 DAU 추이]
${seriesText}

이 데이터만 근거로 DAU와 관련된 인사이트를 도출해줘. 숫자를 지어내지 말고, 위에 주어진 값만 인용해. 종합 지표(페이지뷰, 회원가입, 신규/재방문 비율 등)와 DAU 추이를 함께 해석해서, DAU 변동의 배경이나 영향을 설명하는 데 활용해.

한국어로, 다음 형식에 맞춰 답해:
- headline: 기간 전체 추세를 한 문장으로 요약
- insights: 데이터에서 실제로 유의미한 인사이트만 골라서 담아. 뻔하거나 근거가 약한 항목은 빼고, 보통 2~5개 정도면 충분해. 각 인사이트는 evidence(인용한 구체적 날짜·수치), meaning(그 수치가 의미하는 바), action(그에 대한 실행 가능한 제안)으로 구성해.`;

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
