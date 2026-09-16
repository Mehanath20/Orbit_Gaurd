import { NextResponse } from 'next/server';
import fs from 'fs';
export async function POST(req: Request) {
  const body = await req.json();
  fs.writeFileSync('/home/luffy/.gemini/antigravity-ide/scratch/orbitguard/client_error.log', JSON.stringify(body, null, 2));
  return NextResponse.json({ ok: true });
}
