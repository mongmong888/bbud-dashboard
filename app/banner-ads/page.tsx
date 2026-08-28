'use client';

import { useCallback, useEffect, useState } from 'react';
import { Preset } from '@/lib/ga4';
import { PlacementAgg, AdRow } from '@/lib/queries';
import { PLACEMENT_KEYWORDS } from '@/lib/placements';
import { FilterBar } from '../components/TopBar';
import { card, colors, fmt, formatShortRange, sectionSubtitle, sectionTitle } from '../components/shared';
import { PaginatedTable } from '../components/PaginatedTable';

interface BannerAdsResponse {
  period: { startDate: string; endDate: string };
  maxSelectableDate: string;
  placementAgg: PlacementAgg[];
  bannerAdsByPlacement: Record<string, AdRow[]>;
  popupAds: AdRow[];
}

const PRESET_LABEL: Record<Preset, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  custom: '직접설정',
};

function formatPeriod(period: AdRow['period']): string {
  if (!period) return '-';
  const yy = (d: string) => d.slice(2);
  return `${yy(period.startDate)} ~ ${yy(period.endDate)} (${period.days}일)`;
}

export default function BannerAdsPage() {
  const [preset, setPreset] = useState<Preset>('7d');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [customError, setCustomError] = useState('');

  const [data, setData] = useState<BannerAdsResponse | null>(null);
  const [maxSelectableDate, setMaxSelectableDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(PLACEMENT_KEYWORDS[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      params.set('start', appliedStart);
      params.set('end', appliedEnd);
    }
    try {
      const res = await fetch(`/api/banner-ads?${params.toString()}`);
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

  const adColumns = [
    { header: '배너명', render: (r: AdRow) => <span style={cellNameStyle}>{r.name}</span> },
    { header: '노출수', align: 'right' as const, render: (r: AdRow) => <span style={cellValueStyle}>{fmt(r.view)}</span> },
    { header: '클릭수', align: 'right' as const, render: (r: AdRow) => <span style={cellValueStyle}>{fmt(r.click)}</span> },
    { header: 'CTR', align: 'right' as const, render: (r: AdRow) => <span style={cellValueStyle}>{r.ctr.toFixed(2)}%</span> },
    { header: '게시 기간', align: 'right' as const, render: (r: AdRow) => <span style={{ fontSize: 12.5, color: colors.textMuted }}>{formatPeriod(r.period)}</span> },
  ];

  return (
    <div style={{ padding: '32px 40px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: colors.textDark, letterSpacing: '-0.2px' }}>배너 광고</div>
          <div style={{ fontSize: 13, color: colors.textFaint, marginTop: 1 }}>구좌별 배너·팝업 광고 성과 분석</div>
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

        {data && (
          <BannerAdsBody data={data} activeTab={activeTab} onSelectTab={setActiveTab} adColumns={adColumns} />
        )}
      </div>
    </div>
  );
}

function BannerAdsBody({
  data,
  activeTab,
  onSelectTab,
  adColumns,
}: {
  data: BannerAdsResponse;
  activeTab: string;
  onSelectTab: (t: string) => void;
  adColumns: { header: string; align?: 'left' | 'right'; render: (r: AdRow) => React.ReactNode }[];
}) {
  const allEmpty = data.placementAgg.every((p) => p.view === 0 && p.click === 0) && data.popupAds.length === 0;

  if (allEmpty) {
    return (
      <div style={{ ...card, height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: colors.textBody }}>아직 표시할 배너·팝업 데이터가 없어요.</div>
      </div>
    );
  }

  const activeRows = data.bannerAdsByPlacement[activeTab] ?? [];
  const isPopupTab = activeTab === '팝업';
  const activeColumns = isPopupTab ? adColumns.map((c) => (c.header === '배너명' ? { ...c, header: '팝업명' } : c)) : adColumns;

  return (
    <>
      {/* 구좌별 요약 집계 */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={sectionTitle}>구좌별 요약 집계</div>
        <div style={{ ...sectionSubtitle, marginBottom: 14 }}>총 노출수 내림차순 · 행을 클릭하면 하단 구좌가 전환돼요</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.headerBorder}` }}>
              <th style={thStyle('left')}>구좌명</th>
              <th style={thStyle('right')}>총 노출수</th>
              <th style={thStyle('right')}>총 클릭수</th>
              <th style={thStyle('right')}>평균 CTR</th>
            </tr>
          </thead>
          <tbody>
            {data.placementAgg.map((p) => {
              const active = activeTab === p.name;
              return (
                <tr
                  key={p.name}
                  onClick={() => onSelectTab(p.name)}
                  style={{ borderBottom: `1px solid ${colors.rowBorder}`, cursor: 'pointer', background: active ? '#F8FAFF' : '#fff' }}
                >
                  <td style={{ padding: '13px 8px', fontSize: 13.5, fontWeight: 600, color: active ? colors.primary : colors.textBody }}>{p.name}</td>
                  <td style={{ padding: '13px 8px', textAlign: 'right', ...cellValueStyle }}>{fmt(p.view)}</td>
                  <td style={{ padding: '13px 8px', textAlign: 'right', ...cellValueStyle }}>{fmt(p.click)}</td>
                  <td style={{ padding: '13px 8px', textAlign: 'right', ...cellValueStyle }}>{p.ctr.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 구좌 선택 탭 + 개별 배너 테이블 */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {data.placementAgg.map((p) => {
            const active = activeTab === p.name;
            return (
              <button
                key={p.name}
                onClick={() => onSelectTab(p.name)}
                style={{
                  border: `1px solid ${active ? colors.primary : colors.border}`,
                  background: active ? colors.primaryBg : '#fff',
                  color: active ? colors.primary : colors.textMuted,
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        <PaginatedTable<AdRow>
          title={isPopupTab ? '팝업 성과' : `${activeTab} 배너 성과`}
          subtitle="노출수 내림차순 정렬"
          rows={activeRows}
          columns={activeColumns}
          emptyMessage={isPopupTab ? '해당 기간에 집계된 팝업 이벤트가 없어요' : '이 구좌에는 해당 기간에 집계된 배너 이벤트가 없어요'}
          wrapInCard={false}
        />
      </div>

      {/* 팝업 성과 */}
      <PaginatedTable<AdRow>
        title="팝업 성과"
        subtitle="구좌 구분 없음 · 노출수 내림차순 정렬"
        rows={data.popupAds}
        columns={adColumns.map((c) => (c.header === '배너명' ? { ...c, header: '팝업명' } : c))}
        emptyMessage="해당 기간에 집계된 팝업 이벤트가 없어요"
      />
    </>
  );
}

function thStyle(align: 'left' | 'right'): React.CSSProperties {
  return { textAlign: align, padding: '10px 8px', fontSize: 12.5, color: colors.textFaint, fontWeight: 600 };
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
const cellValueStyle: React.CSSProperties = { fontSize: 13.5, color: colors.textDark, fontWeight: 600 };
