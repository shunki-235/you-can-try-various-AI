'use client';

import { useMemo, useState } from "react";
import { Settings2, Trash2 } from "lucide-react";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER_ID,
  PROVIDERS,
} from "@/lib/llm/providers";
import type { ChatProvider } from "@/types/llm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

  const handleProviderChange = (next: string) => {
    const nextProvider = next as ChatProvider;
    setDefaultProvider(nextProvider);
    const modelsForNext =
      PROVIDERS.find((p) => p.id === nextProvider)?.models ?? [];
    const fallback =
      DEFAULT_MODEL_BY_PROVIDER[nextProvider] ?? modelsForNext.at(0)?.id ?? "";
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
    setTimeout(() => setLastActionMessage(null), 3000);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-3 border-b pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
          <p className="text-muted-foreground">
            アプリケーションの動作やデータ管理に関する設定を行います
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">デフォルト設定</CardTitle>
            <CardDescription>
              新しいチャットを開始する際の初期プロバイダとモデルを設定します。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-provider">デフォルトプロバイダ</Label>
              <Select
                value={defaultProvider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger id="default-provider">
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
            <div className="space-y-2">
              <Label htmlFor="default-model">デフォルトモデル</Label>
              <Select value={defaultModel} onValueChange={handleModelChange}>
                <SelectTrigger id="default-model">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">危険なエリア</CardTitle>
            <CardDescription>
              取り返しのつかない操作が含まれますのでご注意ください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h4 className="font-medium text-destructive">セッションデータの削除</h4>
                <p className="text-sm text-muted-foreground">
                  保存されているすべてのチャット履歴とセッション情報を削除します。
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearSessions}
                className="shrink-0"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                データをクリア
              </Button>
            </div>
            {lastActionMessage && (
              <div className="rounded-md bg-muted px-4 py-3 text-sm text-foreground animate-in fade-in slide-in-from-top-2">
                {lastActionMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
