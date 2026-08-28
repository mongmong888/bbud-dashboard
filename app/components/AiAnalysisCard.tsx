'use client';

import { useState } from 'react';
import { SummaryData, TrendPoint } from '@/lib/queries';
import { AiAnalysisResult } from '@/lib/gemini';
import { colors } from './shared';

export function AiAnalysisCard({
  trend,
  rangeLabel,
  summary,
}: {
  trend: TrendPoint[];
  rangeLabel: string;
  summary: SummaryData;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trend, rangeLabel, summary }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'AI 분석에 실패했어요.');
      setResult(json.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 분석에 실패했어요.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: 14,
        padding: '20px 22px',
        background: 'linear-gradient(135deg,#F5F3FF 0%,#EEF4FF 50%,#FDF4FF 100%)',
        border: '1px solid #ECE9FE',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" stroke="#7A5AF8" strokeWidth={1.7} strokeLinejoin="round" />
              <path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" stroke="#7A5AF8" strokeWidth={1.4} strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.textDark }}>AI 분석 결과</div>
            <div style={{ fontSize: 12.5, color: '#7E8AA0', marginTop: 2 }}>{rangeLabel} 활성 사용자 데이터 기준</div>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing || trend.length === 0}
          style={{
            border: 'none',
            background: '#7A5AF8',
            color: '#fff',
            padding: '9px 18px',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            cursor: analyzing ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: analyzing || trend.length === 0 ? 0.6 : 1,
          }}
        >
          {analyzing ? '분석 중...' : result ? '다시 분석하기' : 'AI 분석 실행'}
        </button>
      </div>

      {!analyzing && !result && !error && (
        <div style={{ marginTop: 16, padding: 24, border: '1px dashed #D6CFFA', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#8B8AA8', background: 'rgba(255,255,255,0.5)' }}>
          분석 실행을 누르면 기간 내 트래픽 추세, 피크·저점에 대한 요약을 보여드려요
        </div>
      )}

      {analyzing && (
        <div style={{ marginTop: 16, padding: 24, background: 'rgba(255,255,255,0.65)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#7A5AF8', fontWeight: 600 }}>
          트래픽 데이터를 분석하고 있어요…
        </div>
      )}

      {!analyzing && error && (
        <div style={{ marginTop: 16, padding: 24, borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#8B8AA8', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div>{error}</div>
          <button
            onClick={runAnalysis}
            style={{ border: 'none', background: colors.primary, color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </div>
      )}

      {!analyzing && result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid #E4DDFB', borderRadius: 12, padding: '15px 18px', fontSize: 14, fontWeight: 700, color: '#5925DC', marginBottom: 12 }}>
            {result.headline}
          </div>
          {result.insights.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#8B8AA8' }}>
              이번 기간 데이터에서는 특별히 짚을 만한 인사이트가 없어요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.insights.map((insight, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #EAE6F9', borderRadius: 12, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <InsightRow label="수치 근거" text={insight.evidence} />
                  <InsightRow label="의미" text={insight.meaning} />
                  <InsightRow label="제안 액션" text={insight.action} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightRow({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#7A5AF8', letterSpacing: '0.4px', flexShrink: 0, width: 66 }}>{label}</div>
      <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}
