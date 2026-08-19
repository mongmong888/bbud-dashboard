import { StatusPlanRow } from '@/lib/members';
import { colors, fmt } from './shared';

const PALETTE = ['#3E7BFA', '#7AA6FF', '#7A5AF8'];
const BAR_MAX_W = 250;
const BAR_LEFT = 90;
const BAR_H = 14;
const BAR_GAP = 4;
const GROUP_GAP = 16;
const GROUP_H = BAR_H * 2 + BAR_GAP;

export function StatusPlanBars({ rows }: { rows: StatusPlanRow[] }) {
  if (rows.length === 0) {
    return <div style={{ fontSize: 13.5, color: colors.textFaint }}>표시할 데이터가 없어요</div>;
  }

  const maxScale = Math.max(...rows.map((r) => r.members), ...rows.map((r) => r.plans), 1) * 1.15;
  const chartH = rows.length * GROUP_H + (rows.length - 1) * GROUP_GAP;

  return (
    <svg viewBox={`0 0 400 ${chartH + 10}`} width="100%" height={chartH + 10} style={{ display: 'block', maxWidth: '100%' }}>
      {rows.map((row, i) => {
        const groupY = i * (GROUP_H + GROUP_GAP);
        const memberW = (row.members / maxScale) * BAR_MAX_W;
        const planW = (row.plans / maxScale) * BAR_MAX_W;
        const color = PALETTE[i % PALETTE.length];
        return (
          <g key={row.label}>
            <text x={0} y={groupY + GROUP_H / 2 + 4} fontSize={12.5} fontWeight={600} fill={colors.textBody}>
              {row.label}
            </text>
            <rect x={BAR_LEFT} y={groupY} width={memberW} height={BAR_H} rx={4} fill={colors.returnBar} />
            <text x={BAR_LEFT + memberW + 8} y={groupY} dy={11} fontSize={10.5} fontWeight={600} fill={colors.textMuted}>
              {fmt(row.members)}명
            </text>
            <rect x={BAR_LEFT} y={groupY + BAR_H + BAR_GAP} width={planW} height={BAR_H} rx={4} fill={color} />
            <text x={BAR_LEFT + planW + 8} y={groupY + BAR_H + BAR_GAP} dy={11} fontSize={10.5} fontWeight={700} fill={colors.textBody}>
              {fmt(row.plans)}건
            </text>
          </g>
        );
      })}
    </svg>
  );
}
