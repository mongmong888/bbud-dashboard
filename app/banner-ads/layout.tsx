import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '배너 광고 | 비벗 운영 현황',
  description: '구좌별 배너·팝업 광고 성과 분석',
};

export default function BannerAdsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
