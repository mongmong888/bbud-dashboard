'use client';

import { useMemo, useState } from 'react';
import { PushTrendPoint } from '@/lib/queries';
import { colors, fmt } from './shared';

const LEFT = 14;
const RIGHT = 1026;
const TOP = 20;
const BOTTOM = 268;
const INNER_W = RIGHT - LEFT;
const INNER_H = BOTTOM - TOP;

const SERIES = {
  receive: { color: '#3E7BFA', label: '수신' },
  open: { color: '#7A5AF8', label: '오픈' },
  rate: { color: '#FF9F43', label: '오픈율' },
} as const;

type SeriesKey = keyof typeof SERIES;

export function PushTrendChart({ data }: { data: PushTrendPoint[] }) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({ receive: true, open: true, rate: true });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function toggle(key: SeriesKey) {
    setVisible((v) => {
      const activeCount = Object.values(v).filter(Boolean).length;
      if (v[key] && activeCount === 1) return v; // 최소 1개는 항상 켜져 있어야 함
      return { ...v, [key]: !v[key] };
    });
  }

  const summary = useMemo(() => {
    const totalReceive = data.reduce((a, d) => a + d.receive, 0);
    const totalOpen = data.reduce((a, d) => a + d.open, 0);
    const rate = totalReceive > 0 ? (totalOpen / totalReceive) * 100 : 0;
    return { totalReceive, totalOpen, rate };
  }, [data]);

  const geometry = useMemo(() => {
    if (data.length === 0) return null;
    const slot = INNER_W / data.length;
    const maxReceive = Math.max(...data.map((d) => Math.max(d.receive, d.open)), 1) * 1.15;
    const maxRate = Math.max(...data.map((d) => d.rate), 1) * 1.4;
    const ptX = (i: number) => LEFT + i * slot + slot / 2;

    const toPath = (points: { x: number; y: number }[]) =>
      points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const receivePts = data.map((d, i) => ({ x: ptX(i), y: BOTTOM - (d.receive / maxReceive) * INNER_H }));
    const openPts = data.map((d, i) => ({ x: ptX(i), y: BOTTOM - (d.open / maxReceive) * INNER_H }));
    const ratePts = data.map((d, i) => ({ x: ptX(i), y: BOTTOM - (d.rate / maxRate) * INNER_H }));

    const step = Math.max(1, Math.ceil(data.length / 9));
    const xLabels = data.map((d, i) => ({ x: ptX(i), label: d.label, show: i % step === 0 }));
    const hitAreas = data.map((d, i) => ({ x: LEFT + i * slot, w: slot }));

    return {
      receivePath: toPath(receivePts),
      openPath: toPath(openPts),
      ratePath: toPath(ratePts),
      xLabels,
      hitAreas,
      cx: (i: number) => ptX(i),
    };
  }, [data]);

  const gridLines = [0, 0.5, 1].map((f) => BOTTOM - f * INNER_H);
  const hover = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12.5, color: colors.textFaint }}>
          기간 합계: 수신 {fmt(summary.totalReceive)}건 · 오픈 {fmt(summary.totalOpen)}건 · 평균 오픈율 {summary.rate.toFixed(1)}%
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.keys(SERIES) as SeriesKey[]).map((key) => {
            const active = visible[key];
            const { color, label } = SERIES[key];
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: `1px solid ${active ? color : colors.border}`,
                  background: active ? `${color}1A` : '#fff',
                  color: active ? color : colors.textFaint,
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 10 }}>
        {!geometry ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, color: colors.textFaint }}>
            해당 기간에 표시할 데이터가 없어요
          </div>
        ) : (
          <svg viewBox="0 0 1040 300" style={{ width: '100%', height: 300, display: 'block' }}>
            {gridLines.map((y, i) => (
              <line key={i} x1={LEFT} y1={y} x2={RIGHT} y2={y} stroke="#EEF1F6" strokeWidth={1} />
            ))}
            {visible.receive && <path d={geometry.receivePath} fill="none" stroke={SERIES.receive.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {visible.open && <path d={geometry.openPath} fill="none" stroke={SERIES.open.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {visible.rate && (
              <path d={geometry.ratePath} fill="none" stroke={SERIES.rate.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 4" />
            )}
            {geometry.xLabels.map(
              (xl, i) =>
                xl.show && (
                  <text key={i} x={xl.x} y={292} fontSize={10.5} fill={colors.textFaint} textAnchor="middle">
                    {xl.label}
                  </text>
                )
            )}
            {geometry.hitAreas.map((h, i) => (
              <rect
                key={i}
                x={h.x}
                y={0}
                width={h.w}
                height={268}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            ))}
          </svg>
        )}

        {hover && geometry && hoverIdx !== null && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: `${(geometry.cx(hoverIdx) / 1040) * 100}%`,
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
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{hover.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: SERIES.receive.color }} />
              수신 {fmt(hover.receive)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: SERIES.open.color }} />
              오픈 {fmt(hover.open)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: SERIES.rate.color }} />
              오픈율 {hover.rate.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
