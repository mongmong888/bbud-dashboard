'use client';

import { useMemo } from 'react';
import { TrendPoint } from '@/lib/queries';
import { card, colors, fmt, sectionSubtitle, sectionTitle } from './shared';

const LEFT = 30;
const RIGHT = 1020;
const TOP = 40;
const BOTTOM = 270;
const INNER_W = RIGHT - LEFT;
const INNER_H = BOTTOM - TOP;

export function TrendChart({
  data,
  rangeLabel,
  issueDates,
  onBarClick,
}: {
  data: TrendPoint[];
  rangeLabel: string;
  issueDates?: Set<string>;
  onBarClick?: (point: TrendPoint) => void;
}) {
  const bars = useMemo(() => {
    if (data.length === 0) return [];
    const maxTotal = Math.max(...data.map((d) => d.total), 1) * 1.25;
    const slot = INNER_W / data.length;
    return data.map((d, i) => {
      const w = Math.min(slot * (data.length > 30 ? 0.55 : 0.42), 34);
      const x = LEFT + i * slot + (slot - w) / 2;
      const h = (d.total / maxTotal) * INNER_H;
      const y = BOTTOM - h;
      return { x, w, cx: x + w / 2, y, h, hasIssue: issueDates?.has(d.date) ?? false, ...d };
    });
  }, [data, issueDates]);

  const gridLines = [0, 0.5, 1].map((f) => BOTTOM - f * INNER_H);

  return (
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={sectionTitle}>DAU</div>
        <div style={sectionSubtitle}>{rangeLabel} · 일별 추이</div>
      </div>

      <div style={{ position: 'relative' }}>
        {bars.length === 0 ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, color: colors.textFaint }}>
            해당 기간에 표시할 데이터가 없어요
          </div>
        ) : (
          <svg viewBox="0 0 1040 320" style={{ width: '100%', height: 320, display: 'block' }}>
            {gridLines.map((y, i) => (
              <line key={i} x1={LEFT} y1={y} x2={RIGHT} y2={y} stroke="#EEF1F6" strokeWidth={1} />
            ))}
            {bars.map((b, i) => (
              <g key={i}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={colors.primary} />
                <text x={b.cx} y={b.y - 8} fontSize={11.5} fontWeight={700} fill={colors.textBody} textAnchor="middle">
                  {fmt(b.total)}
                </text>
                <text x={b.cx} y={308} fontSize={10.5} fill={colors.textFaint} textAnchor="middle">
                  {b.label}
                </text>
                {b.hasIssue && <circle cx={b.cx} cy={b.y - 22} r={4} fill="#F79009" />}
                <rect
                  x={b.x - 6}
                  y={0}
                  width={b.w + 12}
                  height={300}
                  fill="transparent"
                  style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                  onClick={() => onBarClick?.(b)}
                />
              </g>
            ))}
          </svg>
        )}

        {onBarClick && bars.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: colors.textFaint }}>
            막대를 클릭하면 해당 일자의 시간대별 유입량과 이슈 메모를 볼 수 있어요
          </div>
        )}
      </div>
    </div>
  );
}
