import { CSSProperties } from 'react';

export const colors = {
  bg: '#F0F2F7',
  border: '#E4E7EC',
  rowBorder: '#F5F6F8',
  headerBorder: '#EAECF0',
  textDark: '#101828',
  textBody: '#344054',
  textMuted: '#667085',
  textFaint: '#98A2B3',
  primary: '#3E7BFA',
  primaryLight: '#7AA6FF',
  primaryBg: '#EAF1FF',
  newBar: '#3E7BFA',
  returnBar: '#C7D9FF',
  positive: '#12B76A',
  positiveBg: '#ECFDF3',
  negative: '#F04438',
  negativeBg: '#FEF3F2',
};

export const card: CSSProperties = {
  background: '#fff',
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: '22px 24px',
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
};

export const sectionTitle: CSSProperties = {
  fontSize: 15.5,
  fontWeight: 700,
  color: colors.textDark,
};

export const sectionSubtitle: CSSProperties = {
  fontSize: 12.5,
  color: colors.textFaint,
  marginTop: 2,
};

export function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function formatShortRange(startDate: string, endDate: string): string {
  const yy = (d: string) => d.slice(2);
  return `${yy(startDate)} ~ ${yy(endDate)}`;
}

export function DeltaText({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textFaint }}>비교 데이터 없음</div>;
  }
  const positive = delta >= 0;
  const color = positive ? colors.positive : colors.negative;
  const text = `${positive ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%`;
  return <div style={{ fontSize: 11.5, fontWeight: 600, color }}>{text}</div>;
}

export function DeltaPill({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <div style={{ fontSize: 12.5, fontWeight: 500, color: colors.textFaint }}>비교 데이터 없음</div>
    );
  }
  const positive = delta >= 0;
  const color = positive ? colors.positive : colors.negative;
  const bg = positive ? colors.positiveBg : colors.negativeBg;
  const text = `${positive ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%`;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12.5,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 6,
        background: bg,
        color,
      }}
    >
      {text}
      <span style={{ color: colors.textFaint, fontWeight: 500 }}>직전 기간 대비</span>
    </div>
  );
}

export const navBtnStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: '#fff',
  width: 30,
  height: 30,
  borderRadius: 7,
  cursor: 'pointer',
  color: colors.textMuted,
};

export function pageBtnStyle(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? colors.primary : colors.border}`,
    background: active ? colors.primary : '#fff',
    color: active ? '#fff' : colors.textMuted,
    width: 30,
    height: 30,
    borderRadius: 7,
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 600,
  };
}
