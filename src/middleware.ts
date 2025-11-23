import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("app_auth")?.value;
  const appPassword = process.env.APP_PASSWORD;

  // APP_PASSWORD が未設定、またはクッキーが一致しない場合はログインページへ
  if (!token || !appPassword || token !== appPassword) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 認証保護したいパスのみを明示的に指定
  matcher: ["/", "/chat", "/settings/:path*"],
};


