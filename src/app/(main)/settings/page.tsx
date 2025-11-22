'use client';

import { useMemo, useState } from "react";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER_ID,
  PROVIDERS,
} from "@/lib/llm/providers";
import type { ChatProvider } from "@/types/llm";

export default function SettingsPage() {
  const [defaultProvider, setDefaultProvider] =
    useState<ChatProvider>(DEFAULT_PROVIDER_ID);
  const [defaultModel, setDefaultModel] = useState<string>(
    DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER_ID],
  );
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(
    null,
  );

  const availableModels = useMemo(
    () => PROVIDERS.find((p) => p.id === defaultProvider)?.models ?? [],
    [defaultProvider],
  );

  const handleProviderChange = (next: ChatProvider) => {
    setDefaultProvider(next);
    const modelsForNext =
      PROVIDERS.find((p) => p.id === next)?.models ?? [];
    const fallback =
      DEFAULT_MODEL_BY_PROVIDER[next] ?? modelsForNext.at(0)?.id ?? "";
    setDefaultModel(fallback);
  };

  const handleModelChange = (next: string) => {
    setDefaultModel(next);
  };

  const handleClearSessions = () => {
    // モック段階では localStorage 等には触れず、UI のみで動作確認できるようにする。
    setLastActionMessage(
      "（モック）セッションデータをクリアしました。実装時に localStorage 等の削除処理を追加します。",
    );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <section className="space-y-2 rounded-lg border bg-background/60 p-4 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight">設定</h1>
          <p className="text-xs text-zinc-500">
            チャット画面のデフォルトプロバイダやモデル、セッションデータの扱いを設定するためのモック画面です。
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-background/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold">デフォルトのプロバイダ / モデル</h2>
        <p className="text-xs text-zinc-500">
          新しいチャットセッション開始時に、どのプロバイダ・モデルを初期選択状態にするかを設定します。
          （モックのため、現在は画面内の状態のみが変化します）
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="default-provider"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
            >
              デフォルトプロバイダ
            </label>
            <select
              id="default-provider"
              className="h-9 rounded-md border bg-background px-2 text-xs outline-none ring-0 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-visible:border-zinc-50 dark:focus-visible:ring-zinc-50"
              value={defaultProvider}
              onChange={(event) =>
                handleProviderChange(event.target.value as ChatProvider)
              }
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="default-model"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
            >
              デフォルトモデル
            </label>
            <select
              id="default-model"
              className="h-9 rounded-md border bg-background px-2 text-xs outline-none ring-0 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-visible:border-zinc-50 dark:focus-visible:ring-zinc-50"
              value={defaultModel}
              onChange={(event) => handleModelChange(event.target.value)}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-background/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold">セッションデータの管理</h2>
        <p className="text-xs text-zinc-500">
          ブラウザローカルに保存した会話履歴を削除するためのアクションをここに配置します。
          現時点ではモックのため、実際のデータ削除は行われません。
        </p>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-xs font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
          onClick={handleClearSessions}
        >
          セッションデータをクリア（モック）
        </button>
        <p
          className="text-xs text-zinc-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {lastActionMessage ??
            "直近の操作メッセージがここに表示されます。"}
        </p>
      </section>
    </div>
  );
}


