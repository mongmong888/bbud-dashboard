'use client';

import { useCallback, useEffect, useState } from 'react';
import { Preset } from '@/lib/ga4';
import { PartnerStatusRow } from '@/lib/queries';
import { FilterBar } from '../components/TopBar';
import { card, colors, formatShortRange } from '../components/shared';
import { GroupedMetricTable } from '../components/GroupedMetricTable';

const PARTNER_METRIC_GROUPS = [
  { key: 'view', label: '조회수', eventValue: (r: PartnerStatusRow) => r.viewEvent, usersValue: (r: PartnerStatusRow) => r.viewUsers },
  { key: 'call', label: '전화 클릭', eventValue: (r: PartnerStatusRow) => r.callEvent, usersValue: (r: PartnerStatusRow) => r.callUsers },
  { key: 'kakao', label: '카카오 클릭', eventValue: (r: PartnerStatusRow) => r.kakaoEvent, usersValue: (r: PartnerStatusRow) => r.kakaoUsers },
  { key: 'use', label: '이용하기 클릭', eventValue: (r: PartnerStatusRow) => r.useEvent, usersValue: (r: PartnerStatusRow) => r.useUsers },
];

interface PartnersResponse {
  period: { startDate: string; endDate: string };
  maxSelectableDate: string;
  rows: PartnerStatusRow[];
}

const PRESET_LABEL: Record<Preset, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  custom: '직접설정',
};

export default function PartnersPage() {
  const [preset, setPreset] = useState<Preset>('7d');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [customError, setCustomError] = useState('');

  const [data, setData] = useState<PartnersResponse | null>(null);
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
      const res = await fetch(`/api/partners?${params.toString()}`);
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
          <div style={{ fontSize: 19, fontWeight: 700, color: colors.textDark, letterSpacing: '-0.2px' }}>제휴사 현황</div>
          <div style={{ fontSize: 13, color: colors.textFaint, marginTop: 1 }}>제휴사 입점 페이지 조회·클릭 성과</div>
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
          <GroupedMetricTable<PartnerStatusRow>
            title="제휴사 입점 성과"
            subtitle="조회수(이벤트 수) 내림차순 정렬 · 지표별 이벤트 수 / 활성 사용자 수 구분"
            nameHeader="업체명"
            nameValue={(r) => r.name}
            metricGroups={PARTNER_METRIC_GROUPS}
            rows={data.rows}
            emptyMessage="해당 기간에 조회 또는 클릭이 발생한 제휴사가 없어요"
          />
        )}
      </div>
    </div>
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
