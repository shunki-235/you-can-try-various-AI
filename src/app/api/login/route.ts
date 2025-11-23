import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };

  const appPassword = process.env.APP_PASSWORD;

  if (!password || !appPassword || password !== appPassword) {
    return NextResponse.json(
      { ok: false, message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("app_auth", appPassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });

  return response;
}


