import { SummaryData } from '@/lib/queries';
import { card, colors, fmt, DeltaPill } from './shared';

const ICONS = {
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M16 21v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="9" cy="7" r="3.2" stroke={colors.primary} strokeWidth={1.8} />
      <path d="M22 21v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="#12B76A" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="3" stroke="#12B76A" strokeWidth={1.8} />
    </svg>
  ),
  bolt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="#F79009" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  ),
  split: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h10M7 17h10M4 12h16" stroke="#7A5AF8" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
};

function IconBadge({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

function Card({ label, iconBg, icon, value, children }: { label: string; iconBg: string; icon: React.ReactNode; value: string; children?: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconBadge bg={iconBg}>{icon}</IconBadge>
        <div style={{ fontSize: 13.5, color: colors.textMuted, fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: colors.textDark, letterSpacing: '-0.4px', marginBottom: 8 }}>
        {value}
      </div>
      {children}
    </div>
  );
}

export function KpiCards({ summary }: { summary: SummaryData }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 24 }}>
      <Card label="활성 사용자수" iconBg={colors.primaryBg} icon={ICONS.users} value={fmt(summary.activeUsers.value)}>
        <DeltaPill delta={summary.activeUsers.delta} />
      </Card>
      <Card label="페이지뷰" iconBg="#E7F9EF" icon={ICONS.eye} value={fmt(summary.pageViews.value)}>
        <DeltaPill delta={summary.pageViews.delta} />
      </Card>
      <Card label="회원가입" iconBg="#FEF3E8" icon={ICONS.bolt} value={fmt(summary.signUps.value)}>
        <DeltaPill delta={summary.signUps.delta} />
      </Card>
      <Card label="신규 / 재방문 비율" iconBg="#F1EEFE" icon={ICONS.split} value={`${summary.newPct}% / ${summary.returnPct}%`}>
        <div style={{ height: 8, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
          <div style={{ width: `${summary.newPct}%`, background: colors.newBar }} />
          <div style={{ width: `${summary.returnPct}%`, background: colors.returnBar }} />
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: colors.textMuted }}>
          <span>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: colors.newBar, marginRight: 4 }} />
            신규 {summary.newPct}%
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: colors.returnBar, marginRight: 4 }} />
            재방문 {summary.returnPct}%
          </span>
        </div>
      </Card>
    </div>
  );
}
