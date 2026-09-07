// 콘텐츠 발행일 수기 수정: pageTitle(GA4 원본) -> 사용자가 지정한 발행일(YYYY-MM-DD).
// GA4에서 자동으로 추정한 발행일이 실제와 다를 때 이 값이 우선한다.
import { put, get } from '@vercel/blob';

const OVERRIDES_BLOB_PATH = 'content-publish-overrides.json';

export type ContentPublishOverrides = Record<string, string>;

export async function loadContentPublishOverrides(): Promise<ContentPublishOverrides> {
  try {
    const result = await get(OVERRIDES_BLOB_PATH, { access: 'private', useCache: false });
    if (!result || !result.stream) return {};
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as ContentPublishOverrides;
  } catch {
    return {};
  }
}

export async function saveContentPublishOverride(pageTitle: string, date: string): Promise<ContentPublishOverrides> {
  const overrides = await loadContentPublishOverrides();
  if (date.trim()) {
    overrides[pageTitle] = date.trim();
  } else {
    delete overrides[pageTitle];
  }
  await put(OVERRIDES_BLOB_PATH, JSON.stringify(overrides), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
  return overrides;
}

// 콘텐츠 삭제(숨김): pageTitle(GA4 원본) 목록. 여기 포함된 콘텐츠는 콘텐츠 현황/DAU 팝업 어디에도
// 노출하지 않는다. GA4 원본 데이터 자체를 지우는 게 아니라 이 화면들에서 숨기는 것이다.
const EXCLUDED_BLOB_PATH = 'content-excluded.json';

export async function loadExcludedContentTitles(): Promise<Set<string>> {
  try {
    const result = await get(EXCLUDED_BLOB_PATH, { access: 'private', useCache: false });
    if (!result || !result.stream) return new Set();
    const text = await new Response(result.stream).text();
    const list = JSON.parse(text) as string[];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export async function excludeContentTitle(pageTitle: string): Promise<void> {
  const set = await loadExcludedContentTitles();
  set.add(pageTitle);
  await put(EXCLUDED_BLOB_PATH, JSON.stringify([...set]), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
}
