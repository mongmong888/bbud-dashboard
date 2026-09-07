'use client';

import { useCallback, useEffect, useState } from 'react';
import { Preset } from '@/lib/ga4';
import { EventIdRow, PartnerRow, SummaryData, TopPageRow, TrendPoint } from '@/lib/queries';
import { Header, FilterBar } from './components/TopBar';
import { KpiCards } from './components/KpiCards';
import { TrendChart } from './components/TrendChart';
import { PaginatedTable } from './components/PaginatedTable';
import { DauModal } from './components/DauModal';
import { AiAnalysisCard } from './components/AiAnalysisCard';
import { colors, fmt, formatShortRange } from './components/shared';

interface DashboardResponse {
  period: { startDate: string; endDate: string; compareStartDate: string; compareEndDate: string };
  maxSelectableDate: string;
  summary: SummaryData;
  trend: TrendPoint[];
  banners: EventIdRow[];
  popups: EventIdRow[];
  partners: PartnerRow[];
  topPages: TopPageRow[];
  hourlyMax: number;
}

const PRESET_LABEL: Record<Preset, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  custom: '직접설정',
};

export default function DashboardPage() {
  const [preset, setPreset] = useState<Preset>('7d');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [customError, setCustomError] = useState('');

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [maxSelectableDate, setMaxSelectableDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [issues, setIssues] = useState<Record<string, string[]>>({});
  const [modalPoint, setModalPoint] = useState<TrendPoint | null>(null);

  useEffect(() => {
    fetch('/api/dau-issues')
      .then((res) => res.json())
      .then((json) => setIssues(json.issues ?? {}))
      .catch(() => {});
  }, []);

  async function handleAddIssue(date: string, note: string) {
    const res = await fetch('/api/dau-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, action: 'add', note }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? '저장에 실패했어요.');
    setIssues(json.issues ?? {});
  }

  async function handleRemoveIssue(date: string, index: number) {
    const res = await fetch('/api/dau-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, action: 'remove', index }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? '삭제에 실패했어요.');
    setIssues(json.issues ?? {});
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      params.set('start', appliedStart);
      params.set('end', appliedEnd);
    }
    try {
      const res = await fetch(`/api/dashboard?${params.toString()}`);
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

  // ---- 전체 화면 상태 ----

  if (loading && !data) {
    return (
      <Shell maxSelectableDate={maxSelectableDate}>
        <div style={{ ...loadingCard, height: 120 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 24 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...loadingCard, height: 120 }} />
          ))}
        </div>
        <div style={{ ...loadingCard, height: 320, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ ...loadingCard, height: 320 }} />
          <div style={{ ...loadingCard, height: 320 }} />
        </div>
      </Shell>
    );
  }

  if (fetchError && !data) {
    return (
      <Shell maxSelectableDate={maxSelectableDate}>
        <div style={{ ...loadingCard, height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, color: colors.textBody, fontWeight: 600 }}>{fetchError}</div>
          <button onClick={fetchData} style={retryBtnStyle}>
            다시 시도
          </button>
        </div>
      </Shell>
    );
  }

  if (!data) return null;

  const allEmpty =
    data.summary.activeUsers.value === 0 &&
    data.summary.pageViews.value === 0 &&
    data.summary.signUps.value === 0 &&
    data.trend.length === 0 &&
    data.banners.length === 0 &&
    data.popups.length === 0 &&
    data.partners.length === 0 &&
    data.topPages.length === 0;

  return (
    <Shell maxSelectableDate={maxSelectableDate}>
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

      {allEmpty ? (
        <div style={{ ...loadingCard, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.textBody }}>아직 표시할 데이터가 없어요.</div>
          <div style={{ fontSize: 13, color: colors.textFaint }}>데이터는 매일 오전 6시에 전일 기준으로 갱신돼요.</div>
        </div>
      ) : (
        <>
          <KpiCards summary={data.summary} />
          <TrendChart
            data={data.trend}
            rangeLabel={appliedRangeText}
            issueDates={new Set(Object.keys(issues))}
            onBarClick={(point) => setModalPoint(point)}
          >
            <AiAnalysisCard trend={data.trend} rangeLabel={appliedRangeText} summary={data.summary} period={data.period} />
          </TrendChart>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <PaginatedTable<EventIdRow>
              title="배너 성과"
              subtitle="노출수 내림차순 정렬"
              rows={data.banners}
              emptyMessage="해당 기간에 집계된 배너 이벤트가 없어요"
              columns={[
                { header: '배너명', render: (r) => <span style={cellNameStyle}>{r.name}</span> },
                { header: '노출수', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.view.value)}</span> },
                { header: '클릭수', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.click.value)}</span> },
                { header: 'CTR', align: 'right', render: (r) => <span style={cellValueStyle}>{r.ctr.value.toFixed(2)}%</span> },
              ]}
            />

            <PaginatedTable<EventIdRow>
              title="팝업 성과"
              subtitle="노출수 내림차순 정렬"
              rows={data.popups}
              emptyMessage="해당 기간에 집계된 팝업 이벤트가 없어요"
              columns={[
                { header: '팝업명', render: (r) => <span style={cellNameStyle}>{r.name}</span> },
                { header: '노출수', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.view.value)}</span> },
                { header: '클릭수', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.click.value)}</span> },
                { header: 'CTR', align: 'right', render: (r) => <span style={cellValueStyle}>{r.ctr.value.toFixed(2)}%</span> },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <PaginatedTable<PartnerRow>
              title="입점 제휴 업체 성과"
              subtitle="조회수 내림차순 정렬"
              rows={data.partners}
              emptyMessage="해당 기간에 조회 또는 클릭이 발생한 제휴 업체 페이지가 없어요"
              columns={[
                { header: '업체명', render: (r) => <span style={cellNameStyle}>{r.name}</span> },
                { header: '조회수', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.view)}</span> },
                { header: '전화 클릭', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.call.value)}</span> },
                { header: '카카오 클릭', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.kakao.value)}</span> },
                { header: '이용하기 클릭', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.use.value)}</span> },
              ]}
            />

            <PaginatedTable<TopPageRow>
              title="인기 페이지 Top N"
              subtitle="조회수 내림차순 정렬"
              rows={data.topPages}
              emptyMessage="해당 기간에 조회된 페이지가 없어요"
              columns={[
                { header: '페이지 제목', render: (r) => <span style={cellNameStyle}>{r.name}</span> },
                { header: '조회수', align: 'right', render: (r) => <span style={cellValueStyle}>{fmt(r.view)}</span> },
              ]}
            />
          </div>
        </>
      )}

      {modalPoint && (
        <DauModal
          point={modalPoint}
          savedIssues={issues[modalPoint.date] ?? []}
          maxUsers={data.hourlyMax}
          onClose={() => setModalPoint(null)}
          onAddIssue={handleAddIssue}
          onRemoveIssue={handleRemoveIssue}
        />
      )}
    </Shell>
  );
}

function Shell({ children, maxSelectableDate }: { children: React.ReactNode; maxSelectableDate: string }) {
  return (
    <div style={{ padding: '32px 40px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Header maxSelectableDate={maxSelectableDate || '-'} />
        {children}
      </div>
    </div>
  );
}

const loadingCard: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
};

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
const cellValueStyle: React.CSSProperties = { fontSize: 13.5, color: colors.textDark, fontWeight: 600 };
