'use client';

import { useMemo, useState } from 'react';
import { TrendPoint } from '@/lib/queries';
import { card, colors, fmt, sectionSubtitle, sectionTitle } from './shared';

const LEFT = 30;
const RIGHT = 1020;
const TOP = 40;
const BOTTOM = 270;
const INNER_W = RIGHT - LEFT;
const INNER_H = BOTTOM - TOP;

export function TrendChart({ data, rangeLabel }: { data: TrendPoint[]; rangeLabel: string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const bars = useMemo(() => {
    if (data.length === 0) return [];
    const maxTotal = Math.max(...data.map((d) => d.total), 1) * 1.25;
    const slot = INNER_W / data.length;
    return data.map((d, i) => {
      const w = Math.min(slot * (data.length > 30 ? 0.55 : 0.42), 34);
      const x = LEFT + i * slot + (slot - w) / 2;
      const h = (d.total / maxTotal) * INNER_H;
      const y = BOTTOM - h;
      return { x, w, cx: x + w / 2, y, h, ...d };
    });
  }, [data]);

  const gridLines = [0, 0.5, 1].map((f) => BOTTOM - f * INNER_H);
  const hover = hoverIdx !== null ? bars[hoverIdx] : null;

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
                <rect
                  x={b.x - 6}
                  y={0}
                  width={b.w + 12}
                  height={300}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              </g>
            ))}
          </svg>
        )}

        {hover && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: `${(hover.cx / 1040) * 100}%`,
              transform: 'translateX(-50%)',
              background: colors.textDark,
              color: '#fff',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 8px 20px rgba(16,24,40,0.25)',
              zIndex: 5,
            }}
          >
            <div style={{ fontWeight: 700, color: '#fff' }}>
              {hover.label} · DAU {fmt(hover.total)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
