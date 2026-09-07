'use client';

import { useState } from 'react';
import { ContentItem } from '@/lib/queries';
import { colors } from './shared';

export function ContentDateEditModal({
  item,
  maxSelectableDate,
  onClose,
  onSave,
  onDelete,
}: {
  item: ContentItem;
  maxSelectableDate: string;
  onClose: () => void;
  onSave: (pageTitle: string, date: string) => Promise<void>;
  onDelete: (pageTitle: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(item.publishDate);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!draft) {
      setError('발행일을 선택해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(item.pageTitle, draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`"${item.title}" 콘텐츠를 목록에서 삭제할까요?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(item.pageTitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했어요.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16,24,40,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 24px 60px rgba(16,24,40,0.3)',
          padding: '22px 26px 26px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.textDark }}>발행일 수정</div>
            <div style={{ fontSize: 12.5, color: colors.textFaint, marginTop: 4, lineHeight: 1.5 }} title={item.title}>
              {item.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${colors.border}`,
              background: '#fff',
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: 'pointer',
              color: colors.textMuted,
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>발행일</div>
        <input
          type="date"
          value={draft}
          max={maxSelectableDate}
          onChange={(e) => setDraft(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            fontSize: 13.5,
            color: colors.textBody,
            fontFamily: 'inherit',
          }}
        />

        {error && (
          <div style={{ fontSize: 12.5, color: '#D92D20', fontWeight: 600, marginTop: 10 }}>{error}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
          <button
            onClick={handleDelete}
            disabled={deleting || saving}
            style={{
              border: '1px solid #FDA29B',
              background: '#fff',
              color: '#D92D20',
              padding: '9px 16px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: deleting || saving ? 'default' : 'pointer',
              opacity: deleting || saving ? 0.6 : 1,
            }}
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                border: `1px solid ${colors.border}`,
                background: '#fff',
                color: colors.textBody,
                padding: '9px 18px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || deleting}
              style={{
                border: 'none',
                background: colors.primary,
                color: '#fff',
                padding: '9px 20px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving || deleting ? 'default' : 'pointer',
                opacity: saving || deleting ? 0.6 : 1,
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
