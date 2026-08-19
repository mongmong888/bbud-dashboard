import { RatioItem } from '@/lib/members';
import { colors, fmt } from './shared';

const PALETTE = ['#3E7BFA', '#7AA6FF', '#7A5AF8', '#FFB020', '#12B76A', '#F04438', '#0BA5EC', '#EE46BC', '#98A2B3', '#F79009'];

function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildSlices(items: RatioItem[], cx: number, cy: number, r: number) {
  const total = items.reduce((a, b) => a + b.count, 0);
  let cum = 0;
  return items.map((it) => {
    const startAngle = total > 0 ? (cum / total) * 360 : 0;
    cum += it.count;
    const endAngle = total > 0 ? (cum / total) * 360 : 0;
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const p1 = polarPoint(cx, cy, r, startAngle);
    const p2 = polarPoint(cx, cy, r, endAngle);
    const d = `M ${cx} ${cy} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
    return d;
  });
}

export function Donut({
  items,
  size = 200,
  unit = '건',
  valueLabel = '건',
  centerLabel,
  centerSub,
  twoColumnLegend = false,
  showCount = true,
}: {
  items: RatioItem[];
  size?: number;
  unit?: string;
  valueLabel?: string;
  centerLabel?: string;
  centerSub?: string;
  twoColumnLegend?: boolean;
  showCount?: boolean;
}) {
  const r = size / 2;
  const paths = buildSlices(items, r, r, r);

  const legendItem = (it: RatioItem, i: number) => (
    <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: colors.textBody, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: 3, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
      <span style={{ fontWeight: 600 }}>{it.label}</span>
      <span style={{ color: colors.textFaint }}>
        {showCount ? (
          <>
            {fmt(it.count)}
            {unit} ({it.pct.toFixed(1)}%)
          </>
        ) : (
          `${it.pct.toFixed(1)}%`
        )}
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {paths.map((d, i) => (
            <path key={i} d={d} fill={PALETTE[i % PALETTE.length]} />
          ))}
          <circle cx={r} cy={r} r={r * 0.62} fill="#fff" />
        </svg>
        {centerLabel && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.textDark }}>{centerLabel}</div>
            {centerSub && <div style={{ fontSize: 11, color: colors.textFaint }}>{centerSub}</div>}
          </div>
        )}
      </div>

      {twoColumnLegend && items.length > 5 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,auto)', gap: '6px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.slice(0, Math.ceil(items.length / 2)).map((it, i) => legendItem(it, i))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.slice(Math.ceil(items.length / 2)).map((it, i) => legendItem(it, i + Math.ceil(items.length / 2)))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>{items.map((it, i) => legendItem(it, i))}</div>
      )}
      {items.length === 0 && <div style={{ fontSize: 13.5, color: colors.textFaint }}>표시할 {valueLabel} 데이터가 없어요</div>}
    </div>
  );
}
