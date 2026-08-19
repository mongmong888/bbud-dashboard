import { DailyPoint } from '@/lib/members';
import { colors, fmt } from './shared';

const LEFT = 14;
const RIGHT = 486;
const TOP = 26;
const BOTTOM = 232;
const INNER_W = RIGHT - LEFT;
const INNER_H = BOTTOM - TOP;

export function WriterTrendChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, color: colors.textFaint }}>
        표시할 데이터가 없어요
      </div>
    );
  }

  const slot = INNER_W / data.length;
  const maxSignup = Math.max(...data.map((d) => d.signups), 1) * 1.3;
  const barW = Math.min(slot * 0.32, 22);
  const gap = 4;

  const bars = data.map((d, i) => {
    const slotStart = LEFT + i * slot;
    const groupW = barW * 2 + gap;
    const groupStart = slotStart + (slot - groupW) / 2;
    const signupH = (d.signups / maxSignup) * INNER_H;
    const writerH = (d.writers / maxSignup) * INNER_H;
    return {
      signupX: groupStart,
      signupY: BOTTOM - signupH,
      signupH,
      writerX: groupStart + barW + gap,
      writerY: BOTTOM - writerH,
      writerH,
      cx: slotStart + slot / 2,
      label: d.label,
      signups: d.signups,
      writers: d.writers,
    };
  });

  const gridLines = [0, 0.5, 1].map((f) => BOTTOM - f * INNER_H);

  return (
    <svg viewBox="0 0 500 260" style={{ width: '100%', height: 260, display: 'block' }}>
      {gridLines.map((y, i) => (
        <line key={i} x1={LEFT} y1={y} x2={RIGHT} y2={y} stroke="#EEF1F6" strokeWidth={1} />
      ))}
      {bars.map((b, i) => (
        <g key={i}>
          <rect x={b.signupX} y={b.signupY} width={barW} height={b.signupH} rx={3} fill={colors.returnBar} />
          <rect x={b.writerX} y={b.writerY} width={barW} height={b.writerH} rx={3} fill={colors.newBar} />
          <text x={b.signupX} y={b.signupY - 6} fontSize={10.5} fontWeight={700} fill={colors.textFaint} textAnchor="middle">
            {fmt(b.signups)}
          </text>
          <text x={b.writerX} y={b.writerY - 6} fontSize={10.5} fontWeight={700} fill={colors.primary} textAnchor="middle">
            {fmt(b.writers)}
          </text>
          <text x={b.cx} y={252} fontSize={10.5} fill={colors.textFaint} textAnchor="middle">
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
