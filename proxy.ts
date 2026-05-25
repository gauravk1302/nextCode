import authConfig from "./auth.config"
import NextAuth from "next-auth"
import { publicRoutes, protectedRoutes, authRoutes, apiAuthPrefix, DEFAULT_LOGIN_REDIRECT } from "./routes"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname)

  // /api/auth/* — hamesha allow
  if (isApiAuthRoute) return NextResponse.next()

  // sign-in page — logged in hai toh ghar bhejo
  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
    return NextResponse.next()
  }

  // protected route — login nahi toh sign-in pe bhejo
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", nextUrl))
  }

  // public route ya kuch aur — allow
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}