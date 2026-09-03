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
