import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — required for SSR
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes. We intentionally do
  // NOT bounce authenticated users off /login here: a signed-in user who isn't a
  // member of any trip is sent to /login?error=… by the app, and redirecting them
  // back to / (which re-redirects to /login) creates an infinite loop.
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/auth/');
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|stops.geojson).*)',
  ],
};
