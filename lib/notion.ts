// 노션 "UTM 링크 생성기" 페이지 안에 있는 "UTM 링크 발송 이력" 표(단순 table 블록, 데이터베이스 아님)에서
// 푸시 발송 이력을 읽어온다. 실제 컬럼: 푸시 발송 일시 / 발송 내용 / utm_campaign / 랜딩 메뉴 / 랜딩 콘텐츠 / 발송자.
const NOTION_API_VERSION = '2022-06-28';

export interface PushSentRecord {
  sentAt: string; // 원본 표시용 문자열, 예: "26-08-15 19:30"
  sentDate: string | null; // YYYY-MM-DD로 정규화한 날짜(필터링용). 파싱 실패 시 null
  content: string;
  utmCampaign: string;
}

export class NotionNotConfiguredError extends Error {}

export function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_API_KEY && process.env.NOTION_PUSH_PAGE_ID);
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  table_row?: { cells: { plain_text: string }[][] };
  [key: string]: unknown;
}

async function notionGet(path: string): Promise<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }> {
  const token = process.env.NOTION_API_KEY;
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`노션 조회 실패 (${res.status}): ${body}`);
  }
  return res.json();
}

async function fetchAllChildren(blockId: string): Promise<NotionBlock[]> {
  const results: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const query = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const json = await notionGet(`/blocks/${blockId}/children${query}`);
    results.push(...json.results);
    cursor = json.has_more ? (json.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results;
}

function cellText(cell: { plain_text: string }[]): string {
  return (cell ?? []).map((t) => t.plain_text).join('').trim();
}

const COLUMN_ALIASES = {
  sentAt: ['푸시 발송 일시', '발송 일시'],
  content: ['발송 내용', '내용'],
  utmCampaign: ['utm_campaign', 'UTM_CAMPAIGN', 'UTM Campaign'],
} as const;

function findColumnIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((h) => aliases.includes(h.trim()));
}

function toIsoDate(sentAt: string): string | null {
  // "26-08-15 19:30" 또는 "26-08-15" 형태의 YY-MM-DD 접두부를 YYYY-MM-DD로 변환한다.
  const m = sentAt.trim().match(/^(\d{2})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, yy, mm, dd] = m;
  return `20${yy}-${mm}-${dd}`;
}

export async function fetchPushSentHistory(): Promise<PushSentRecord[]> {
  const pageId = process.env.NOTION_PUSH_PAGE_ID;
  if (!process.env.NOTION_API_KEY || !pageId) {
    throw new NotionNotConfiguredError('NOTION_API_KEY / NOTION_PUSH_PAGE_ID 환경변수가 설정되지 않았습니다.');
  }

  const pageBlocks = await fetchAllChildren(pageId);
  const tableBlock = pageBlocks.find((b) => b.type === 'table');
  if (!tableBlock) {
    throw new Error('노션 페이지에서 발송 이력 표를 찾지 못했어요.');
  }

  const rowBlocks = await fetchAllChildren(tableBlock.id);
  const tableRows = rowBlocks
    .filter((b) => b.type === 'table_row' && b.table_row)
    .map((b) => b.table_row!.cells.map(cellText));

  if (tableRows.length < 2) return [];

  const headers = tableRows[0];
  const sentAtIdx = findColumnIndex(headers, COLUMN_ALIASES.sentAt);
  const contentIdx = findColumnIndex(headers, COLUMN_ALIASES.content);
  const utmIdx = findColumnIndex(headers, COLUMN_ALIASES.utmCampaign);

  if (sentAtIdx === -1 || utmIdx === -1) {
    throw new Error('노션 표에서 "푸시 발송 일시" 또는 "utm_campaign" 컬럼을 찾지 못했어요.');
  }

  return tableRows
    .slice(1)
    .filter((r) => r[sentAtIdx] && r[utmIdx])
    .map((r) => ({
      sentAt: r[sentAtIdx],
      sentDate: toIsoDate(r[sentAtIdx]),
      content: contentIdx !== -1 ? r[contentIdx] : '',
      utmCampaign: r[utmIdx],
    }));
}
