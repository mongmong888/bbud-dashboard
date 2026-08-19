# GA4 인사이트 대시보드

`docs/ga4-dashboard-prd.md`, `docs/ga4-dashboard-screens.md`를 기반으로 구현한 독립 대시보드 앱.

## 실행

```bash
npm install
npm run dev
```

`.env.local`에 다음 값이 필요하다.

```
GA4_WEB_PROPERTY_ID=450563535
GA4_MARKETING_PROPERTY_ID=493622385
GOOGLE_APPLICATION_CREDENTIALS_PATH=<서비스 계정 JSON 키 파일의 절대 경로>
```

서비스 계정에는 두 GA4 속성 모두에 대한 "뷰어" 권한이 있어야 한다.

## 데이터 갱신 방식 (현재 구현 vs PRD)

PRD(Open Question 2)는 "매일 오전 6시 배치로 전일 데이터 갱신"을 요구사항으로 명시했다. 현재 구현은 별도 배치/캐시 없이 요청 시점에 GA4 Data API를 직접 호출하는 온디맨드 방식이며, 날짜 계산만 항상 D-1(어제)까지로 제한해 "오늘 데이터는 절대 보여주지 않는다"는 요구사항은 만족한다.

실제 배포 시에는 다음 중 하나로 배치 구조를 추가하는 것을 권장한다.
- Vercel Cron Jobs로 오전 6시에 API를 미리 호출해 캐시(파일/KV/DB)에 저장하고, 화면은 캐시만 읽도록 변경
- 또는 Next.js `unstable_cache` + `revalidate`로 일정 주기 재검증

## PRD 대비 구현 시 변경/확정된 사항

작업 중 사용자와 협의해 디자인 목업(`docs/ga4-dashboard-design/`) 기준으로 확정한 부분:
- 요약 KPI 카드 3번째 항목: PRD의 "이벤트 수" 대신 "회원가입 수"(`sign_up` 이벤트, marketing 속성)로 구현
- 트래픽 트렌드 차트: PRD의 "활성사용자+페이지뷰, 신규/재방문 구분 없음" 대신, 디자인 기준으로 "DAU 신규/재방문 막대그래프"로 구현 (페이지뷰 추이는 이 차트에 없음)
- 배너/팝업 테이블의 지표별 증감률(▲/▼)은 디자인 HTML에는 바인딩이 비어 있었지만, PRD 요구사항과 목업 내부 로직(계산은 되어 있었음)에 맞춰 표시하도록 구현함

인기 페이지 Top N은 사이트 전체 페이지 수가 많아(최근 30일 기준 149페이지) 상위 100개로 제한했다.
