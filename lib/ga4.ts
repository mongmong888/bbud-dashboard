import { google, analyticsdata_v1beta } from 'googleapis';

type Property = 'web' | 'marketing';

function propertyId(property: Property): string {
  const id = property === 'web' ? process.env.GA4_WEB_PROPERTY_ID : process.env.GA4_MARKETING_PROPERTY_ID;
  if (!id) throw new Error(`GA4_${property.toUpperCase()}_PROPERTY_ID 환경변수가 설정되지 않았습니다.`);
  return id;
}

let authClient: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAuth() {
  if (!authClient) {
    const scopes = ['https://www.googleapis.com/auth/analytics.readonly'];
    // Vercel 등 서버리스 배포 환경은 로컬 파일 경로에 접근할 수 없으므로,
    // 서비스 계정 키 JSON 전체를 담은 환경변수가 있으면 그걸 우선 사용한다(로컬 개발 시에는 keyFile 경로로 동작).
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (keyJson) {
      authClient = new google.auth.GoogleAuth({ credentials: JSON.parse(keyJson), scopes });
    } else {
      const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH;
      if (!keyFile) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 또는 GOOGLE_APPLICATION_CREDENTIALS_PATH 환경변수가 설정되지 않았습니다.');
      }
      authClient = new google.auth.GoogleAuth({ keyFile, scopes });
    }
  }
  return authClient;
}

export interface Dimension {
  name: string;
}
export interface Metric {
  name: string;
}
export type DimensionFilter = analyticsdata_v1beta.Schema$FilterExpression;

export interface RunReportInput {
  property: Property;
  dimensions?: Dimension[];
  metrics: Metric[];
  startDate: string;
  endDate: string;
  dimensionFilter?: DimensionFilter;
  limit?: number;
}

export type GA4Row = Record<string, string>;

export async function runReport(input: RunReportInput): Promise<GA4Row[]> {
  const auth = getAuth();
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

  const response = await analyticsData.properties.runReport({
    property: `properties/${propertyId(input.property)}`,
    requestBody: {
      dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
      dimensions: input.dimensions?.map((d) => ({ name: d.name })),
      metrics: input.metrics.map((m) => ({ name: m.name })),
      dimensionFilter: input.dimensionFilter,
      limit: String(input.limit ?? 100000),
    },
  });

  const rows = response.data.rows ?? [];
  const dimensionHeaders = response.data.dimensionHeaders?.map((h) => h.name ?? '') ?? [];
  const metricHeaders = response.data.metricHeaders?.map((h) => h.name ?? '') ?? [];

  return rows.map((row) => {
    const result: GA4Row = {};
    (row.dimensionValues ?? []).forEach((v, i) => {
      result[dimensionHeaders[i]] = v.value ?? '';
    });
    (row.metricValues ?? []).forEach((v, i) => {
      result[metricHeaders[i]] = v.value ?? '';
    });
    return result;
  });
}

export function eventNameFilter(eventName: string): DimensionFilter {
  return { filter: { fieldName: 'eventName', stringFilter: { value: eventName } } };
}

export function pathContainsFilter(path: string): DimensionFilter {
  return { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: path } } };
}

export function containsFilter(fieldName: string, value: string): DimensionFilter {
  return { filter: { fieldName, stringFilter: { matchType: 'CONTAINS', value } } };
}

export function beginsWithFilter(fieldName: string, value: string): DimensionFilter {
  return { filter: { fieldName, stringFilter: { matchType: 'BEGINS_WITH', value } } };
}

export function andFilter(...filters: DimensionFilter[]): DimensionFilter {
  return { andGroup: { expressions: filters } };
}

export function orFilter(...filters: DimensionFilter[]): DimensionFilter {
  return { orGroup: { expressions: filters } };
}

// ---- Date range helpers ----

const GA4_TIMEZONE = 'Asia/Seoul';

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: GA4_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

// D-1 기준: 오늘 날짜 데이터는 아직 배치로 갱신되지 않았을 수 있어 조회 대상에서 제외한다.
export function getMaxSelectableDate(): string {
  return addDays(fmtDate(new Date()), -1);
}

export type Preset = '7d' | '30d' | '90d' | 'custom';

export interface Period {
  startDate: string;
  endDate: string;
  compareStartDate: string;
  compareEndDate: string;
}

export interface DateRangeError {
  error: string;
}

export function resolvePeriod(
  preset: Preset,
  customStart?: string,
  customEnd?: string
): Period | DateRangeError {
  const maxDate = getMaxSelectableDate();
  let startDate: string;
  let endDate: string = maxDate;

  if (preset === 'custom') {
    if (!customStart || !customEnd) {
      return { error: '시작일과 종료일을 모두 선택해 주세요.' };
    }
    if (customEnd < customStart) {
      return { error: '종료일은 시작일 이후여야 해요.' };
    }
    if (customEnd > maxDate) {
      return { error: `조회 가능한 최신 데이터는 ${maxDate}(D-1)까지예요.` };
    }
    startDate = customStart;
    endDate = customEnd;
  } else {
    const span = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    startDate = addDays(endDate, -(span - 1));
  }

  const spanDays = daysBetween(startDate, endDate);
  const compareEndDate = addDays(startDate, -1);
  const compareStartDate = addDays(compareEndDate, -(spanDays - 1));

  return { startDate, endDate, compareStartDate, compareEndDate };
}

export function isDateRangeError(p: Period | DateRangeError): p is DateRangeError {
  return (p as DateRangeError).error !== undefined;
}
