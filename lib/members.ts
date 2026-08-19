import * as XLSX from 'xlsx';
import { put, list } from '@vercel/blob';

const REQUIRED_COLUMNS = [
  '유저아이디',
  '유저닉네임',
  '가입일',
  '스토어명',
  '온오프라인',
  '창업아이템',
  '창업계획서최초작성일자',
  '사업상태',
] as const;

const WITHDRAWN_NICKNAME = '(알 수 없는 사용자)';
const SNAPSHOT_BLOB_PATH = 'member-status.json';

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

interface RawRow {
  [key: string]: unknown;
}

export interface RatioItem {
  label: string;
  count: number;
  pct: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  signups: number;
  writers: number;
}

export interface StatusPlanRow {
  label: string;
  members: number;
  plans: number;
}

export interface MemberMetrics {
  totalMembers: number;
  withdrawnMembers: number;
  planWriters: number;
  planWriteRate: number;
  planCount: number;
  onlineCount: number;
  offlineCount: number;
  onOffRatio: RatioItem[];
  onlineItemRatio: RatioItem[];
  offlineItemRatio: RatioItem[];
  statusRatio: RatioItem[];
  statusDenominator: number;
  statusPlanRows: StatusPlanRow[];
  dailyTrend: DailyPoint[];
}

export interface MemberSnapshot {
  uploadedAt: string;
  fileName: string;
  metrics: MemberMetrics;
}

export class ColumnValidationError extends Error {
  missingColumns: string[];
  constructor(missingColumns: string[]) {
    super(`필수 컬럼이 없어요: ${missingColumns.join(', ')}`);
    this.missingColumns = missingColumns;
  }
}

function validateColumns(rows: RawRow[]) {
  const present = new Set(rows.length > 0 ? Object.keys(rows[0]) : []);
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));
  if (missing.length > 0) throw new ColumnValidationError(missing);
}

function toDateOnly(v: unknown): string | null {
  if (isBlank(v)) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function ratioFromCounts(counts: Map<string, number>): RatioItem[] {
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function parseWorkbook(buffer: Buffer): MemberMetrics {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  validateColumns(rows);

  // 회원 식별: 유저아이디 기준. 닉네임은 탈퇴 여부 플래그로만 사용한다.
  // (탈퇴 회원은 전부 닉네임이 동일한 플레이스홀더로 치환되어 있어 닉네임으로 dedup하면 안 된다.)
  const withdrawnByUser = new Map<string, boolean>();
  for (const row of rows) {
    const uid = String(row['유저아이디']);
    if (row['유저닉네임'] === WITHDRAWN_NICKNAME) withdrawnByUser.set(uid, true);
    else if (!withdrawnByUser.has(uid)) withdrawnByUser.set(uid, false);
  }
  const totalMembers = withdrawnByUser.size;
  const withdrawnMembers = Array.from(withdrawnByUser.values()).filter(Boolean).length;

  // 사업상태는 회원(유저아이디) 단위 속성이므로, 여러 스토어를 등록한 회원이 중복 집계되지 않도록 유저 기준으로 먼저 정리한다.
  const statusByUser = new Map<string, string>();
  for (const row of rows) {
    const uid = String(row['유저아이디']);
    const status = row['사업상태'];
    if (!isBlank(status) && !statusByUser.has(uid)) statusByUser.set(uid, String(status));
  }

  // 창업계획서(스토어) 행: 스토어명이 채워진 행 = 작성 건수
  const planRows = rows.filter((r) => !isBlank(r['스토어명']));
  const planCount = planRows.length;
  const planWriters = new Set(planRows.map((r) => String(r['유저아이디']))).size;
  const planWriteRate = totalMembers > 0 ? Math.round((planWriters / totalMembers) * 1000) / 10 : 0;

  const onOffCounts = new Map<string, number>();
  const onlineItemCounts = new Map<string, number>();
  const offlineItemCounts = new Map<string, number>();
  for (const row of planRows) {
    const onoff = row['온오프라인'];
    const item = isBlank(row['창업아이템']) ? '미입력' : String(row['창업아이템']);
    if (onoff === 'ONLINE') {
      onOffCounts.set('온라인', (onOffCounts.get('온라인') ?? 0) + 1);
      onlineItemCounts.set(item, (onlineItemCounts.get(item) ?? 0) + 1);
    } else if (onoff === 'OFFLINE') {
      onOffCounts.set('오프라인', (onOffCounts.get('오프라인') ?? 0) + 1);
      offlineItemCounts.set(item, (offlineItemCounts.get(item) ?? 0) + 1);
    }
  }
  const onlineCount = onOffCounts.get('온라인') ?? 0;
  const offlineCount = onOffCounts.get('오프라인') ?? 0;

  // 사업상태 비율: 값이 입력된 회원 수를 분모로 함
  const statusCounts = new Map<string, number>();
  for (const status of statusByUser.values()) {
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  const statusDenominator = statusByUser.size;

  // 사업상태별 창업계획서 수: 각 상태를 가진 회원들이 작성한 스토어(창업계획서) 총 건수
  const statusPlanCounts = new Map<string, number>();
  for (const row of planRows) {
    const uid = String(row['유저아이디']);
    const status = statusByUser.get(uid);
    if (status) statusPlanCounts.set(status, (statusPlanCounts.get(status) ?? 0) + 1);
  }
  const statusPlanRows: StatusPlanRow[] = Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, members]) => ({ label, members, plans: statusPlanCounts.get(label) ?? 0 }));

  // 일별 작성자 수: 가입일 기준 최근 7일(데이터 내 최신 가입일 기준)
  const signupDates = rows.map((r) => toDateOnly(r['가입일'])).filter((d): d is string => d !== null);
  const maxDate = signupDates.length > 0 ? signupDates.sort().at(-1)! : null;

  const dailyTrend: DailyPoint[] = [];
  if (maxDate) {
    const signupByDate = new Map<string, number>();
    for (const d of signupDates) signupByDate.set(d, (signupByDate.get(d) ?? 0) + 1);

    const writerByDate = new Map<string, number>();
    for (const row of planRows) {
      const d = toDateOnly(row['창업계획서최초작성일자']);
      if (d) writerByDate.set(d, (writerByDate.get(d) ?? 0) + 1);
    }

    const end = new Date(`${maxDate}T00:00:00Z`);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setUTCDate(end.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      dailyTrend.push({
        date: iso,
        label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
        signups: signupByDate.get(iso) ?? 0,
        writers: writerByDate.get(iso) ?? 0,
      });
    }
  }

  return {
    totalMembers,
    withdrawnMembers,
    planWriters,
    planWriteRate,
    planCount,
    onlineCount,
    offlineCount,
    onOffRatio: ratioFromCounts(onOffCounts),
    onlineItemRatio: ratioFromCounts(onlineItemCounts),
    offlineItemRatio: ratioFromCounts(offlineItemCounts),
    statusRatio: ratioFromCounts(statusCounts),
    statusDenominator,
    statusPlanRows,
    dailyTrend,
  };
}

export async function saveSnapshot(snapshot: MemberSnapshot): Promise<void> {
  await put(SNAPSHOT_BLOB_PATH, JSON.stringify(snapshot), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

export async function loadSnapshot(): Promise<MemberSnapshot | null> {
  try {
    const { blobs } = await list({ prefix: SNAPSHOT_BLOB_PATH, limit: 1 });
    const blob = blobs.find((b) => b.pathname === SNAPSHOT_BLOB_PATH);
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as MemberSnapshot;
  } catch {
    return null;
  }
}
