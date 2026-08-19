'use client';

import { useCallback, useEffect, useState } from 'react';
import { Preset } from '@/lib/ga4';
import { PushSentRow, PushTrendPoint } from '@/lib/queries';
import { FilterBar } from '../components/TopBar';
import { card, colors, fmt, formatShortRange, sectionSubtitle, sectionTitle } from '../components/shared';
import { PaginatedTable } from '../components/PaginatedTable';
import { PushTrendChart } from '../components/PushTrendChart';

interface SentListPayload {
  configured: boolean;
  error: string | null;
  fetchedAt: string | null;
  rows: PushSentRow[];
}

interface PushNotificationsResponse {
  period: { startDate: string; endDate: string };
  maxSelectableDate: string;
  trend: PushTrendPoint[];
  sentList: SentListPayload;
}

const PRESET_LABEL: Record<Preset, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  custom: '직접설정',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PushNotificationsPage() {
  const [preset, setPreset] = useState<Preset>('7d');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [customError, setCustomError] = useState('');

  const [data, setData] = useState<PushNotificationsResponse | null>(null);
  const [maxSelectableDate, setMaxSelectableDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      params.set('start', appliedStart);
      params.set('end', appliedEnd);
    }
    try {
      const res = await fetch(`/api/push-notifications?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error ?? '데이터를 불러오지 못했어요.');
        if (json.maxSelectableDate) setMaxSelectableDate(json.maxSelectableDate);
        setLoading(false);
        return;
      }
      setData(json);
      setMaxSelectableDate(json.maxSelectableDate);
    } catch {
      setFetchError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [preset, appliedStart, appliedEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function selectPreset(p: Preset) {
    setPopoverOpen(false);
    setPreset(p);
  }

  function togglePopover() {
    setCustomError('');
    setDraftStart(appliedStart);
    setDraftEnd(appliedEnd);
    setPopoverOpen((o) => !o);
  }

  function applyCustom() {
    if (!draftStart || !draftEnd) {
      setCustomError('시작일과 종료일을 모두 선택해 주세요.');
      return;
    }
    if (draftEnd < draftStart) {
      setCustomError('종료일은 시작일 이후여야 해요.');
      return;
    }
    if (maxSelectableDate && draftEnd > maxSelectableDate) {
      setCustomError(`조회 가능한 최신 데이터는 ${maxSelectableDate}(D-1)까지예요.`);
      return;
    }
    setAppliedStart(draftStart);
    setAppliedEnd(draftEnd);
    setPreset('custom');
    setPopoverOpen(false);
    setCustomError('');
  }

  const appliedRangeText = preset === 'custom' ? `${appliedStart} ~ ${appliedEnd}` : PRESET_LABEL[preset];
  const filterRangeText = data ? formatShortRange(data.period.startDate, data.period.endDate) : appliedRangeText;

  return (
    <div style={{ padding: '32px 40px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: colors.textDark, letterSpacing: '-0.2px' }}>푸시 알림</div>
          <div style={{ fontSize: 13, color: colors.textFaint, marginTop: 1 }}>발송된 푸시 알림 성과 조회</div>
        </div>

        <FilterBar
          preset={preset}
          appliedRangeText={filterRangeText}
          onSelectPreset={selectPreset}
          popoverOpen={popoverOpen}
          onTogglePopover={togglePopover}
          customStart={draftStart}
          customEnd={draftEnd}
          onCustomStartChange={setDraftStart}
          onCustomEndChange={setDraftEnd}
          customError={customError}
          onApplyCustom={applyCustom}
          onCancelPopover={() => setPopoverOpen(false)}
          maxSelectableDate={maxSelectableDate}
          customButtonLabel={preset === 'custom' ? appliedRangeText : '직접설정'}
        />

        {loading && !data && (
          <div style={{ ...card, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 13.5, color: colors.textFaint }}>불러오는 중...</div>
          </div>
        )}

        {!loading && fetchError && !data && (
          <div style={{ ...card, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, color: colors.textBody, fontWeight: 600 }}>{fetchError}</div>
            <button onClick={fetchData} style={retryBtnStyle}>
              다시 시도
            </button>
          </div>
        )}

        {data && <PushBody data={data} onRetry={fetchData} />}
      </div>
    </div>
  );
}

function PushBody({ data, onRetry }: { data: PushNotificationsResponse; onRetry: () => void }) {
  const allEmpty = data.trend.every((d) => d.receive === 0 && d.open === 0) && data.sentList.rows.length === 0;

  if (allEmpty && !data.sentList.error) {
    return (
      <div style={{ ...card, height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: colors.textBody }}>아직 표시할 푸시 알림 데이터가 없어요.</div>
      </div>
    );
  }

  const columns = [
    { header: '푸시 발송 일시', render: (r: PushSentRow) => <span style={{ fontSize: 12.5, color: colors.textMuted, whiteSpace: 'nowrap' as const }}>{r.sentAt}</span> },
    { header: '발송 내용', render: (r: PushSentRow) => <span style={cellNameStyle}>{r.content}</span> },
    { header: 'utm_campaign', render: (r: PushSentRow) => <span style={{ fontSize: 12.5, color: colors.textMuted, fontFamily: 'monospace' }}>{r.utmCampaign}</span> },
    {
      header: '조회수',
      align: 'right' as const,
      render: (r: PushSentRow) => (
        <span style={{ fontSize: 13.5, fontWeight: 600, color: r.views !== null ? colors.textDark : colors.textFaint }}>
          {r.views !== null ? fmt(r.views) : '매칭 데이터 없음'}
        </span>
      ),
    },
    {
      header: '활성사용자수',
      align: 'right' as const,
      render: (r: PushSentRow) => (
        <span style={{ fontSize: 13.5, fontWeight: 600, color: r.users !== null ? colors.textDark : colors.textFaint }}>
          {r.users !== null ? fmt(r.users) : '매칭 데이터 없음'}
        </span>
      ),
    },
  ];

  return (
    <>
      <div style={{ ...card, marginBottom: 24, overflow: 'hidden' }}>
        <div style={sectionTitle}>일자별 수신/오픈 추이</div>
        <div style={{ marginTop: 4 }}>
          <PushTrendChart data={data.trend} />
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>발송된 푸시 알림 목록</div>
        <div style={{ ...sectionSubtitle, marginBottom: 14 }}>
          {data.sentList.configured
            ? data.sentList.fetchedAt
              ? `노션 조회: ${formatDateTime(data.sentList.fetchedAt)} · 발송 일시 내림차순`
              : '발송 일시 내림차순'
            : '노션 연동이 설정되지 않았어요'}
        </div>

        {!data.sentList.configured ? (
          <div style={{ padding: '32px 8px', textAlign: 'center', fontSize: 13, color: colors.textFaint }}>
            NOTION_API_KEY / NOTION_PUSH_PAGE_ID 환경변수를 설정하면 발송 목록이 표시돼요.
          </div>
        ) : data.sentList.error ? (
          <div style={{ padding: '32px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, color: colors.textFaint }}>발송 목록을 불러오지 못했어요: {data.sentList.error}</div>
            <button onClick={onRetry} style={retryBtnStyle}>
              다시 시도
            </button>
          </div>
        ) : (
          <PaginatedTable<PushSentRow>
            title=""
            subtitle=""
            hideHeader
            rows={data.sentList.rows}
            columns={columns}
            emptyMessage="해당 기간에 발송된 푸시 알림이 없어요"
            wrapInCard={false}
          />
        )}
      </div>
    </>
  );
}

const retryBtnStyle: React.CSSProperties = {
  border: 'none',
  background: colors.primary,
  color: '#fff',
  padding: '8px 18px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const cellNameStyle: React.CSSProperties = { fontSize: 13.5, color: colors.textBody, fontWeight: 500 };
