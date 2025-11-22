'use client';

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER_ID,
  PROVIDERS,
} from "@/lib/llm/providers";
import type { ChatProvider } from "@/types/llm";

type ChatRole = "user" | "assistant";

interface UiMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const createMessageId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function ChatPage() {
  const [provider, setProvider] = useState<ChatProvider>(DEFAULT_PROVIDER_ID);
  const [model, setModel] = useState<string>(
    DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER_ID],
  );
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "initial-assistant",
      role: "assistant",
      content:
        "これはモックのチャット画面です。実際の LLM 呼び出しやストリーミングは今後の実装で追加されます。",
    },
  ]);

  const availableModels = useMemo(
    () => PROVIDERS.find((p) => p.id === provider)?.models ?? [],
    [provider],
  );

  const handleProviderChange = (next: ChatProvider) => {
    setProvider(next);
    const modelsForNext =
      PROVIDERS.find((p) => p.id === next)?.models ?? [];
    const fallback =
      DEFAULT_MODEL_BY_PROVIDER[next] ??
      modelsForNext.at(0)?.id ??
      "";
    setModel(fallback);
  };

  const handleModelChange = (next: string) => {
    setModel(next);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: UiMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    };

    const mockAssistant: UiMessage = {
      id: createMessageId(),
      role: "assistant",
      content: `（モック）${provider.toUpperCase()} / ${model} でのレスポンスがここに表示されます。後で実際の LLM API 呼び出しに置き換えます。`,
    };

    setMessages((prev) => [...prev, userMessage, mockAssistant]);
    setInput("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col gap-4 px-4 py-4">
      <section className="flex flex-col gap-4 rounded-lg border bg-background/60 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight">
              チャット
            </h1>
            <p className="text-xs text-zinc-500">
              プロバイダやモデルを切り替えながらプロンプトを試せるチャット画面のモックです。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="provider"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
              >
                プロバイダ
              </label>
              <select
                id="provider"
                className="h-9 rounded-md border bg-background px-2 text-xs outline-none ring-0 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-visible:border-zinc-50 dark:focus-visible:ring-zinc-50"
                value={provider}
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
                htmlFor="model"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
              >
                モデル
              </label>
              <select
                id="model"
                className="h-9 min-w-[180px] rounded-md border bg-background px-2 text-xs outline-none ring-0 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-visible:border-zinc-50 dark:focus-visible:ring-zinc-50"
                value={model}
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
        </div>

        <div className="flex-1 overflow-hidden rounded-md border bg-background/80">
          <div className="flex h-[320px] flex-col gap-3 overflow-y-auto p-4 text-sm sm:h-[420px]">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                      isUser
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border bg-background/60 p-4 shadow-sm">
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <textarea
            className="min-h-[96px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:border-zinc-50 dark:focus-visible:ring-zinc-50"
            placeholder="メッセージを入力してください（Shift+Enterで改行、Enterで送信）"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex flex-col items-end justify-between gap-2 sm:flex-row sm:items-center">
            <p className="text-xs text-zinc-500">
              Shift+Enter で改行、Enter で送信します。
            </p>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-xs font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
              disabled={!input.trim()}
            >
              送信
            </button>
          </div>
        </form>
        <div className="flex justify-end text-xs text-zinc-500">
          <span>トークン使用量（モック）: ー</span>
        </div>
      </section>
    </div>
  );
}


