import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://187.127.134.246:4001';

const SKIP_HEADERS = new Set(['host', 'connection', 'transfer-encoding', 'content-length']);

async function proxy(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug.join('/');
  const targetUrl = `${BACKEND}/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    if (!SKIP_HEADERS.has(k.toLowerCase())) headers[k] = v;
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const res = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  });

  const outHeaders = new Headers();
  res.headers.forEach((v, k) => {
    if (!SKIP_HEADERS.has(k.toLowerCase())) outHeaders.set(k, v);
  });

  return new NextResponse(res.body, { status: res.status, headers: outHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
