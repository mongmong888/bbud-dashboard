'use client';

import { ReactNode, useEffect, useState } from 'react';
import { card, sectionTitle, sectionSubtitle, colors, navBtnStyle, pageBtnStyle } from './shared';

export interface Column<T> {
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

const PER_PAGE = 10;
const PAGE_WINDOW = 5;

export function PaginatedTable<T>({
  title,
  subtitle,
  rows,
  columns,
  emptyMessage,
  wrapInCard = true,
  hideHeader = false,
}: {
  title: string;
  subtitle: string;
  rows: T[];
  columns: Column<T>[];
  emptyMessage: string;
  wrapInCard?: boolean;
  hideHeader?: boolean;
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
      {!hideHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={sectionTitle}>{title}</div>
            <div style={sectionSubtitle}>{subtitle}</div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13.5, color: colors.textFaint }}>
          {emptyMessage}
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.headerBorder}` }}>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: c.align ?? 'left',
                      padding: '10px 8px',
                      fontSize: 12.5,
                      color: colors.textFaint,
                      fontWeight: 600,
                    }}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                  {columns.map((c, j) => (
                    <td key={j} style={{ padding: '13px 8px', textAlign: c.align ?? 'left' }}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

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
