import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const role = req.cookies.get("judgehub_role")?.value;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/instructor") && role !== "instructor") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/instructor/:path*", "/student/:path*"],
};