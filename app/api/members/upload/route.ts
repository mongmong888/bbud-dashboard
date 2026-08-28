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

  let snapshot: MemberSnapshot;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metrics = parseWorkbook(buffer);
    snapshot = { uploadedAt: new Date().toISOString(), fileName: file.name, metrics };
  } catch (err) {
    if (err instanceof ColumnValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('회원 데이터 파일 파싱 실패', err);
    return NextResponse.json({ error: '파일을 처리하지 못했어요. 파일 형식을 확인해 주세요.' }, { status: 400 });
  }

  try {
    await saveSnapshot(snapshot);
    return NextResponse.json({ snapshot });
  } catch (err) {
    console.error('회원 데이터 저장 실패', err);
    return NextResponse.json({ error: '파일은 정상 처리했지만 저장에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
}
