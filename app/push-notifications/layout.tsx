import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '푸시 알림 | 비벗 운영 현황',
  description: '발송된 푸시 알림 성과 조회',
};

export default function PushNotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
