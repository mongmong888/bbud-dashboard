// pageTitle 접두어로 콘텐츠를 분류하는 카테고리 정의. 클라이언트 컴포넌트에서도 바로 import할 수 있도록
// googleapis 등 서버 전용 의존성이 없는 이 파일에 따로 둔다 (lib/queries.ts는 client bundle에 넣으면 안 됨).
export const CONTENT_CATEGORIES = [
  { label: '지원사업', prefix: 'CO | 지원 사업 |' },
  { label: '창업정보', prefix: 'CO | 창업 DNA |' },
  { label: '이벤트', prefix: 'MY | 이벤트 |' },
] as const;
