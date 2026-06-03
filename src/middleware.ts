import { NextRequest, NextResponse } from 'next/server'

const ICON_ALLOWLIST = [
  '/favicon.ico',
  '/favicon-20260112.ico',
  '/icon-48-v2.png',
  '/icon-192-v2.png',
  '/apple-touch-icon-v2.png',
  '/site.webmanifest',
]

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname, search } = req.nextUrl

  // Chỉ xử lý cho www
  if (!host.startsWith('www.')) return NextResponse.next()

  // Cho phép các file icon được trả 200 trên www (không redirect)
  if (ICON_ALLOWLIST.includes(pathname)) return NextResponse.next()

  // (Tuỳ bạn) cũng có thể cho robots/sitemap không redirect
  // if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return NextResponse.next();

  const url = req.nextUrl.clone()
  url.host = host.replace(/^www\./, '')
  url.pathname = pathname
  url.search = search

  return NextResponse.redirect(url, 308)
}

// Áp middleware cho mọi path (vì mình đã allowlist ở trên)
export const config = {
  matcher: ['/:path*'],
}
