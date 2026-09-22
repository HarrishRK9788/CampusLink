import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Enforce college email domain
  if (user && !user.email?.endsWith('@psgtech.ac.in')) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'Strictly restricted to @psgtech.ac.in emails.')
    return NextResponse.redirect(url)
  }

  // Define protected routes that require authentication
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/profile') || 
                           request.nextUrl.pathname.startsWith('/admin') ||
                           request.nextUrl.pathname.startsWith('/resources') ||
                           request.nextUrl.pathname.startsWith('/discuss') ||
                           request.nextUrl.pathname.startsWith('/events')

  if (!user && isProtectedRoute) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged in users away from auth pages
  const isAuthRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup'
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
