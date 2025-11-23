import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSession } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("app_auth")?.value;

  // セッショントークンが有効でない場合はログインページへ
  if (!(await isValidSession(token))) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 認証保護したいパスのみを明示的に指定
  matcher: [
    "/",
    "/chat",
    "/settings/:path*",
    "/api/llm/chat/:path*",
    "/api/llm/health/:path*",
  ],
};


