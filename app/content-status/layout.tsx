import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '콘텐츠 현황 | 비벗 운영 현황',
  description: '발행일 기준 콘텐츠 성과 분석',
};

export default function ContentStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
