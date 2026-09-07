import {
  runReport,
  eventNameFilter,
  pathContainsFilter,
  containsFilter,
  beginsWithFilter,
  inListFilter,
  andFilter,
  orFilter,
  addDays,
  Period,
  DimensionFilter,
} from './ga4';
import { PLACEMENT_KEYWORDS, UNCLASSIFIED_PLACEMENT, classifyPlacement } from './placements';
import { fetchPushSentHistory } from './notion';
import { CONTENT_CATEGORIES } from './contentCategories';

export { PLACEMENT_KEYWORDS, UNCLASSIFIED_PLACEMENT, classifyPlacement } from './placements';
export { CONTENT_CATEGORIES } from './contentCategories';

function toNum(v: string | undefined): number {
  return v ? Number(v) : 0;
}

export interface Metric {
  value: number;
  delta: number | null;
}

function calcDelta(curr: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function metricFrom(curr: number, prev: number | undefined): Metric {
  return { value: curr, delta: calcDelta(curr, prev) };
}

// ---------- 1. 요약 KPI ----------

export interface SummaryData {
  activeUsers: Metric;
  pageViews: Metric;
  signUps: Metric;
  newPct: number;
  returnPct: number;
}

async function fetchWebTotals(startDate: string, endDate: string) {
  const rows = await runReport({
    property: 'web',
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    startDate,
    endDate,
  });
  const row = rows[0];
  return {
    activeUsers: toNum(row?.activeUsers),
    pageViews: toNum(row?.screenPageViews),
  };
}

async function fetchSignUps(startDate: string, endDate: string) {
  const rows = await runReport({
    property: 'marketing',
    metrics: [{ name: 'eventCount' }],
    startDate,
    endDate,
    dimensionFilter: eventNameFilter('sign_up'),
  });
  return toNum(rows[0]?.eventCount);
}

export async function getSummary(period: Period): Promise<SummaryData> {
  const [current, previous, signUpsCurrent, signUpsPrevious, newVsReturningRows] = await Promise.all([
    fetchWebTotals(period.startDate, period.endDate),
    fetchWebTotals(period.compareStartDate, period.compareEndDate),
    fetchSignUps(period.startDate, period.endDate),
    fetchSignUps(period.compareStartDate, period.compareEndDate),
    runReport({
      property: 'web',
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }],
      startDate: period.startDate,
      endDate: period.endDate,
    }),
  ]);

  let newUsers = 0;
  let returningUsers = 0;
  for (const row of newVsReturningRows) {
    if (row.newVsReturning === 'new') newUsers += toNum(row.activeUsers);
    else if (row.newVsReturning === 'returning') returningUsers += toNum(row.activeUsers);
  }
  const totalForRatio = newUsers + returningUsers;
  const newPct = totalForRatio > 0 ? Math.round((newUsers / totalForRatio) * 100) : 0;
  const returnPct = 100 - newPct;

  return {
    activeUsers: metricFrom(current.activeUsers, previous.activeUsers),
    pageViews: metricFrom(current.pageViews, previous.pageViews),
    signUps: metricFrom(signUpsCurrent, signUpsPrevious),
    newPct,
    returnPct,
  };
}

// ---------- 2. 트래픽 트렌드 (일별 DAU) ----------

export interface TrendPoint {
  date: string;
  label: string;
  total: number;
}

function formatDateLabel(yyyymmdd: string): string {
  const month = parseInt(yyyymmdd.slice(4, 6), 10);
  const day = parseInt(yyyymmdd.slice(6, 8), 10);
  return `${month}/${day}`;
}

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabelWithWeekday(yyyymmdd: string): string {
  const year = parseInt(yyyymmdd.slice(0, 4), 10);
  const month = parseInt(yyyymmdd.slice(4, 6), 10);
  const day = parseInt(yyyymmdd.slice(6, 8), 10);
  const weekday = WEEKDAY_KR[new Date(year, month - 1, day).getDay()];
  return `${month}/${String(day).padStart(2, '0')}(${weekday})`;
}

export async function getTrend(period: Period): Promise<TrendPoint[]> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }],
    startDate: period.startDate,
    endDate: period.endDate,
  });

  return rows
    .map((row) => ({ date: row.date, label: formatDateLabelWithWeekday(row.date), total: toNum(row.activeUsers) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface HourlyPoint {
  hour: number;
  users: number;
}

// 특정 하루의 시간대별(0~23시) 활성 사용자수. GA4 속성 타임존(Asia/Seoul) 기준.
export async function getHourlyTraffic(date: string): Promise<HourlyPoint[]> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'hour' }],
    metrics: [{ name: 'activeUsers' }],
    startDate: date,
    endDate: date,
  });

  const byHour = new Map<number, number>();
  for (const row of rows) {
    byHour.set(Number(row.hour), toNum(row.activeUsers));
  }

  return Array.from({ length: 24 }, (_, hour) => ({ hour, users: byHour.get(hour) ?? 0 }));
}

// 조회 기간 전체에서 (날짜, 시간대) 조합 중 가장 높은 활성 사용자수. DAU 팝업들의 Y축 기준을 통일하는 데 쓰인다.
export async function getHourlyMaxInRange(startDate: string, endDate: string): Promise<number> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'date' }, { name: 'hour' }],
    metrics: [{ name: 'activeUsers' }],
    startDate,
    endDate,
  });

  return rows.reduce((max, row) => Math.max(max, toNum(row.activeUsers)), 0);
}

// 조회 기간 전체의 날짜별 시간대(0~23시) 활성 사용자수. AI 분석에서 일자별 유입 패턴을 함께 보는 데 쓰인다.
// 날짜 키는 GA4 원본 형식(YYYYMMDD)으로, TrendPoint.date와 바로 매칭된다.
export async function getHourlyByDateInRange(startDate: string, endDate: string): Promise<Record<string, HourlyPoint[]>> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'date' }, { name: 'hour' }],
    metrics: [{ name: 'activeUsers' }],
    startDate,
    endDate,
  });

  const byDate = new Map<string, Map<number, number>>();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, new Map());
    byDate.get(row.date)!.set(Number(row.hour), toNum(row.activeUsers));
  }

  const result: Record<string, HourlyPoint[]> = {};
  for (const [date, hourMap] of byDate) {
    result[date] = Array.from({ length: 24 }, (_, hour) => ({ hour, users: hourMap.get(hour) ?? 0 }));
  }
  return result;
}

// ---------- 3 & 4. 배너 / 팝업 성과 ----------

export interface EventIdRow {
  name: string;
  view: Metric;
  click: Metric;
  ctr: Metric;
}

async function fetchEventIdCounts(
  property: 'marketing',
  idDimension: string,
  eventName: string,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const rows = await runReport({
    property,
    dimensions: [{ name: idDimension }],
    metrics: [{ name: 'eventCount' }],
    startDate,
    endDate,
    dimensionFilter: eventNameFilter(eventName),
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row[idDimension], toNum(row.eventCount));
  }
  return map;
}

async function getIdBasedRows(
  idDimension: string,
  viewEvent: string,
  clickEvent: string,
  period: Period
): Promise<EventIdRow[]> {
  const [viewCurr, clickCurr, viewPrev, clickPrev] = await Promise.all([
    fetchEventIdCounts('marketing', idDimension, viewEvent, period.startDate, period.endDate),
    fetchEventIdCounts('marketing', idDimension, clickEvent, period.startDate, period.endDate),
    fetchEventIdCounts('marketing', idDimension, viewEvent, period.compareStartDate, period.compareEndDate),
    fetchEventIdCounts('marketing', idDimension, clickEvent, period.compareStartDate, period.compareEndDate),
  ]);

  const names = new Set([...viewCurr.keys(), ...clickCurr.keys()]);
  const rows: EventIdRow[] = [];
  for (const name of names) {
    const view = viewCurr.get(name) ?? 0;
    const click = clickCurr.get(name) ?? 0;
    const ctrCurr = view > 0 ? (click / view) * 100 : 0;
    const viewP = viewPrev.get(name);
    const clickP = clickPrev.get(name);
    const ctrPrev = viewP !== undefined && viewP > 0 ? (clickP ?? 0) / viewP * 100 : undefined;
    rows.push({
      name,
      view: metricFrom(view, viewP),
      click: metricFrom(click, clickP),
      ctr: metricFrom(ctrCurr, ctrPrev),
    });
  }
  return rows.sort((a, b) => b.view.value - a.view.value);
}

export function getBanners(period: Period): Promise<EventIdRow[]> {
  return getIdBasedRows('customEvent:banner_id', 'banner_view', 'banner_click', period);
}

export function getPopups(period: Period): Promise<EventIdRow[]> {
  return getIdBasedRows('customEvent:popup_id', 'popup_view', 'popup_click', period);
}

// ---------- 5. 입점 제휴 업체 성과 ----------

export interface PartnerRow {
  name: string;
  view: number;
  call: Metric;
  kakao: Metric;
  use: Metric;
}

const SERVICE_PATH = '/service/';
const PARTNER_EVENTS = {
  call: 'click-contact_call-button',
  kakao: 'click-contact_kakao-button',
  use: 'click-contact_use-button',
} as const;

// /service/ 경로에 걸리지만 실제 제휴사 입점 페이지가 아닌 pageTitle(브랜드 피드, 메인 등)은 집계에서 제외한다.
const EXCLUDED_PARTNER_TITLES = new Set(['브랜드 피드 상세', '브랜드 피드', '비벗(b-bud)']);

async function fetchPartnerViews(startDate: string, endDate: string): Promise<Map<string, number>> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    startDate,
    endDate,
    dimensionFilter: pathContainsFilter(SERVICE_PATH),
  });
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.pageTitle, toNum(row.screenPageViews));
  return map;
}

async function fetchPartnerClicks(eventName: string, startDate: string, endDate: string): Promise<Map<string, number>> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'pageTitle' }],
    metrics: [{ name: 'eventCount' }],
    startDate,
    endDate,
    dimensionFilter: andFilter(eventNameFilter(eventName), pathContainsFilter(SERVICE_PATH)),
  });
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.pageTitle, toNum(row.eventCount));
  return map;
}

export async function getPartners(period: Period): Promise<PartnerRow[]> {
  const [views, callCurr, kakaoCurr, useCurr, callPrev, kakaoPrev, usePrev] = await Promise.all([
    fetchPartnerViews(period.startDate, period.endDate),
    fetchPartnerClicks(PARTNER_EVENTS.call, period.startDate, period.endDate),
    fetchPartnerClicks(PARTNER_EVENTS.kakao, period.startDate, period.endDate),
    fetchPartnerClicks(PARTNER_EVENTS.use, period.startDate, period.endDate),
    fetchPartnerClicks(PARTNER_EVENTS.call, period.compareStartDate, period.compareEndDate),
    fetchPartnerClicks(PARTNER_EVENTS.kakao, period.compareStartDate, period.compareEndDate),
    fetchPartnerClicks(PARTNER_EVENTS.use, period.compareStartDate, period.compareEndDate),
  ]);

  const names = new Set([...views.keys(), ...callCurr.keys(), ...kakaoCurr.keys(), ...useCurr.keys()]);
  const rows: PartnerRow[] = [];
  for (const name of names) {
    if (EXCLUDED_PARTNER_TITLES.has(name)) continue;
    rows.push({
      name,
      view: views.get(name) ?? 0,
      call: metricFrom(callCurr.get(name) ?? 0, callPrev.get(name)),
      kakao: metricFrom(kakaoCurr.get(name) ?? 0, kakaoPrev.get(name)),
      use: metricFrom(useCurr.get(name) ?? 0, usePrev.get(name)),
    });
  }
  return rows.sort((a, b) => b.view - a.view);
}

// ---------- 제휴사 현황 (지표별 이벤트 수 / 활성 사용자 수 구분) ----------

export interface PartnerStatusRow {
  name: string;
  viewEvent: number;
  viewUsers: number;
  callEvent: number;
  callUsers: number;
  kakaoEvent: number;
  kakaoUsers: number;
  useEvent: number;
  useUsers: number;
}

async function fetchPartnerMetricPair(
  eventMetric: string,
  dimensionFilter: DimensionFilter,
  startDate: string,
  endDate: string
): Promise<Map<string, { event: number; users: number }>> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'pageTitle' }],
    metrics: [{ name: eventMetric }, { name: 'activeUsers' }],
    startDate,
    endDate,
    dimensionFilter,
  });
  const map = new Map<string, { event: number; users: number }>();
  for (const row of rows) {
    map.set(row.pageTitle, { event: toNum(row[eventMetric]), users: toNum(row.activeUsers) });
  }
  return map;
}

export async function getPartnerStatusRows(period: Period): Promise<PartnerStatusRow[]> {
  const [view, call, kakao, use] = await Promise.all([
    fetchPartnerMetricPair('screenPageViews', pathContainsFilter(SERVICE_PATH), period.startDate, period.endDate),
    fetchPartnerMetricPair(
      'eventCount',
      andFilter(eventNameFilter(PARTNER_EVENTS.call), pathContainsFilter(SERVICE_PATH)),
      period.startDate,
      period.endDate
    ),
    fetchPartnerMetricPair(
      'eventCount',
      andFilter(eventNameFilter(PARTNER_EVENTS.kakao), pathContainsFilter(SERVICE_PATH)),
      period.startDate,
      period.endDate
    ),
    fetchPartnerMetricPair(
      'eventCount',
      andFilter(eventNameFilter(PARTNER_EVENTS.use), pathContainsFilter(SERVICE_PATH)),
      period.startDate,
      period.endDate
    ),
  ]);

  const names = new Set([...view.keys(), ...call.keys(), ...kakao.keys(), ...use.keys()]);
  const rows: PartnerStatusRow[] = [];
  for (const name of names) {
    if (EXCLUDED_PARTNER_TITLES.has(name)) continue;
    rows.push({
      name,
      viewEvent: view.get(name)?.event ?? 0,
      viewUsers: view.get(name)?.users ?? 0,
      callEvent: call.get(name)?.event ?? 0,
      callUsers: call.get(name)?.users ?? 0,
      kakaoEvent: kakao.get(name)?.event ?? 0,
      kakaoUsers: kakao.get(name)?.users ?? 0,
      useEvent: use.get(name)?.event ?? 0,
      useUsers: use.get(name)?.users ?? 0,
    });
  }
  return rows.sort((a, b) => b.viewEvent - a.viewEvent);
}

// ---------- 6. 인기 페이지 Top N ----------

export interface TopPageRow {
  name: string;
  view: number;
}

const TOP_PAGES_LIMIT = 100;

export async function getTopPages(period: Period): Promise<TopPageRow[]> {
  const rows = await runReport({
    property: 'web',
    dimensions: [{ name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    startDate: period.startDate,
    endDate: period.endDate,
  });
  return rows
    .map((row) => ({ name: row.pageTitle, view: toNum(row.screenPageViews) }))
    .sort((a, b) => b.view - a.view)
    .slice(0, TOP_PAGES_LIMIT);
}

// ---------- 배너 광고 (구좌별 성과) ----------

export interface SimpleIdRow {
  name: string;
  viewEvent: number;
  viewUsers: number;
  clickEvent: number;
  clickUsers: number;
  ctr: number;
}

async function fetchEventIdMetricPair(
  idDimension: string,
  eventName: string,
  startDate: string,
  endDate: string
): Promise<Map<string, { event: number; users: number }>> {
  const rows = await runReport({
    property: 'marketing',
    dimensions: [{ name: idDimension }],
    metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
    startDate,
    endDate,
    dimensionFilter: eventNameFilter(eventName),
  });
  const map = new Map<string, { event: number; users: number }>();
  for (const row of rows) {
    map.set(row[idDimension], { event: toNum(row.eventCount), users: toNum(row.activeUsers) });
  }
  return map;
}

async function getSimpleIdRows(
  idDimension: string,
  viewEvent: string,
  clickEvent: string,
  startDate: string,
  endDate: string
): Promise<SimpleIdRow[]> {
  const [viewCounts, clickCounts] = await Promise.all([
    fetchEventIdMetricPair(idDimension, viewEvent, startDate, endDate),
    fetchEventIdMetricPair(idDimension, clickEvent, startDate, endDate),
  ]);
  const names = new Set([...viewCounts.keys(), ...clickCounts.keys()]);
  const rows: SimpleIdRow[] = [];
  for (const name of names) {
    const viewEventCount = viewCounts.get(name)?.event ?? 0;
    const clickEventCount = clickCounts.get(name)?.event ?? 0;
    rows.push({
      name,
      viewEvent: viewEventCount,
      viewUsers: viewCounts.get(name)?.users ?? 0,
      clickEvent: clickEventCount,
      clickUsers: clickCounts.get(name)?.users ?? 0,
      ctr: viewEventCount > 0 ? (clickEventCount / viewEventCount) * 100 : 0,
    });
  }
  return rows.sort((a, b) => b.viewEvent - a.viewEvent);
}

export interface PlacementAgg {
  name: string;
  viewEvent: number;
  viewUsers: number;
  clickEvent: number;
  clickUsers: number;
  ctr: number;
}

export interface BannerAdsData {
  placementAgg: PlacementAgg[];
  bannerAdsByPlacement: Record<string, SimpleIdRow[]>;
}

export async function getBannerAdsData(period: Period): Promise<BannerAdsData> {
  const rows = await getSimpleIdRows('customEvent:banner_id', 'banner_view', 'banner_click', period.startDate, period.endDate);

  const bannerAdsByPlacement: Record<string, SimpleIdRow[]> = {};
  for (const placement of PLACEMENT_KEYWORDS) bannerAdsByPlacement[placement] = [];
  for (const row of rows) {
    const placement = classifyPlacement(row.name);
    if (placement === UNCLASSIFIED_PLACEMENT) continue; // 어떤 구좌 키워드에도 매칭되지 않는 배너는 이 화면에서 제외한다.
    bannerAdsByPlacement[placement].push(row);
  }
  for (const placement of PLACEMENT_KEYWORDS) {
    bannerAdsByPlacement[placement].sort((a, b) => b.viewEvent - a.viewEvent);
  }

  // 구좌 내 여러 배너의 활성 사용자 수를 단순 합산하므로, 같은 구좌의 배너를 여러 개 본 유저는 중복 집계될 수 있다.
  const placementAgg: PlacementAgg[] = PLACEMENT_KEYWORDS.map((name) => {
    const group = bannerAdsByPlacement[name];
    const viewEvent = group.reduce((a, r) => a + r.viewEvent, 0);
    const viewUsers = group.reduce((a, r) => a + r.viewUsers, 0);
    const clickEvent = group.reduce((a, r) => a + r.clickEvent, 0);
    const clickUsers = group.reduce((a, r) => a + r.clickUsers, 0);
    return { name, viewEvent, viewUsers, clickEvent, clickUsers, ctr: viewEvent > 0 ? (clickEvent / viewEvent) * 100 : 0 };
  }).sort((a, b) => b.viewEvent - a.viewEvent);

  return { placementAgg, bannerAdsByPlacement };
}

export function getPopupAdsData(period: Period): Promise<SimpleIdRow[]> {
  return getSimpleIdRows('customEvent:popup_id', 'popup_view', 'popup_click', period.startDate, period.endDate);
}

// ---------- 게시 기간 (선택된 조회 기간 내에서 실제 이벤트가 발생한 최초~최근 날짜) ----------

export interface ActivePeriod {
  startDate: string;
  endDate: string;
  days: number;
}

export async function getActivePeriods(
  idDimension: string,
  viewEvent: string,
  clickEvent: string,
  startDate: string,
  endDate: string
): Promise<Map<string, ActivePeriod>> {
  const rows = await runReport({
    property: 'marketing',
    dimensions: [{ name: idDimension }, { name: 'date' }],
    metrics: [{ name: 'eventCount' }],
    startDate,
    endDate,
    dimensionFilter: orFilter(eventNameFilter(viewEvent), eventNameFilter(clickEvent)),
  });

  const minMax = new Map<string, { min: string; max: string }>();
  for (const row of rows) {
    const id = row[idDimension];
    const date = row.date;
    const existing = minMax.get(id);
    if (!existing) minMax.set(id, { min: date, max: date });
    else {
      if (date < existing.min) existing.min = date;
      if (date > existing.max) existing.max = date;
    }
  }

  const toISO = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  const result = new Map<string, ActivePeriod>();
  for (const [id, { min, max }] of minMax) {
    const isoStart = toISO(min);
    const isoEnd = toISO(max);
    const days = Math.round((new Date(isoEnd).getTime() - new Date(isoStart).getTime()) / 86400000) + 1;
    result.set(id, { startDate: isoStart, endDate: isoEnd, days });
  }
  return result;
}

export interface AdRow extends SimpleIdRow {
  period: ActivePeriod | null;
}

// ---------- 푸시 알림 ----------

export interface PushTrendPoint {
  date: string;
  label: string;
  receive: number;
  open: number;
  rate: number;
}

export async function getPushTrend(period: Period): Promise<PushTrendPoint[]> {
  const rows = await runReport({
    property: 'marketing',
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    startDate: period.startDate,
    endDate: period.endDate,
    dimensionFilter: orFilter(eventNameFilter('notification_receive'), eventNameFilter('notification_open')),
  });

  const byDate = new Map<string, { receive: number; open: number }>();
  for (const row of rows) {
    const date = row.date;
    if (!byDate.has(date)) byDate.set(date, { receive: 0, open: 0 });
    const entry = byDate.get(date)!;
    if (row.eventName === 'notification_receive') entry.receive += toNum(row.eventCount);
    else if (row.eventName === 'notification_open') entry.open += toNum(row.eventCount);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      label: formatDateLabel(date),
      receive: v.receive,
      open: v.open,
      rate: v.receive > 0 ? (v.open / v.receive) * 100 : 0,
    }));
}

export interface PushSentRow {
  sentAt: string;
  content: string;
  utmCampaign: string;
  views: number | null;
  users: number | null;
}

// 노션의 utm_campaign 값이 GA4 "페이지 위치"(pageLocation, 쿼리 파라미터 포함 전체 URL)에 포함되어 있으면
// 같은 푸시로 간주하고, 그 조건에 해당하는 조회수/활성사용자수를 붙인다.
// (참고: activeUsers는 여러 행을 합산하면 동일 유저가 중복 집계될 수 있어, 푸시별로 GA4에 직접 필터링해서
// 정확히 집계된 값을 받아온다 — 클라이언트에서 합산하지 않는다.)
async function fetchPushMatch(utmCampaign: string, startDate: string, endDate: string): Promise<{ views: number; users: number } | null> {
  const rows = await runReport({
    property: 'web',
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    startDate,
    endDate,
    dimensionFilter: containsFilter('pageLocation', utmCampaign),
  });
  const row = rows[0];
  if (!row || toNum(row.screenPageViews) === 0) return null;
  return { views: toNum(row.screenPageViews), users: toNum(row.activeUsers) };
}

export async function getPushSentList(period: Period): Promise<PushSentRow[]> {
  const records = await fetchPushSentHistory();
  const inRange = records.filter(
    (r) => r.sentDate !== null && r.sentDate >= period.startDate && r.sentDate <= period.endDate
  );
  if (inRange.length === 0) return [];

  const results = await Promise.all(
    inRange.map(async (r) => {
      const match = await fetchPushMatch(r.utmCampaign, period.startDate, period.endDate);
      return {
        sentAt: r.sentAt,
        content: r.content,
        utmCampaign: r.utmCampaign,
        views: match ? match.views : null,
        users: match ? match.users : null,
      };
    })
  );

  return results.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
}

// ---------- 콘텐츠 현황 (발행일 기준 콘텐츠 성과) ----------

// 1차: 최근 활동을 확인하는 기본 조회 창(일 단위). 대부분의 콘텐츠는 이 범위 안에서 정확한
// 최초 노출일까지 잡힌다.
const CONTENT_LOOKBACK_DAYS = 90;
// 2차: 1차 구간 이전에도 조회 이력이 있었는지 훨씬 넓게(최대 3년) 확인한다. 콘텐츠가 한동안
// 조회가 없다가 1차 구간 중간에 다시 조회되면 그 중간 날짜를 최초 노출일로 오인할 수 있어서,
// 특정 날짜에 걸렸는지 여부와 무관하게 모든 콘텐츠에 대해 확인한다. 단, 월 단위로 조회해
// (일 단위로 3년을 통째로 조회하면 콘텐츠당 행 수가 너무 많아진다) 비용을 낮춘다.
const CONTENT_DEEP_LOOKBACK_DAYS = 1095;

export interface ContentScrollFunnel {
  p25: number;
  p50: number;
  p75: number;
  p100: number;
}

export interface ContentItem {
  pageTitle: string; // GA4 원본 pageTitle. 발행일 수기 수정 시 식별자로 쓰인다.
  category: string;
  title: string;
  publishDate: string; // YYYY-MM-DD. GA4상 해당 pageTitle이 처음 조회된 날짜
  isUnknownDate: boolean; // true면 publishDate가 lookback 시작일과 같아, 실제보다 늦게 잡혔을 수 있음
  viewEvent: number;
  viewUsers: number;
  avgSessionSeconds: number;
  scrollFunnel: ContentScrollFunnel;
}

export async function getContentItems(period: Period): Promise<ContentItem[]> {
  const lookbackStart = addDays(period.startDate, -CONTENT_LOOKBACK_DAYS);
  const lookbackEnd = period.endDate;
  const categoryFilter = orFilter(...CONTENT_CATEGORIES.map((c) => beginsWithFilter('pageTitle', c.prefix)));

  const [dateRows, metricRows, scrollRows] = await Promise.all([
    runReport({
      property: 'web',
      dimensions: [{ name: 'pageTitle' }, { name: 'date' }],
      metrics: [{ name: 'screenPageViews' }],
      startDate: lookbackStart,
      endDate: lookbackEnd,
      dimensionFilter: categoryFilter,
    }),
    runReport({
      property: 'web',
      dimensions: [{ name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }],
      startDate: lookbackStart,
      endDate: lookbackEnd,
      dimensionFilter: categoryFilter,
    }),
    runReport({
      property: 'web',
      dimensions: [{ name: 'pageTitle' }, { name: 'customEvent:scroll_depth' }],
      metrics: [{ name: 'eventCount' }],
      startDate: lookbackStart,
      endDate: lookbackEnd,
      dimensionFilter: andFilter(eventNameFilter('custom_scroll_depth'), categoryFilter),
    }),
  ]);

  const minDateByTitle = new Map<string, string>();
  for (const row of dateRows) {
    const existing = minDateByTitle.get(row.pageTitle);
    if (!existing || row.date < existing) minDateByTitle.set(row.pageTitle, row.date);
  }

  // 2차: 1차 구간(lookbackStart) 이전, 최대 3년 전까지 월 단위로 조회 이력이 있는지 확인한다.
  const deepLookbackStart = addDays(period.startDate, -CONTENT_DEEP_LOOKBACK_DAYS);
  const monthRows = await runReport({
    property: 'web',
    dimensions: [{ name: 'pageTitle' }, { name: 'yearMonth' }],
    metrics: [{ name: 'screenPageViews' }],
    startDate: deepLookbackStart,
    endDate: lookbackStart,
    dimensionFilter: categoryFilter,
  });

  const minMonthByTitle = new Map<string, string>();
  for (const row of monthRows) {
    const existing = minMonthByTitle.get(row.pageTitle);
    if (!existing || row.yearMonth < existing) minMonthByTitle.set(row.pageTitle, row.yearMonth);
  }

  // 3차: 2차에서 1차 구간보다 이른 달에 조회 이력이 발견된 타이틀만, 그 달들을 포함하는
  // 범위로 다시 일 단위 조회해 정확한 날짜를 찾는다(해당 타이틀만 걸러서 조회하므로
  // 범위를 넓게 잡아도 비용이 크지 않다).
  const titlesWithOlderHistory = [...minMonthByTitle.keys()];
  const deepLookbackStartYmd = deepLookbackStart.replace(/-/g, '');

  if (titlesWithOlderHistory.length > 0) {
    const earliestMonth = [...minMonthByTitle.values()].sort()[0];
    const refineStart = `${earliestMonth.slice(0, 4)}-${earliestMonth.slice(4, 6)}-01`;
    const refineRows = await runReport({
      property: 'web',
      dimensions: [{ name: 'pageTitle' }, { name: 'date' }],
      metrics: [{ name: 'screenPageViews' }],
      startDate: refineStart,
      endDate: lookbackStart,
      dimensionFilter: inListFilter('pageTitle', titlesWithOlderHistory),
    });
    for (const row of refineRows) {
      const existing = minDateByTitle.get(row.pageTitle);
      if (!existing || row.date < existing) minDateByTitle.set(row.pageTitle, row.date);
    }
  }

  const scrollByTitle = new Map<string, ContentScrollFunnel>();
  for (const row of scrollRows) {
    const entry = scrollByTitle.get(row.pageTitle) ?? { p25: 0, p50: 0, p75: 0, p100: 0 };
    const count = toNum(row.eventCount);
    const pct = row['customEvent:scroll_depth'];
    if (pct === '25') entry.p25 = count;
    else if (pct === '50') entry.p50 = count;
    else if (pct === '75') entry.p75 = count;
    else if (pct === '100') entry.p100 = count;
    scrollByTitle.set(row.pageTitle, entry);
  }

  const items: ContentItem[] = [];
  for (const row of metricRows) {
    const category = CONTENT_CATEGORIES.find((c) => row.pageTitle.startsWith(c.prefix));
    if (!category) continue;
    const rawDate = minDateByTitle.get(row.pageTitle);
    if (!rawDate) continue;
    // 월 단위 정밀 재조회까지 거쳤는데도(최대 3년) 그 조회 범위의 첫 달에 여전히 걸려 있으면
    // 그 이전 이력이 더 있을 수 있다는 뜻이므로 그때만 발행일을 불확실한 것으로 본다.
    const earliestMonth = minMonthByTitle.get(row.pageTitle);
    const isUnknownDate = earliestMonth !== undefined && earliestMonth === deepLookbackStartYmd.slice(0, 6);
    items.push({
      pageTitle: row.pageTitle,
      category: category.label,
      title: row.pageTitle.slice(category.prefix.length).trim(),
      publishDate: `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`,
      isUnknownDate,
      viewEvent: toNum(row.screenPageViews),
      viewUsers: toNum(row.activeUsers),
      avgSessionSeconds: toNum(row.averageSessionDuration),
      scrollFunnel: scrollByTitle.get(row.pageTitle) ?? { p25: 0, p50: 0, p75: 0, p100: 0 },
    });
  }

  return items;
}

// 수기로 지정한 발행일이 있으면 GA4 추정치보다 우선하고, 삭제(숨김) 처리된 콘텐츠는 제외한다.
// content-status/ai-analysis 라우트에서 공통으로 쓴다.
export function applyContentOverrides(
  items: ContentItem[],
  overrides: Record<string, string>,
  excluded: Set<string>
): ContentItem[] {
  return items
    .filter((it) => !excluded.has(it.pageTitle))
    .map((it) => {
      const override = overrides[it.pageTitle];
      if (!override) return it;
      return { ...it, publishDate: override, isUnknownDate: false };
    });
}
