'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Preset } from '@/lib/ga4';
import { ContentItem } from '@/lib/queries';
import { CONTENT_CATEGORIES } from '@/lib/contentCategories';
import { FilterBar } from '../components/TopBar';
import { card, colors, fmt, formatShortRange, navBtnStyle, pageBtnStyle, sectionSubtitle, sectionTitle } from '../components/shared';

interface DateGroup {
  date: string;
  items: ContentItem[];
}

interface ContentStatusResponse {
  period: { startDate: string; endDate: string };
  maxSelectableDate: string;
  dates: DateGroup[];
  unknown: ContentItem[];
}

const PRESET_LABEL: Record<Preset, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  custom: '직접설정',
};

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  지원사업: { bg: '#EAF1FF', color: '#3E7BFA' },
  창업정보: { bg: '#E9F9EE', color: '#12B76A' },
  이벤트: { bg: '#FEF3E8', color: '#B54708' },
};

const DATES_PER_PAGE = 10;
const PAGE_WINDOW = 5;

function formatSession(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-');
  const weekday = WEEKDAY_KR[new Date(`${iso}T00:00:00Z`).getUTCDay()];
  return `${y.slice(2)}.${m}.${d} (${weekday})`;
}

function CategoryChip({ label }: { label: string }) {
  const style = CATEGORY_STYLE[label] ?? { bg: colors.bg, color: colors.textMuted };
  return (
    <span
      style={{
        display: 'inline-block',
        background: style.bg,
        color: style.color,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function ScrollFunnel({ funnel }: { funnel: ContentItem['scrollFunnel'] }) {
  const stages: { pct: string; value: number; opacity: number }[] = [
    { pct: '25%', value: funnel.p25, opacity: 1 },
    { pct: '50%', value: funnel.p50, opacity: 0.75 },
    { pct: '75%', value: funnel.p75, opacity: 0.55 },
    { pct: '100%', value: funnel.p100, opacity: 0.4 },
  ];
  const max = Math.max(funnel.p25, 1);

  if (funnel.p25 === 0) {
    return <span style={{ fontSize: 11.5, color: colors.textFaint }}>스크롤 이벤트 없음</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 150 }}>
      {stages.map((s) => (
        <div key={s.pct} title={`스크롤 ${s.pct} 도달: ${fmt(s.value)}회`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9.5, color: colors.textFaint, width: 26, flexShrink: 0, textAlign: 'right' }}>{s.pct}</span>
          <div style={{ flex: 1, minWidth: 0, height: 7, background: '#F2F4F7', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(s.value / max) * 100}%`, height: '100%', background: colors.primary, opacity: s.opacity, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 9.5, color: colors.textMuted, width: 38, flexShrink: 0, textAlign: 'right', fontWeight: 600 }}>{fmt(s.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ContentItemTable({ items }: { items: ContentItem[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...thBase, width: 96, verticalAlign: 'bottom' }}>
              카테고리
            </th>
            <th rowSpan={2} style={{ ...thBase, minWidth: 240, verticalAlign: 'bottom' }}>
              콘텐츠명
            </th>
            <th colSpan={2} style={groupThStyle}>
              조회수
            </th>
            <th
              rowSpan={2}
              style={{ ...thBase, textAlign: 'right', borderLeft: `1px solid ${colors.headerBorder}`, verticalAlign: 'bottom', whiteSpace: 'nowrap' }}
              title="GA4상 페이지 단위 체류 시간과 가장 가까운 근사 지표예요"
            >
              평균 세션 시간 ⓘ
            </th>
            <th
              rowSpan={2}
              style={{ ...thBase, width: 190, verticalAlign: 'bottom', borderLeft: `1px solid ${colors.headerBorder}` }}
              title="누적 퍼널이에요 — 100%에 도달한 사용자는 25/50/75%에도 모두 카운트됩니다"
            >
              스크롤 도달 (구간별 이벤트 수) ⓘ
            </th>
          </tr>
          <tr style={{ borderBottom: `1px solid ${colors.headerBorder}` }}>
            <th style={{ ...subThStyle, borderLeft: `1px solid ${colors.headerBorder}` }}>이벤트 수</th>
            <th style={subThStyle}>활성 사용자 수</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
              <td style={{ padding: '13px 8px' }}>
                <CategoryChip label={it.category} />
              </td>
              <td style={{ padding: '13px 8px', fontSize: 13, color: colors.textBody, fontWeight: 500, lineHeight: 1.45 }} title={it.title}>
                {it.title}
              </td>
              <td style={eventTdStyle}>{fmt(it.viewEvent)}</td>
              <td style={usersTdStyle}>{fmt(it.viewUsers)}</td>
              <td style={{ padding: '13px 8px', textAlign: 'right', fontSize: 13, color: colors.textMuted, fontWeight: 600, borderLeft: `1px solid ${colors.rowBorder}`, whiteSpace: 'nowrap' }}>
                {formatSession(it.avgSessionSeconds)}
              </td>
              <td style={{ padding: '11px 8px', borderLeft: `1px solid ${colors.rowBorder}` }}>
                <ScrollFunnel funnel={it.scrollFunnel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContentStatusPage() {
  const [preset, setPreset] = useState<Preset>('7d');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [customError, setCustomError] = useState('');

  const [data, setData] = useState<ContentStatusResponse | null>(null);
  const [maxSelectableDate, setMaxSelectableDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [categoryTab, setCategoryTab] = useState<string>('전체');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({ preset });
    if (preset === 'custom') {
      params.set('start', appliedStart);
      params.set('end', appliedEnd);
    }
    try {
      const res = await fetch(`/api/content-status?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error ?? '데이터를 불러오지 못했어요.');
        if (json.maxSelectableDate) setMaxSelectableDate(json.maxSelectableDate);
        setLoading(false);
        return;
      }
      setData(json);
      setMaxSelectableDate(json.maxSelectableDate);
      setPage(1);
      const initialExpanded: Record<string, boolean> = {};
      for (const d of json.dates as DateGroup[]) {
        if (d.items.length > 0) initialExpanded[d.date] = true;
      }
      setExpanded(initialExpanded);
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
  const filterRangeText = data ? `${formatShortRange(data.period.startDate, data.period.endDate)} 발행` : `${appliedRangeText} 발행`;

  const allItems = useMemo(() => data?.dates.flatMap((d) => d.items) ?? [], [data]);

  const categorySummary = useMemo(() => {
    return CONTENT_CATEGORIES.map((cat) => {
      const items = allItems.filter((it) => it.category === cat.label);
      const count = items.length;
      const viewEvent = items.reduce((a, it) => a + it.viewEvent, 0);
      const viewUsers = items.reduce((a, it) => a + it.viewUsers, 0);
      const avgSession = count > 0 ? items.reduce((a, it) => a + it.avgSessionSeconds, 0) / count : 0;
      return { label: cat.label, count, viewEvent, viewUsers, avgSession };
    });
  }, [allItems]);

  const filteredDates = useMemo(() => {
    if (!data) return [];
    return data.dates.map((d) => ({
      date: d.date,
      originalCount: d.items.length,
      items: categoryTab === '전체' ? d.items : d.items.filter((it) => it.category === categoryTab),
    }));
  }, [data, categoryTab]);

  const totalPages = Math.max(1, Math.ceil(filteredDates.length / DATES_PER_PAGE));
  const clampedPage = Math.min(page, totalPages);
  const pageDates = filteredDates.slice((clampedPage - 1) * DATES_PER_PAGE, clampedPage * DATES_PER_PAGE);
  const windowStart = Math.floor((clampedPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;
  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);
  const pageNumbers = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);

  const allCurrentlyExpanded = pageDates.filter((d) => d.items.length > 0).every((d) => expanded[d.date]);

  function toggleAll() {
    const next = { ...expanded };
    const shouldExpand = !allCurrentlyExpanded;
    for (const d of pageDates) {
      if (d.items.length > 0) next[d.date] = shouldExpand;
    }
    setExpanded(next);
  }

  const filteredUnknown = useMemo(() => {
    if (!data) return [];
    if (categoryTab === '전체') return data.unknown;
    return data.unknown.filter((it) => it.category === categoryTab);
  }, [data, categoryTab]);

  return (
    <div style={{ padding: '32px 40px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: colors.textDark, letterSpacing: '-0.2px' }}>콘텐츠 현황</div>
          <div style={{ fontSize: 13, color: colors.textFaint, marginTop: 1 }}>발행일 기준 콘텐츠 성과 분석 (지원사업 · 창업정보 · 이벤트)</div>
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

        <div
          style={{
            background: '#F5F8FF',
            border: '1px solid #DCE7FF',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 12.5,
            color: colors.primary,
          }}
        >
          이 화면의 지표는 콘텐츠의 발행일을 기준으로 집계돼요. 트래픽 발생일이 아닙니다.
        </div>

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

        {data && allItems.length === 0 && data.unknown.length === 0 && (
          <div style={{ ...card, padding: '80px 24px', textAlign: 'center', fontSize: 13.5, color: colors.textFaint }}>
            선택한 기간에 발행된 콘텐츠가 없어요
          </div>
        )}

        {data && (allItems.length > 0 || data.unknown.length > 0) && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              {['전체', ...CONTENT_CATEGORIES.map((c) => c.label)].map((label) => {
                const active = categoryTab === label;
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setCategoryTab(label);
                      setPage(1);
                    }}
                    style={{
                      border: `1px solid ${active ? colors.primary : colors.border}`,
                      background: active ? colors.primaryBg : '#fff',
                      color: active ? colors.primary : colors.textMuted,
                      padding: '8px 18px',
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ ...card, marginBottom: 20 }}>
              <div style={sectionTitle}>카테고리별 요약</div>
              <div style={{ ...sectionSubtitle, marginBottom: 14 }}>{appliedRangeText} 발행 콘텐츠 기준</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ ...thBase, minWidth: 120, verticalAlign: 'bottom' }}>
                      카테고리
                    </th>
                    <th rowSpan={2} style={{ ...thBase, textAlign: 'right', borderLeft: `1px solid ${colors.headerBorder}`, verticalAlign: 'bottom' }}>
                      발행 건수
                    </th>
                    <th colSpan={2} style={groupThStyle}>
                      조회수
                    </th>
                    <th
                      rowSpan={2}
                      style={{ ...thBase, textAlign: 'right', borderLeft: `1px solid ${colors.headerBorder}`, verticalAlign: 'bottom', whiteSpace: 'nowrap' }}
                    >
                      평균 세션 시간
                    </th>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.headerBorder}` }}>
                    <th style={{ ...subThStyle, borderLeft: `1px solid ${colors.headerBorder}` }}>이벤트 수</th>
                    <th style={subThStyle}>활성 사용자 수</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySummary.map((c) => (
                    <tr key={c.label} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                      <td style={{ padding: '13px 8px' }}>
                        <CategoryChip label={c.label} />
                      </td>
                      <td style={{ padding: '13px 8px', textAlign: 'right', fontSize: 13.5, color: colors.textDark, fontWeight: 600, borderLeft: `1px solid ${colors.rowBorder}` }}>
                        {fmt(c.count)}
                      </td>
                      <td style={eventTdStyle}>{fmt(c.viewEvent)}</td>
                      <td style={usersTdStyle}>{fmt(c.viewUsers)}</td>
                      <td style={{ padding: '13px 8px', textAlign: 'right', fontSize: 13.5, color: colors.textDark, fontWeight: 600, borderLeft: `1px solid ${colors.rowBorder}` }}>
                        {formatSession(c.avgSession)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <div style={sectionTitle}>날짜별 발행 콘텐츠</div>
              <button onClick={toggleAll} style={toggleAllBtnStyle}>
                {allCurrentlyExpanded ? '전체 접기' : '전체 펼치기'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pageDates.map((d) => {
                const hasRows = d.items.length > 0;
                const isExpanded = expanded[d.date] ?? false;
                return (
                  <div key={d.date} style={{ background: hasRows ? '#fff' : '#FAFBFC', border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div
                      onClick={() => hasRows && setExpanded((s) => ({ ...s, [d.date]: !s[d.date] }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        cursor: hasRows ? 'pointer' : 'default',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {hasRows && <span style={{ width: 14, textAlign: 'center', color: colors.textFaint, fontSize: 11 }}>{isExpanded ? '▾' : '▸'}</span>}
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: hasRows ? colors.textDark : colors.textFaint }}>{formatDateLabel(d.date)}</span>
                        {hasRows && (
                          <span style={{ fontSize: 11.5, color: colors.textMuted, background: colors.bg, borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>
                            {d.items.length}건 발행
                          </span>
                        )}
                        {!hasRows && d.originalCount === 0 && <span style={{ fontSize: 12.5, color: '#B0B7C3' }}>· 발행된 콘텐츠 없음</span>}
                        {!hasRows && d.originalCount > 0 && (
                          <span style={{ fontSize: 12.5, color: '#B0B7C3' }}>· 선택한 카테고리에 해당하는 콘텐츠가 없어요</span>
                        )}
                      </div>
                    </div>

                    {hasRows && isExpanded && (
                      <div style={{ borderTop: `1px solid ${colors.rowBorder}`, padding: '6px 18px 16px' }}>
                        <ContentItemTable items={d.items} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 16 }}>
                <button
                  onClick={() => setPage(Math.max(1, windowStart - 1))}
                  disabled={windowStart === 1}
                  style={{ ...navBtnStyle, opacity: windowStart === 1 ? 0.4 : 1, cursor: windowStart === 1 ? 'default' : 'pointer' }}
                >
                  ‹
                </button>
                {pageNumbers.map((n) => (
                  <button key={n} onClick={() => setPage(n)} style={pageBtnStyle(n === clampedPage)}>
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, windowEnd + 1))}
                  disabled={windowEnd === totalPages}
                  style={{ ...navBtnStyle, opacity: windowEnd === totalPages ? 0.4 : 1, cursor: windowEnd === totalPages ? 'default' : 'pointer' }}
                >
                  ›
                </button>
              </div>
            )}

            {filteredUnknown.length > 0 && (
              <div style={{ ...card, marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                  <div style={sectionTitle}>발행일 미상</div>
                  <span style={{ background: '#FEF3E8', color: '#B54708', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                    발행일 추정 불가
                  </span>
                </div>
                <div style={{ ...sectionSubtitle, marginBottom: 14 }}>
                  GA4 조회 범위 밖에서 이미 트래픽이 있었을 가능성이 있어 최초 발행일을 확정할 수 없어요
                </div>
                <ContentItemTable items={filteredUnknown} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const thBase: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontSize: 12.5,
  color: colors.textFaint,
  fontWeight: 600,
  borderBottom: `1px solid ${colors.headerBorder}`,
};

const groupThStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 8,
  fontSize: 12.5,
  color: colors.textBody,
  fontWeight: 700,
  borderLeft: `1px solid ${colors.headerBorder}`,
  borderBottom: `1px solid ${colors.rowBorder}`,
};

const subThStyle: React.CSSProperties = {
  textAlign: 'right',
  padding: '6px 8px 10px',
  fontSize: 11.5,
  color: colors.textFaint,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const eventTdStyle: React.CSSProperties = {
  padding: '13px 8px',
  textAlign: 'right',
  fontSize: 13.5,
  color: colors.textDark,
  fontWeight: 600,
  borderLeft: `1px solid ${colors.rowBorder}`,
};

const usersTdStyle: React.CSSProperties = {
  padding: '13px 8px',
  textAlign: 'right',
  fontSize: 13,
  color: colors.textFaint,
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

const toggleAllBtnStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: '#fff',
  color: colors.textMuted,
  padding: '7px 14px',
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
