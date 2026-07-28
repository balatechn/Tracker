import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  let result: { url: string; status?: number; error?: string; body?: string } = { url: backendUrl };
  try {
    const res = await fetch(`${backendUrl}/health`, { cache: 'no-store' });
    result.status = res.status;
    result.body = await res.text();
  } catch (e) {
    result.error = String(e);
  }
  return NextResponse.json(result);
}
