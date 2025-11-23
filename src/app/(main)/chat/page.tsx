'use client';

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Bot, Send, User } from "lucide-react";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER_ID,
  PROVIDERS,
} from "@/lib/llm/providers";
import type { ChatMessage, ChatProvider } from "@/types/llm";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type ChatRole = "user" | "assistant";

interface UiMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface StoredSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UiMessage[];
}

type ProviderHealth = {
  hasApiKey: boolean;
  ok?: boolean;
  error?: string;
  implemented?: boolean;
};

type StoredSettings = {
  defaultProvider?: ChatProvider;
  defaultModel?: string;
  defaultTemperature?: number | null;
  defaultMaxTokens?: number | null;
};

const SETTINGS_STORAGE_KEY = "ycva:settings:v1";
const SESSIONS_STORAGE_KEY = "ycva:sessions:v1";

const INITIAL_ASSISTANT_MESSAGE: UiMessage = {
  id: "initial-assistant",
  role: "assistant",
  content:
    "マルチLLMチャットにようこそ。メッセージを入力して送信すると、選択したプロバイダとモデルで応答が生成されます。",
};

const createMessageId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function loadSessionsFromStorage(): StoredSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredSession[];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((session) => ({
      ...session,
      messages:
        Array.isArray(session.messages) && session.messages.length > 0
          ? session.messages
          : [INITIAL_ASSISTANT_MESSAGE],
    }));
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: StoredSession[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SESSIONS_STORAGE_KEY,
      JSON.stringify(sessions),
    );
  } catch {
    // localStorage が利用できない場合は黙って無視する
  }
}

export default function ChatPage() {
  const [provider, setProvider] = useState<ChatProvider>(DEFAULT_PROVIDER_ID);
  const [model, setModel] = useState<string>(
    DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER_ID],
  );
  const [temperature, setTemperature] = useState<number | "">("");
  const [maxTokens, setMaxTokens] = useState<number | "">("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedInput, setLastSubmittedInput] = useState<string | null>(
    null,
  );
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [health, setHealth] = useState<Record<string, ProviderHealth> | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // 設定（デフォルトプロバイダ・モデル・パラメータ）を読み込み
    try {
      const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        const stored = JSON.parse(rawSettings) as StoredSettings;

        if (stored.defaultProvider) {
          setProvider(stored.defaultProvider);

          const modelsForNext =
            PROVIDERS.find((p) => p.id === stored.defaultProvider)?.models ??
            [];
          const fallbackModel =
            stored.defaultModel ??
            DEFAULT_MODEL_BY_PROVIDER[stored.defaultProvider] ??
            modelsForNext.at(0)?.id ??
            "";
          setModel(fallbackModel);
        } else if (stored.defaultModel) {
          setModel(stored.defaultModel);
        }

        if (typeof stored.defaultTemperature === "number") {
          setTemperature(stored.defaultTemperature);
        }

        if (typeof stored.defaultMaxTokens === "number") {
          setMaxTokens(stored.defaultMaxTokens);
        }
      }
    } catch {
      // 設定の読み込みに失敗した場合はデフォルト値のままにする
    }

    // セッション一覧を読み込み
    const storedSessions = loadSessionsFromStorage();
    if (storedSessions.length > 0) {
      setSessions(storedSessions);
      const first = storedSessions[0];
      setActiveSessionId(first.id);
      setMessages(
        first.messages.length > 0 ? first.messages : [INITIAL_ASSISTANT_MESSAGE],
      );
    } else {
      const now = Date.now();
      const newSession: StoredSession = {
        id: createMessageId(),
        title: "新しいセッション",
        createdAt: now,
        updatedAt: now,
        messages: [INITIAL_ASSISTANT_MESSAGE],
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages(newSession.messages);
      saveSessionsToStorage([newSession]);
    }
  }, []);

  useEffect(() => {
    let aborted = false;

    const run = async () => {
      try {
        const response = await fetch("/api/llm/health");
        if (!response.ok) return;
        const json = (await response.json()) as {
          providers?: Record<string, ProviderHealth>;
        };
        if (!aborted && json.providers) {
          setHealth(json.providers);
        }
      } catch {
        // ヘルスチェックAPIが失敗しても動作自体は継続する
      }
    };

    void run();

    return () => {
      aborted = true;
    };
  }, []);

  const availableModels = useMemo(
    () => PROVIDERS.find((p) => p.id === provider)?.models ?? [],
    [provider],
  );

  const currentProviderHealthMessage = useMemo(() => {
    if (!health) return null;
    const status = health[provider];
    if (!status) return null;

    if (status.implemented === false) {
      return "このプロバイダは現在UIのみ実装されており、バックエンドは開発中です。";
    }

    if (!status.hasApiKey) {
      return "このプロバイダの API Key が未設定の可能性があります。環境変数を確認してください。";
    }

    if (typeof status.ok === "boolean" && !status.ok) {
      return "このプロバイダのヘルスチェックに失敗しました。API Key や設定を確認してください。";
    }

    if (typeof status.ok === "boolean" && status.ok) {
      return "このプロバイダの API 接続は正常と判定されました。";
    }

    return null;
  }, [health, provider]);

  const handleProviderChange = (next: string) => {
    const nextProvider = next as ChatProvider;
    setProvider(nextProvider);
    const modelsForNext =
      PROVIDERS.find((p) => p.id === nextProvider)?.models ?? [];
    const fallback =
      DEFAULT_MODEL_BY_PROVIDER[nextProvider] ??
      modelsForNext.at(0)?.id ??
      "";
    setModel(fallback);
  };

  const handleModelChange = (next: string) => {
    setModel(next);
  };

  const handleCreateSession = () => {
    const now = Date.now();
    const newSession: StoredSession = {
      id: createMessageId(),
      title: "新しいセッション",
      createdAt: now,
      updatedAt: now,
      messages: [INITIAL_ASSISTANT_MESSAGE],
    };

    setSessions((prev) => {
      const next = [newSession, ...prev];
      saveSessionsToStorage(next);
      return next;
    });
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
    setErrorMessage(null);
  };

  const handleSelectSession = (sessionId: string) => {
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) return;

    setActiveSessionId(sessionId);
    setMessages(
      target.messages.length > 0 ? target.messages : [INITIAL_ASSISTANT_MESSAGE],
    );
    setErrorMessage(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((session) => session.id !== sessionId);

      if (filtered.length === 0) {
        const now = Date.now();
        const newSession: StoredSession = {
          id: createMessageId(),
          title: "新しいセッション",
          createdAt: now,
          updatedAt: now,
          messages: [INITIAL_ASSISTANT_MESSAGE],
        };
        saveSessionsToStorage([newSession]);
        setActiveSessionId(newSession.id);
        setMessages(newSession.messages);
        setErrorMessage(null);
        return [newSession];
      }

      if (activeSessionId === sessionId) {
        const nextActive = filtered[0];
        setActiveSessionId(nextActive.id);
        setMessages(
          nextActive.messages.length > 0
            ? nextActive.messages
            : [INITIAL_ASSISTANT_MESSAGE],
        );
      }

      saveSessionsToStorage(filtered);
      return filtered;
    });
  };

  const handleSubmit = async (
    event?: FormEvent<HTMLFormElement>,
    overridePrompt?: string,
  ): Promise<void> => {
    event?.preventDefault();
    const baseText = overridePrompt ?? input;
    const trimmed = baseText.trim();
    if (!trimmed || isStreaming) return;

    setErrorMessage(null);
    setLastSubmittedInput(trimmed);
    const startedAt = Date.now();

    const userMessage: UiMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    };

    const assistantId = createMessageId();
    const assistantMessage: UiMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    // 画面上のメッセージとセッションを先に更新
    setMessages((prev) => {
      const nextMessages = [...prev, userMessage, assistantMessage];

      if (activeSessionId) {
        setSessions((prevSessions) => {
          const now = Date.now();
          const nextSessions = prevSessions.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  messages: nextMessages,
                  updatedAt: now,
                  title:
                    session.title === "新しいセッション" ||
                    session.title.trim().length === 0
                      ? trimmed.slice(0, 30) || "新しいセッション"
                      : session.title,
                }
              : session,
          );
          saveSessionsToStorage(nextSessions);
          return nextSessions;
        });
      }

      return nextMessages;
    });
    setInput("");

    // LLM API に渡す会話履歴（初期メッセージは除外）
    const historyMessages: ChatMessage[] = messages
      .filter((message) => message.id !== "initial-assistant")
      .map<ChatMessage>((message) => ({
        role: message.role,
        content: message.content,
      }));

    const chatMessages: ChatMessage[] = [
      ...historyMessages,
      {
        role: "user",
        content: trimmed,
      },
    ];

    const temperatureToSend =
      typeof temperature === "number" ? temperature : undefined;
    const maxTokensToSend =
      typeof maxTokens === "number" && !Number.isNaN(maxTokens)
        ? maxTokens
        : undefined;

    try {
      setIsStreaming(true);

      const response = await fetch("/api/llm/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          model,
          messages: chatMessages,
          temperature: temperatureToSend,
          maxTokens: maxTokensToSend,
        }),
      });

      if (!response.ok || !response.body) {
        const fallbackText = `ストリーミングAPI呼び出しに失敗しました（status: ${response.status}）。`;
        setMessages((prev) => {
          const nextMessages = prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: fallbackText,
                }
              : message,
          );

          if (activeSessionId) {
            setSessions((prevSessions) => {
              const now = Date.now();
              const nextSessions = prevSessions.map((session) =>
                session.id === activeSessionId
                  ? {
                      ...session,
                      messages: nextMessages,
                      updatedAt: now,
                    }
                  : session,
              );
              saveSessionsToStorage(nextSessions);
              return nextSessions;
            });
          }

          return nextMessages;
        });
        setErrorMessage(fallbackText);
        setLastDurationMs(Date.now() - startedAt);
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunkText = decoder.decode(value, { stream: !doneReading });
          if (chunkText) {
            accumulated += chunkText;
            const current = accumulated;

            setMessages((prev) => {
              const nextMessages = prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: current,
                    }
                  : message,
              );

              if (activeSessionId) {
                setSessions((prevSessions) => {
                  const now = Date.now();
                  const nextSessions = prevSessions.map((session) =>
                    session.id === activeSessionId
                      ? {
                          ...session,
                          messages: nextMessages,
                          updatedAt: now,
                        }
                      : session,
                  );
                  saveSessionsToStorage(nextSessions);
                  return nextSessions;
                });
              }

              return nextMessages;
            });
          }
        }
      }

      setLastDurationMs(Date.now() - startedAt);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました。";

      const fallbackText = `エラーが発生しました: ${message}`;

      setMessages((prev) => {
        const nextMessages = prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: fallbackText,
              }
            : message,
        );

        if (activeSessionId) {
          setSessions((prevSessions) => {
            const now = Date.now();
            const nextSessions = prevSessions.map((session) =>
              session.id === activeSessionId
                ? {
                    ...session,
                    messages: nextMessages,
                    updatedAt: now,
                  }
                : session,
            );
            saveSessionsToStorage(nextSessions);
            return nextSessions;
          });
        }

        return nextMessages;
      });
      setErrorMessage(fallbackText);
      setLastDurationMs(Date.now() - startedAt);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleRetry = () => {
    if (!lastSubmittedInput || isStreaming) return;
    void handleSubmit(undefined, lastSubmittedInput);
  };

  const formatDuration = (durationMs: number | null): string | null => {
    if (durationMs == null) return null;
    if (durationMs < 1000) {
      return `${durationMs} ms`;
    }
    return `${(durationMs / 1000).toFixed(2)} 秒`;
  };

  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-5xl gap-4 p-4">
      <aside className="hidden w-56 flex-col rounded-lg border bg-muted/40 p-3 text-xs md:flex">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">セッション</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={handleCreateSession}
          >
            新規
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 pr-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectSession(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectSession(session.id);
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="line-clamp-1 text-[11px]">
                    {session.title || "新しいセッション"}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className="ml-2 text-[10px] text-muted-foreground hover:text-destructive"
                    aria-label="セッションを削除"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <p className="mt-2 text-[10px] text-muted-foreground">
          左側の一覧から過去セッションを選択できます。モバイルでは直近のセッションのみが表示されます。
        </p>
      </aside>

      <Card className="flex flex-1 flex-col overflow-hidden shadow-md">
        <CardHeader className="border-b bg-muted/40 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">チャット</CardTitle>
              <p className="text-sm text-muted-foreground">
                AIモデルを選択して対話を開始します
              </p>
              {currentProviderHealthMessage && (
                <p className="text-xs text-muted-foreground">
                  {currentProviderHealthMessage}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid gap-1.5">
                <Label htmlFor="provider-select" className="text-xs">
                  プロバイダ
                </Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger
                    id="provider-select"
                    className="h-8 w-[140px] text-xs"
                  >
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="model-select" className="text-xs">
                  モデル
                </Label>
                <Select value={model} onValueChange={handleModelChange}>
                  <SelectTrigger
                    id="model-select"
                    className="h-8 w-[180px] text-xs"
                  >
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="temperature" className="text-xs">
                温度（temperature）
              </Label>
              <Input
                id="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                className="h-8 w-[140px] text-xs"
                value={temperature}
                onChange={(event) =>
                  setTemperature(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-tokens" className="text-xs">
                最大トークン（max_tokens）
              </Label>
              <Input
                id="max-tokens"
                type="number"
                min={1}
                step={64}
                className="h-8 w-[160px] text-xs"
                value={maxTokens}
                onChange={(event) =>
                  setMaxTokens(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value),
                  )
                }
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden bg-background p-0">
          <ScrollArea className="h-full p-4">
            <div className="flex flex-col gap-4 px-2 pb-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex w-full gap-3 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {isUser ? (
                        <User className="size-4" />
                      ) : (
                        <Bot className="size-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>

        <div className="border-t bg-muted/40 p-4">
          <form
            className="relative mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-xl bg-background p-2 shadow-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-ring"
            onSubmit={handleSubmit}
          >
            <Textarea
              className="min-h-[60px] w-full resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              placeholder="メッセージを入力してください..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-[10px] text-muted-foreground">
                Shift + Enter で改行、Enter で送信
              </p>
              <Button
                type="submit"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                disabled={!input.trim() || isStreaming}
              >
                <Send className="size-4" />
                <span className="sr-only">送信</span>
              </Button>
            </div>
          </form>
          <div className="mt-2 text-center text-[10px] text-muted-foreground">
            {errorMessage ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-destructive">{errorMessage}</span>
                {lastSubmittedInput && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={handleRetry}
                    disabled={isStreaming}
                  >
                    再実行
                  </Button>
                )}
              </div>
            ) : isStreaming ? (
              <span>応答を生成しています...</span>
            ) : (
              <span>
                {`直近のリクエスト所要時間: ${
                  formatDuration(lastDurationMs) ?? "—"
                }`}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

