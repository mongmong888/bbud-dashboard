'use client';

import { Fragment, useEffect, useState } from 'react';
import { PartnerStatusRow } from '@/lib/queries';
import { colors, fmt, navBtnStyle, pageBtnStyle, sectionSubtitle, sectionTitle } from './shared';

const PER_PAGE = 10;
const PAGE_WINDOW = 5;

const METRIC_GROUPS: { key: 'view' | 'call' | 'kakao' | 'use'; label: string }[] = [
  { key: 'view', label: '조회수' },
  { key: 'call', label: '전화 클릭' },
  { key: 'kakao', label: '카카오 클릭' },
  { key: 'use', label: '이용하기 클릭' },
];

function eventValue(row: PartnerStatusRow, key: (typeof METRIC_GROUPS)[number]['key']): number {
  return { view: row.viewEvent, call: row.callEvent, kakao: row.kakaoEvent, use: row.useEvent }[key];
}

function usersValue(row: PartnerStatusRow, key: (typeof METRIC_GROUPS)[number]['key']): number {
  return { view: row.viewUsers, call: row.callUsers, kakao: row.kakaoUsers, use: row.useUsers }[key];
}

const groupThStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '8px',
  fontSize: 12.5,
  color: colors.textBody,
  fontWeight: 700,
  borderLeft: `1px solid ${colors.headerBorder}`,
  borderBottom: `1px solid ${colors.rowBorder}`,
};

const subThStyle: React.CSSProperties = {
  textAlign: 'right',
  padding: '6px 8px 10px',
  fontSize: 11.5,
  color: colors.textFaint,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const eventTdStyle: React.CSSProperties = {
  padding: '13px 8px',
  textAlign: 'right',
  fontSize: 13.5,
  color: colors.textDark,
  fontWeight: 600,
  borderLeft: `1px solid ${colors.rowBorder}`,
};

const usersTdStyle: React.CSSProperties = {
  padding: '13px 8px',
  textAlign: 'right',
  fontSize: 13,
  color: colors.textFaint,
};

export function PartnerStatusTable({ rows, emptyMessage }: { rows: PartnerStatusRow[]; emptyMessage: string }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const clamped = Math.min(page, totalPages);
  const slice = rows.slice((clamped - 1) * PER_PAGE, clamped * PER_PAGE);

  const windowStart = Math.floor((clamped - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;
  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);
  const pageNumbers = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={sectionTitle}>제휴사 입점 성과</div>
        <div style={sectionSubtitle}>조회수(이벤트 수) 내림차순 정렬 · 지표별 이벤트 수 / 활성 사용자 수 구분</div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13.5, color: colors.textFaint }}>{emptyMessage}</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1020, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    style={{
                      textAlign: 'left',
                      padding: '10px 8px',
                      fontSize: 12.5,
                      color: colors.textFaint,
                      fontWeight: 600,
                      minWidth: 150,
                      verticalAlign: 'bottom',
                      borderBottom: `1px solid ${colors.headerBorder}`,
                    }}
                  >
                    업체명
                  </th>
                  {METRIC_GROUPS.map((g) => (
                    <th key={g.key} colSpan={2} style={groupThStyle}>
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr style={{ borderBottom: `1px solid ${colors.headerBorder}` }}>
                  {METRIC_GROUPS.map((g) => (
                    <Fragment key={g.key}>
                      <th style={{ ...subThStyle, borderLeft: `1px solid ${colors.headerBorder}` }}>이벤트 수</th>
                      <th style={subThStyle}>활성 사용자 수</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                    <td style={{ padding: '13px 8px', fontSize: 13.5, color: colors.textBody, fontWeight: 500 }}>{row.name}</td>
                    {METRIC_GROUPS.map((g) => (
                      <Fragment key={g.key}>
                        <td style={eventTdStyle}>{fmt(eventValue(row, g.key))}</td>
                        <td style={usersTdStyle}>{fmt(usersValue(row, g.key))}</td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 14 }}>
              <button
                onClick={() => setPage(Math.max(1, windowStart - 1))}
                disabled={windowStart === 1}
                style={{ ...navBtnStyle, opacity: windowStart === 1 ? 0.4 : 1, cursor: windowStart === 1 ? 'default' : 'pointer' }}
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button key={n} onClick={() => setPage(n)} style={pageBtnStyle(n === clamped)}>
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, windowEnd + 1))}
                disabled={windowEnd === totalPages}
                style={{ ...navBtnStyle, opacity: windowEnd === totalPages ? 0.4 : 1, cursor: windowEnd === totalPages ? 'default' : 'pointer' }}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
