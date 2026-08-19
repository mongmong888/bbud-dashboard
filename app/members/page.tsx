'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MemberSnapshot } from '@/lib/members';
import { card, colors, fmt, sectionSubtitle, sectionTitle } from '../components/shared';
import { Donut } from '../components/Donut';
import { WriterTrendChart } from '../components/WriterTrendChart';
import { StatusPlanBars } from '../components/StatusPlanBars';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MembersPage() {
  const [snapshot, setSnapshot] = useState<MemberSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSnapshot(json.snapshot);
    } catch {
      setFetchError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/members/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error ?? '업로드에 실패했어요.');
        return;
      }
      setSnapshot(json.snapshot);
    } catch {
      setUploadError('업로드에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const uploadCard = (
    <div style={{ ...card, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: colors.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: colors.textDark, marginBottom: 4 }}>회원 데이터 업로드</div>
          <div style={{ fontSize: 12.5, color: colors.textFaint }}>
            {snapshot ? (
              <>
                마지막 업로드: <b style={{ color: colors.textMuted }}>{formatDateTime(snapshot.uploadedAt)}</b> · {snapshot.fileName}
              </>
            ) : (
              '아직 업로드된 파일이 없어요'
            )}
          </div>
          {uploadError && <div style={{ fontSize: 12.5, color: '#B42318', marginTop: 6 }}>{uploadError}</div>}
        </div>
      </div>
      <div>
        <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileSelect} style={{ display: 'none' }} id="member-upload-input" />
        <label
          htmlFor="member-upload-input"
          style={{
            border: 'none',
            background: uploading ? colors.textFaint : colors.primary,
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 9,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: uploading ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {uploading ? '업로드 중...' : '파일 선택 (.xlsx)'}
        </label>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '32px 40px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: colors.textDark, letterSpacing: '-0.2px' }}>회원 현황</div>
          <div style={{ fontSize: 13, color: colors.textFaint, marginTop: 1 }}>회원 데이터 기준 대시보드</div>
        </div>

        {uploadCard}

        {loading && (
          <div style={{ ...card, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 13.5, color: colors.textFaint }}>불러오는 중...</div>
          </div>
        )}

        {!loading && fetchError && (
          <div style={{ ...card, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, color: colors.textBody, fontWeight: 600 }}>{fetchError}</div>
            <button
              onClick={fetchSnapshot}
              style={{ border: 'none', background: colors.primary, color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !fetchError && !snapshot && (
          <div style={{ ...card, height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.textBody }}>아직 업로드된 회원 데이터가 없어요.</div>
            <div style={{ fontSize: 13, color: colors.textFaint }}>위에서 엑셀 파일을 업로드해 주세요.</div>
          </div>
        )}

        {!loading && !fetchError && snapshot && (
          <MemberDashboard snapshot={snapshot} />
        )}
      </div>
    </div>
  );
}

function MemberDashboard({ snapshot }: { snapshot: MemberSnapshot }) {
  const m = snapshot.metrics;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ fontSize: 13.5, color: colors.textMuted, fontWeight: 600, marginBottom: 12 }}>전체 회원수</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: colors.textDark, marginBottom: 6 }}>{fmt(m.totalMembers)}명</div>
          <div style={{ fontSize: 12.5, color: colors.textFaint }}>탈퇴 {fmt(m.withdrawnMembers)}명 포함</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 13.5, color: colors.textMuted, fontWeight: 600, marginBottom: 12 }}>창업계획서 작성자 수</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: colors.textDark, marginBottom: 6 }}>{fmt(m.planWriters)}명</div>
          <div style={{ fontSize: 12.5, color: colors.textFaint }}>작성률 {m.planWriteRate.toFixed(1)}%</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 13.5, color: colors.textMuted, fontWeight: 600, marginBottom: 12 }}>작성된 창업계획서</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: colors.textDark, marginBottom: 6 }}>{fmt(m.planCount)}건</div>
          <div style={{ fontSize: 12.5, color: colors.textFaint }}>
            온라인 {fmt(m.onlineCount)}건 · 오프라인 {fmt(m.offlineCount)}건
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ marginBottom: 16 }}>
            <div style={sectionTitle}>일별 작성자 수</div>
            <div style={sectionSubtitle}>최근 7일 · 회원가입자 수 대비 창업계획서 작성자 수</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: colors.textFaint }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.returnBar }} />
                회원가입
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: colors.primary }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.newBar }} />
                창업계획서 작성
              </span>
            </div>
          </div>
          <WriterTrendChart data={m.dailyTrend} />
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={sectionTitle}>온/오프라인 비율</div>
            <div style={sectionSubtitle}>작성된 창업계획서 기준</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Donut items={m.onOffRatio} size={180} centerLabel={`${fmt(m.planCount)}건`} centerSub="전체 건수" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: colors.textDark, marginBottom: 2 }}>온라인 창업아이템 비율</div>
          <div style={{ fontSize: 12.5, color: colors.textFaint, marginBottom: 16 }}>온라인 {fmt(m.onlineCount)}건 기준</div>
          <Donut items={m.onlineItemRatio} size={120} twoColumnLegend valueLabel="창업아이템" />
        </div>
        <div style={card}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: colors.textDark, marginBottom: 2 }}>오프라인 창업아이템 비율</div>
          <div style={{ fontSize: 12.5, color: colors.textFaint, marginBottom: 16 }}>오프라인 {fmt(m.offlineCount)}건 기준</div>
          <Donut items={m.offlineItemRatio} size={120} valueLabel="창업아이템" />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: colors.textDark, marginBottom: 2 }}>사업상태 비율</div>
        <div style={{ fontSize: 12.5, color: colors.textFaint, marginBottom: 16 }}>
          {fmt(m.statusDenominator)}명(사업상태 입력 회원) 기준 · 2026-07-15 이후 가입자부터 수집된 값이에요
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <Donut items={m.statusRatio} size={200} unit="명" valueLabel="사업상태" />
          <div style={{ flex: '1 1 260px', minWidth: 0, maxWidth: '100%', paddingLeft: 24, borderLeft: `1px solid #EEF1F6` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textDark }}>사업상태별 창업계획서 수</div>
              <div style={{ display: 'flex', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: colors.textFaint }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.returnBar }} />
                  인원수
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: colors.textBody }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.primary }} />
                  창업계획서 수
                </span>
              </div>
            </div>
            <StatusPlanBars rows={m.statusPlanRows} />
          </div>
        </div>
      </div>
    </>
  );
}
