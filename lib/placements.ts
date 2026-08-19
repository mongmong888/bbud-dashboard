// banner_id에 keyword가 포함되어 있으면 해당 구좌(label)로 분류한다. 순서대로 먼저 매칭되는 항목을 우선한다.
// 서버(API route)와 클라이언트(탭 UI) 양쪽에서 참조하므로, googleapis 등 서버 전용 의존성이 없는 이 파일에 둔다.
interface PlacementDef {
  label: string;
  keyword: string;
}

const PLACEMENT_DEFS: PlacementDef[] = [
  { label: '창업전A', keyword: '창업전A' },
  { label: '창업전B', keyword: '창업전B' },
  { label: '창업중C', keyword: '창업중C' },
  { label: '창업후D', keyword: '창업후D' },
  { label: '창업후E', keyword: '창업후E' },
  { label: '가이드', keyword: '가이드' },
  { label: '추천', keyword: '인터뷰' },
  { label: '지원사업', keyword: '지원사업' },
  { label: 'DNA', keyword: 'DNA' },
  { label: '라운지', keyword: '라운지' },
  { label: '마이', keyword: '마이' },
];

export const PLACEMENT_KEYWORDS = PLACEMENT_DEFS.map((d) => d.label);
// 어떤 항목에도 매칭되지 않는 banner_id는 이 화면에서 제외한다(구좌 탭/집계에 노출하지 않음).
export const UNCLASSIFIED_PLACEMENT = '미분류';

export function classifyPlacement(bannerId: string): string {
  for (const def of PLACEMENT_DEFS) {
    if (bannerId.includes(def.keyword)) return def.label;
  }
  return UNCLASSIFIED_PLACEMENT;
}
