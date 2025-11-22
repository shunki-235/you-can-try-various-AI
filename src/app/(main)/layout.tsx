import type { ReactNode } from "react";
import Link from "next/link";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold tracking-tight">
              You Can Try Various AI
            </span>
            <span className="text-xs text-zinc-500">
              マルチLLMチャット（モック）
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/chat"
              className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-50"
            >
              チャット
            </Link>
            <Link
              href="/settings"
              className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-50"
            >
              設定
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}


