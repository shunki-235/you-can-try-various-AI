'use client';

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = password.trim();
    if (!trimmed) {
      setError("パスワードを入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: trimmed }),
      });

      if (!res.ok) {
        setError("認証に失敗しました。");
        setPassword("");
        return;
      }

      const from = searchParams.get("from") || "/chat";
      router.replace(from);
      router.refresh();
    } catch {
      setError("認証に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-md">
          <CardHeader className="border-b bg-muted/40 px-6 py-4">
            <CardTitle className="text-lg font-bold">
              You Can Try Various AI へログイン
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              共通パスワードを入力してチャット画面へアクセスします
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="パスワードを入力"
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "ログイン中..." : "ログイン"}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground">
              このアプリはクローズド利用を前提としており、共通パスワードを知っているユーザーのみがアクセスできます。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <Card className="shadow-md">
            <CardContent className="px-6 py-6">
              <p className="text-center text-muted-foreground">読み込み中...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

