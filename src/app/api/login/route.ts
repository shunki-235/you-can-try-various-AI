import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };

  const appPassword = process.env.APP_PASSWORD;

  if (!password || !appPassword) {
    return NextResponse.json(
      { ok: false, message: "Invalid credentials" },
      { status: 401 },
    );
  }

  // タイミング攻撃を防ぐため、定数時間比較を使用
  const passwordBuffer = Buffer.from(password);
  const appPasswordBuffer = Buffer.from(appPassword);

  if (
    passwordBuffer.length !== appPasswordBuffer.length ||
    !timingSafeEqual(passwordBuffer, appPasswordBuffer)
  ) {
    return NextResponse.json(
      { ok: false, message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  // ランダムなセッショントークンを生成（署名付き）
  const sessionToken = await createSession();

  response.cookies.set("app_auth", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });

  return response;
}


