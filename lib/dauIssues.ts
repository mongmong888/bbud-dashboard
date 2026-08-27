// DAU 팝업의 "이 날의 이슈" 메모: 날짜(YYYYMMDD, GA4 date 형식) -> 메모 텍스트.
import { put, get } from '@vercel/blob';

const ISSUES_BLOB_PATH = 'dau-issues.json';

export type DauIssues = Record<string, string>;

export async function loadDauIssues(): Promise<DauIssues> {
  try {
    const result = await get(ISSUES_BLOB_PATH, { access: 'private', useCache: false });
    if (!result || !result.stream) return {};
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as DauIssues;
  } catch {
    return {};
  }
}

export async function saveDauIssue(date: string, note: string): Promise<DauIssues> {
  const issues = await loadDauIssues();
  if (note.trim()) {
    issues[date] = note.trim();
  } else {
    delete issues[date];
  }
  await put(ISSUES_BLOB_PATH, JSON.stringify(issues), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
  return issues;
}
