import { NextRequest, NextResponse } from 'next/server';
import { saveSnapshot, MemberSnapshot } from '@/lib/members';
import { isMemberMetrics } from '@/lib/memberParser';

export const dynamic = 'force-dynamic';

// 엑셀 파일은 4.5MB를 넘으면 Vercel 함수가 받지 못해서, 브라우저에서 파싱·집계한 결과(metrics)만 받는다.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fileName = body?.fileName;
  const metrics = body?.metrics;

  if (typeof fileName !== 'string' || !fileName || !isMemberMetrics(metrics)) {
    return NextResponse.json({ error: '업로드한 데이터 형식이 올바르지 않아요. 파일을 다시 선택해 주세요.' }, { status: 400 });
  }

  const snapshot: MemberSnapshot = { uploadedAt: new Date().toISOString(), fileName, metrics };

  try {
    await saveSnapshot(snapshot);
    return NextResponse.json({ snapshot });
  } catch (err) {
    console.error('회원 데이터 저장 실패', err);
    return NextResponse.json({ error: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
}
