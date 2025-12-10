import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://uwzhhzkvqqvaqvkuocrz.supabase.co';

const CRAWLER_USER_AGENTS = [
  'bot',
  'crawl',
  'spider',
  'facebook',
  'whatsapp',
  'telegram',
  'twitter',
  'linkedin',
  'discord',
  'slack',
  'preview',
  'facebookexternalhit',
  'Facebot',
  'TelegramBot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'Discordbot',
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(crawler => ua.includes(crawler.toLowerCase()));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';

  // Skip static files and known routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/dashboard' ||
    pathname === '/demo' ||
    pathname === '/create-fanlink' ||
    pathname.startsWith('/presave/create')
  ) {
    return NextResponse.next();
  }

  // Check if it's a crawler
  if (isCrawler(userAgent)) {
    // Check for presave URLs: /presave/{artist}/{slug}
    const presaveMatch = pathname.match(/^\/presave\/([^/]+)\/([^/]+)$/);
    if (presaveMatch) {
      const [, artist, slug] = presaveMatch;
      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/presave-meta/${artist}/${slug}`;
      return NextResponse.rewrite(new URL(edgeFunctionUrl));
    }

    // Check for fanlink URLs: /{artist}/{slug}
    const fanlinkMatch = pathname.match(/^\/([^/]+)\/([^/]+)$/);
    if (fanlinkMatch) {
      const [, artist, slug] = fanlinkMatch;
      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/fanlink-meta/${artist}/${slug}`;
      return NextResponse.rewrite(new URL(edgeFunctionUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
