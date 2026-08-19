'use client';

import { Preset } from '@/lib/ga4';
import { colors } from './shared';

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d', label: '최근 7일' },
  { key: '30d', label: '최근 30일' },
  { key: '90d', label: '최근 90일' },
];

export function Header({ maxSelectableDate }: { maxSelectableDate: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg,${colors.primary},${colors.primaryLight})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(62,123,250,0.28)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 19V10M12 19V5M20 19V13" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: colors.textDark, letterSpacing: '-0.2px' }}>
            비벗 운영 현황
          </div>
          <div style={{ fontSize: 13, color: colors.textFaint, marginTop: 1 }}>GA4 기반 트래픽 · 마케팅 성과 대시보드</div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#fff',
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '9px 14px',
          fontSize: 12.5,
          color: colors.textMuted,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#98A2B3" strokeWidth={1.8} />
          <path d="M12 8v4l2.5 2.5" stroke="#98A2B3" strokeWidth={1.8} strokeLinecap="round" />
        </svg>
        <span>
          데이터 기준일: <b style={{ color: colors.textBody }}>{maxSelectableDate}(D-1)</b> · 매일 오전 6시 갱신
        </span>
      </div>
    </div>
  );
}

export function FilterBar({
  preset,
  appliedRangeText,
  onSelectPreset,
  popoverOpen,
  onTogglePopover,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  customError,
  onApplyCustom,
  onCancelPopover,
  maxSelectableDate,
  customButtonLabel,
}: {
  preset: Preset;
  appliedRangeText: string;
  onSelectPreset: (p: Preset) => void;
  popoverOpen: boolean;
  onTogglePopover: () => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  customError: string;
  onApplyCustom: () => void;
  onCancelPopover: () => void;
  maxSelectableDate: string;
  customButtonLabel: string;
}) {
  const applyDisabled = !customStart || !customEnd;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: '10px 14px',
        marginBottom: 24,
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {PRESETS.map((p) => {
          const active = preset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onSelectPreset(p.key)}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: 600,
                background: active ? '#E7ECFB' : colors.bg,
                color: active ? colors.primary : colors.textMuted,
              }}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={onTogglePopover}
          style={{
            border: `1px dashed #C7D3FE`,
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: 9,
            fontSize: 13.5,
            fontWeight: 600,
            background: preset === 'custom' ? '#E7ECFB' : '#fff',
            color: colors.primary,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke={colors.primary} strokeWidth={1.8} />
            <path d="M8 3v4M16 3v4M3 10h18" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
          </svg>
          {customButtonLabel}
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: colors.textFaint }}>{appliedRangeText}</div>

      {popoverOpen && (
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 150,
            zIndex: 20,
            width: 340,
            background: '#fff',
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(16,24,40,0.14)',
            padding: 18,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textDark, marginBottom: 12 }}>직접 기간 설정</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>시작일</div>
              <input
                type="date"
                value={customStart}
                max={maxSelectableDate}
                onChange={(e) => onCustomStartChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: colors.textBody,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>종료일</div>
              <input
                type="date"
                value={customEnd}
                max={maxSelectableDate}
                onChange={(e) => onCustomEndChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: colors.textBody,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: 12, color: colors.textFaint, marginBottom: 8 }}>오늘(D-1) 이후 날짜는 선택할 수 없어요.</div>
          {customError && (
            <div style={{ fontSize: 12.5, color: '#B42318', background: '#FEF3F2', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
              {customError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={onCancelPopover}
              style={{
                border: `1px solid ${colors.border}`,
                background: '#fff',
                color: colors.textBody,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={onApplyCustom}
              disabled={applyDisabled}
              style={{
                border: 'none',
                background: colors.primary,
                color: '#fff',
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: applyDisabled ? 'default' : 'pointer',
                opacity: applyDisabled ? 0.5 : 1,
              }}
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
