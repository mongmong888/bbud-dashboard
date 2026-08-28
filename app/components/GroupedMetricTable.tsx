'use client';

import { Fragment, ReactNode, useEffect, useState } from 'react';
import { card, colors, fmt, navBtnStyle, pageBtnStyle, sectionSubtitle, sectionTitle } from './shared';

const PER_PAGE = 10;
const PAGE_WINDOW = 5;

export interface MetricGroup<T> {
  key: string;
  label: string;
  eventValue: (row: T) => number;
  usersValue: (row: T) => number;
}

export interface ExtraColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
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

const extraThStyle: React.CSSProperties = {
  textAlign: 'right',
  padding: '10px 8px',
  fontSize: 12.5,
  color: colors.textFaint,
  fontWeight: 600,
  verticalAlign: 'bottom',
  borderBottom: `1px solid ${colors.headerBorder}`,
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

const extraTdStyle: React.CSSProperties = {
  padding: '13px 8px',
  textAlign: 'right',
  fontSize: 13.5,
  color: colors.textDark,
  fontWeight: 600,
};

export function GroupedMetricTable<T>({
  title,
  subtitle,
  nameHeader,
  nameValue,
  metricGroups,
  extraColumns = [],
  rows,
  emptyMessage,
  wrapInCard = true,
}: {
  title?: string;
  subtitle?: string;
  nameHeader: string;
  nameValue: (row: T) => ReactNode;
  metricGroups: MetricGroup<T>[];
  extraColumns?: ExtraColumn<T>[];
  rows: T[];
  emptyMessage: string;
  wrapInCard?: boolean;
}) {
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
    <div style={wrapInCard ? { ...card, minWidth: 0 } : { minWidth: 0 }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: 14 }}>
          {title && <div style={sectionTitle}>{title}</div>}
          {subtitle && <div style={sectionSubtitle}>{subtitle}</div>}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13.5, color: colors.textFaint }}>{emptyMessage}</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 220 + metricGroups.length * 180 + extraColumns.length * 120, borderCollapse: 'collapse' }}>
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
                    {nameHeader}
                  </th>
                  {metricGroups.map((g) => (
                    <th key={g.key} colSpan={2} style={groupThStyle}>
                      {g.label}
                    </th>
                  ))}
                  {extraColumns.map((c) => (
                    <th key={c.header} rowSpan={2} style={extraThStyle}>
                      {c.header}
                    </th>
                  ))}
                </tr>
                <tr style={{ borderBottom: `1px solid ${colors.headerBorder}` }}>
                  {metricGroups.map((g) => (
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
                    <td style={{ padding: '13px 8px', fontSize: 13.5, color: colors.textBody, fontWeight: 500 }}>{nameValue(row)}</td>
                    {metricGroups.map((g) => (
                      <Fragment key={g.key}>
                        <td style={eventTdStyle}>{fmt(g.eventValue(row))}</td>
                        <td style={usersTdStyle}>{fmt(g.usersValue(row))}</td>
                      </Fragment>
                    ))}
                    {extraColumns.map((c) => (
                      <td key={c.header} style={extraTdStyle}>
                        {c.render(row)}
                      </td>
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
