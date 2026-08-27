import { GoogleGenAI, Type } from '@google/genai';
import { TrendPoint } from './queries';

export interface AiBullet {
  label: string;
  text: string;
}

export interface AiAnalysisResult {
  headline: string;
  bullets: AiBullet[];
}

// gemini-flash-latest는 현재 트래픽이 몰려 503(UNAVAILABLE)이 잦아, 구버전 지원 종료 시 구글이
// 안내한 후속 모델(gemini-3.6-flash)을 직접 지정한다.
const MODEL = 'gemini-3.6-flash';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: '기간 전체 트래픽 추세를 한 문장으로 요약' },
    bullets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: '항목 이름 (예: 피크, 저점, 추세, 제안 중 하나)' },
          text: { type: Type.STRING, description: '해당 항목에 대한 한두 문장 설명' },
        },
        required: ['label', 'text'],
      },
    },
  },
  required: ['headline', 'bullets'],
};

export async function analyzeDauTrend(
  trend: TrendPoint[],
  rangeLabel: string,
  issues: Record<string, string>
): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');

  const seriesText = trend.map((d) => `${d.label}: ${d.total}명${issues[d.date] ? ` (운영 메모: ${issues[d.date]})` : ''}`).join('\n');

  const prompt = `너는 웹서비스 트래픽 데이터를 분석하는 마케팅 데이터 분석가야. 아래는 "${rangeLabel}" 기간 동안의 일별 활성 사용자수(DAU) 데이터야. 일부 날짜에는 운영자가 남긴 이슈 메모가 같이 붙어있어.

${seriesText}

이 데이터만 근거로 분석해줘. 숫자를 지어내지 말고, 위에 주어진 값만 인용해. 한국어로, 다음 형식에 맞춰 답해:
- headline: 기간 전체 추세(전반부 대비 후반부 증감 등)를 한 문장으로 요약
- bullets: 정확히 4개, label은 각각 "피크", "저점", "추세", "제안" 중 하나씩 사용. 피크/저점은 해당 날짜와 수치를 언급하고, 운영 메모가 있으면 원인으로 연결해서 설명. 추세는 전체적인 변동 패턴을, 제안은 데이터에 기반한 실행 가능한 제안 한 가지를 담아줘.`;

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
