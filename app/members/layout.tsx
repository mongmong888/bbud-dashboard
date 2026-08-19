import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '회원 현황 | 비벗 운영 현황',
  description: '회원 데이터 기준 대시보드',
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
