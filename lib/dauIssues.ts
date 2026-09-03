// DAU 팝업의 "이 날의 이슈" 메모: 날짜(YYYY-MM-DD) -> 메모 텍스트 목록(하루에 여러 건 가능).
import { put, get } from '@vercel/blob';

const ISSUES_BLOB_PATH = 'dau-issues.json';

export type DauIssues = Record<string, string[]>;

export async function loadDauIssues(): Promise<DauIssues> {
  try {
    const result = await get(ISSUES_BLOB_PATH, { access: 'private', useCache: false });
    if (!result || !result.stream) return {};
    const text = await new Response(result.stream).text();
    const raw = JSON.parse(text) as Record<string, string | string[]>;
    // 이전 버전은 날짜당 문자열 메모 하나만 저장했다. 그 형식이 남아있어도 깨지지 않도록
    // 읽을 때 항상 배열로 정규화한다(다시 저장되는 순간부터는 새 형식으로 굳어진다).
    const normalized: DauIssues = {};
    for (const [date, value] of Object.entries(raw)) {
      normalized[date] = Array.isArray(value) ? value : [value];
    }
    return normalized;
  } catch {
    return {};
  }
}

async function persist(issues: DauIssues): Promise<void> {
  await put(ISSUES_BLOB_PATH, JSON.stringify(issues), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

export async function addDauIssue(date: string, note: string): Promise<DauIssues> {
  const trimmed = note.trim();
  if (!trimmed) return loadDauIssues();
  const issues = await loadDauIssues();
  const list = issues[date] ?? [];
  issues[date] = [...list, trimmed];
  await persist(issues);
  return issues;
}

export async function removeDauIssue(date: string, index: number): Promise<DauIssues> {
  const issues = await loadDauIssues();
  const list = issues[date] ?? [];
  const next = list.filter((_, i) => i !== index);
  if (next.length > 0) issues[date] = next;
  else delete issues[date];
  await persist(issues);
  return issues;
}
