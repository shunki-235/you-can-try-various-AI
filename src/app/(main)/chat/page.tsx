'use client';

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Bot, User } from "lucide-react";
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
        "マルチLLMチャットにようこそ。メッセージを入力して送信すると、選択したプロバイダとモデルで応答が生成されます。",
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableModels = useMemo(
    () => PROVIDERS.find((p) => p.id === provider)?.models ?? [],
    [provider],
  );

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

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setErrorMessage(null);

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

    // 画面上のメッセージを先に更新
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");

    // LLM API に渡す会話履歴（初期モックメッセージは除外）
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
        }),
      });

      if (!response.ok || !response.body) {
        const fallbackText = `ストリーミングAPI呼び出しに失敗しました（status: ${response.status}）。`;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: fallbackText,
                }
              : message,
          ),
        );
        setErrorMessage(fallbackText);
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

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: current,
                    }
                  : message,
              ),
            );
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました。";

      const fallbackText = `エラーが発生しました: ${message}`;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: fallbackText,
              }
            : message,
        ),
      );
      setErrorMessage(fallbackText);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col gap-4 p-4">
      <Card className="flex flex-1 flex-col overflow-hidden shadow-md">
        <CardHeader className="border-b bg-muted/40 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">チャット</CardTitle>
              <p className="text-sm text-muted-foreground">
                AIモデルを選択して対話を開始します
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid gap-1.5">
                <Label htmlFor="provider-select" className="text-xs">プロバイダ</Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger id="provider-select" className="h-8 w-[140px] text-xs">
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
                <Label htmlFor="model-select" className="text-xs">モデル</Label>
                <Select value={model} onValueChange={handleModelChange}>
                  <SelectTrigger id="model-select" className="h-8 w-[180px] text-xs">
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
        </CardHeader>

        <div className="flex-1 overflow-hidden bg-background">
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
                        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
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
        </div>

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
              <span className="text-destructive">{errorMessage}</span>
            ) : isStreaming ? (
              <span>応答を生成しています...</span>
            ) : (
              <span>
                トークン使用量: （Gemini の usage 情報は非ストリーミングAPIで取得予定）
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
