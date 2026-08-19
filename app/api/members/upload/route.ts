import { NextRequest, NextResponse } from 'next/server';
import { parseWorkbook, saveSnapshot, ColumnValidationError, MemberSnapshot } from '@/lib/members';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일을 선택해 주세요.' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'xlsx 파일만 업로드할 수 있어요.' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metrics = parseWorkbook(buffer);
    const snapshot: MemberSnapshot = {
      uploadedAt: new Date().toISOString(),
      fileName: file.name,
      metrics,
    };
    await saveSnapshot(snapshot);
    return NextResponse.json({ snapshot });
  } catch (err) {
    if (err instanceof ColumnValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('회원 데이터 업로드 처리 실패', err);
    return NextResponse.json({ error: '파일을 처리하지 못했어요. 파일 형식을 확인해 주세요.' }, { status: 500 });
  }
}
