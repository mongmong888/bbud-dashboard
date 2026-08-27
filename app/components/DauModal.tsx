'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendPoint, HourlyPoint } from '@/lib/queries';
import { colors, fmt } from './shared';

function toIsoDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

const LEFT = 52;
const RIGHT = 764;
const TOP = 20;
const BOTTOM = 300;
const INNER_W = RIGHT - LEFT;
const INNER_H = BOTTOM - TOP;

export function DauModal({
  point,
  savedNote,
  onClose,
  onSave,
}: {
  point: TrendPoint;
  savedNote: string;
  onClose: () => void;
  onSave: (date: string, note: string) => Promise<void>;
}) {
  const [hours, setHours] = useState<HourlyPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(savedNote);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHours(null);
    fetch(`/api/dashboard/hourly?date=${toIsoDate(point.date)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? '조회 실패');
        if (!cancelled) setHours(json.hours);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '데이터를 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [point.date]);

  useEffect(() => {
    setDraft(savedNote);
  }, [savedNote, point.date]);

  const geometry = useMemo(() => {
    if (!hours) return null;
    const maxVal = Math.max(...hours.map((h) => h.users), 1) * 1.2;
    const slot = INNER_W / 24;
    const barW = Math.min(slot * 0.6, 20);
    const bars = hours.map((h) => {
      const height = (h.users / maxVal) * INNER_H;
      const x = LEFT + h.hour * slot + (slot - barW) / 2;
      return { x, w: barW, y: BOTTOM - height, h: height, cx: x + barW / 2, users: h.users, hour: h.hour };
    });
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: BOTTOM - f * INNER_H, value: Math.round(maxVal * f) }));
    const peak = hours.reduce((a, b) => (b.users > a.users ? b : a), hours[0]);
    return { bars, yTicks, peakHour: `${String(peak.hour).padStart(2, '0')}시` };
  }, [hours]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(point.date, draft);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16,24,40,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          width: '100%',
          maxWidth: 880,
          maxHeight: '100%',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(16,24,40,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, padding: '22px 26px 0' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.textDark }}>{point.label} 시간대별 유입량</div>
            <div style={{ fontSize: 12.5, color: colors.textFaint, marginTop: 4 }}>
              활성 사용자 {fmt(point.total)}명{geometry ? ` · 피크 ${geometry.peakHour}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${colors.border}`,
              background: '#fff',
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: 'pointer',
              color: colors.textMuted,
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '18px 26px 0' }}>
          {loading && (
            <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, color: colors.textFaint }}>
              불러오는 중...
            </div>
          )}
          {!loading && error && (
            <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, color: colors.textFaint }}>
              {error}
            </div>
          )}
          {!loading && !error && geometry && (
            <svg viewBox="0 0 780 340" style={{ width: '100%', height: 340, display: 'block' }}>
              {geometry.yTicks.map((t, i) => (
                <g key={i}>
                  <line x1={LEFT} y1={t.y} x2={RIGHT} y2={t.y} stroke="#EEF1F6" strokeWidth={1} />
                  <text x={44} y={t.y} dy={4} fontSize={10} fill={colors.textFaint} textAnchor="end">
                    {fmt(t.value)}
                  </text>
                </g>
              ))}
              {geometry.bars.map((b, i) => (
                <g key={i}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={colors.primary} />
                  <text x={b.cx} y={b.y - 6} fontSize={9} fontWeight={700} fill={colors.textFaint} textAnchor="middle">
                    {fmt(b.users)}
                  </text>
                  <text x={b.cx} y={318} fontSize={10} fill={colors.textFaint} textAnchor="middle">
                    {String(b.hour).padStart(2, '0')}
                  </text>
                </g>
              ))}
              <text x={408} y={336} fontSize={10.5} fill="#C0C6D2" textAnchor="middle">
                시 (00 ~ 23)
              </text>
            </svg>
          )}
        </div>

        <div style={{ padding: '8px 26px 26px' }}>
          <div style={{ borderTop: `1px solid ${colors.headerBorder}`, paddingTop: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.textDark, marginBottom: 4 }}>이 날의 이슈</div>
            <div style={{ fontSize: 12.5, color: colors.textFaint, marginBottom: 10 }}>
              트래픽 변동 원인이나 운영 이벤트를 기록해두면 다음 분석에 참고할 수 있어요
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="예: 오후 2시 푸시 발송, 앱 배포 오류로 20시대 접속 지연"
              style={{
                width: '100%',
                minHeight: 90,
                padding: '12px 14px',
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                fontSize: 13,
                color: colors.textBody,
                fontFamily: 'inherit',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              {saveError ? (
                <div style={{ fontSize: 12, color: '#D92D20', fontWeight: 600 }}>{saveError}</div>
              ) : (
                savedNote && <div style={{ fontSize: 12, color: colors.positive, fontWeight: 600 }}>저장된 메모가 있어요</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button
                  onClick={onClose}
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: '#fff',
                    color: colors.textBody,
                    padding: '9px 18px',
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  닫기
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    border: 'none',
                    background: colors.primary,
                    color: '#fff',
                    padding: '9px 20px',
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? 'default' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
