'use client';

import { useState } from 'react';
import { TrendPoint } from '@/lib/queries';
import { AiAnalysisResult } from '@/lib/gemini';
import { card, colors } from './shared';

export function AiAnalysisCard({ trend, rangeLabel }: { trend: TrendPoint[]; rangeLabel: string }) {
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
        body: JSON.stringify({ trend, rangeLabel }),
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
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F1EEFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" stroke="#7A5AF8" strokeWidth={1.7} strokeLinejoin="round" />
              <path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" stroke="#7A5AF8" strokeWidth={1.4} strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: colors.textDark }}>AI 분석 결과</div>
            <div style={{ fontSize: 12.5, color: colors.textFaint, marginTop: 2 }}>{rangeLabel} 활성 사용자 데이터 기준</div>
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
        <div style={{ marginTop: 18, padding: 28, border: `1px dashed ${colors.border}`, borderRadius: 12, textAlign: 'center', fontSize: 13, color: colors.textFaint }}>
          분석 실행을 누르면 기간 내 트래픽 추세, 피크·저점에 대한 요약을 보여드려요
        </div>
      )}

      {analyzing && (
        <div style={{ marginTop: 18, padding: 28, background: '#FAFAFF', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#7A5AF8', fontWeight: 600 }}>
          트래픽 데이터를 분석하고 있어요…
        </div>
      )}

      {!analyzing && error && (
        <div style={{ marginTop: 18, padding: 28, borderRadius: 12, textAlign: 'center', fontSize: 13, color: colors.textFaint, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
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
        <div style={{ marginTop: 18 }}>
          <div style={{ background: '#FAFAFF', border: '1px solid #ECE9FE', borderRadius: 12, padding: '16px 18px', fontSize: 14, fontWeight: 700, color: '#5925DC', marginBottom: 14 }}>
            {result.headline}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
            {result.bullets.map((b, i) => (
              <div key={i} style={{ border: `1px solid ${colors.headerBorder}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#7A5AF8', letterSpacing: '0.4px', marginBottom: 6 }}>{b.label}</div>
                <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.55 }}>{b.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
