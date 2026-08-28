import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '제휴사 현황 | 비벗 운영 현황',
  description: '제휴사 입점 페이지 조회·클릭 성과',
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
