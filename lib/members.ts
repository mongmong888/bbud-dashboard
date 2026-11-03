// 회원 현황 스냅샷 저장/조회(Vercel Blob). 엑셀 파싱은 브라우저에서 하므로 lib/memberParser.ts에 있다.
import { put, get } from '@vercel/blob';
import type { MemberMetrics } from './memberParser';

export type { RatioItem, DailyPoint, StatusPlanRow, MemberMetrics } from './memberParser';

const SNAPSHOT_BLOB_PATH = 'member-status.json';

export interface MemberSnapshot {
  uploadedAt: string;
  fileName: string;
  metrics: MemberMetrics;
}

export async function saveSnapshot(snapshot: MemberSnapshot): Promise<void> {
  await put(SNAPSHOT_BLOB_PATH, JSON.stringify(snapshot), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

export async function loadSnapshot(): Promise<MemberSnapshot | null> {
  try {
    const result = await get(SNAPSHOT_BLOB_PATH, { access: 'private', useCache: false });
    if (!result || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as MemberSnapshot;
  } catch {
    return null;
  }
}
