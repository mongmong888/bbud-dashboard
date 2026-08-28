'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors } from './shared';

const NAV_ITEMS = [
  { href: '/', label: '대시보드' },
  { href: '/members', label: '회원 현황' },
  { href: '/partners', label: '제휴사 현황' },
  { href: '/banner-ads', label: '배너 광고' },
  { href: '/push-notifications', label: '푸시 알림' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div
      style={{
        width: 224,
        flexShrink: 0,
        background: '#fff',
        borderRight: `1px solid ${colors.border}`,
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: '100vh',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 20px' }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: `linear-gradient(135deg,${colors.primary},${colors.primaryLight})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 19V10M12 19V5M20 19V13" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: colors.textDark }}>비벗 운영 현황</div>
      </div>

      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 9,
              fontSize: 13.5,
              fontWeight: 600,
              background: active ? colors.primaryBg : 'transparent',
              color: active ? colors.primary : colors.textMuted,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
