'use client';

import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";

const SETTINGS_STORAGE_KEY = "ycva:settings:v1";
const SESSIONS_STORAGE_KEY = "ycva:sessions:v1";

type StoredSettings = {
  defaultProvider?: ChatProvider;
  defaultModel?: string;
  defaultTemperature?: number | null;
  defaultMaxTokens?: number | null;
};

function mergeAndPersistSettings(partial: Partial<StoredSettings>) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as StoredSettings) : {};
    const next: StoredSettings = {
      ...current,
      ...partial,
    };
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage が利用できない場合は黙って無視する
  }
}

export default function SettingsPage() {
  const [defaultProvider, setDefaultProvider] =
    useState<ChatProvider>(DEFAULT_PROVIDER_ID);
  const [defaultModel, setDefaultModel] = useState<string>(
    DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER_ID],
  );
  const [defaultTemperature, setDefaultTemperature] = useState<number | "">("");
  const [defaultMaxTokens, setDefaultMaxTokens] = useState<number | "">("");
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;

      const stored = JSON.parse(raw) as StoredSettings;

      if (stored.defaultProvider) {
        setDefaultProvider(stored.defaultProvider);

        const modelsForNext =
          PROVIDERS.find((p) => p.id === stored.defaultProvider)?.models ?? [];
        const fallback =
          stored.defaultModel ??
          DEFAULT_MODEL_BY_PROVIDER[stored.defaultProvider] ??
          modelsForNext.at(0)?.id ??
          "";
        setDefaultModel(fallback);
      } else if (stored.defaultModel) {
        setDefaultModel(stored.defaultModel);
      }

      if (typeof stored.defaultTemperature === "number") {
        setDefaultTemperature(stored.defaultTemperature);
      }

      if (typeof stored.defaultMaxTokens === "number") {
        setDefaultMaxTokens(stored.defaultMaxTokens);
      }
    } catch {
      // パースエラー等は無視する
    }
  }, []);

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
    mergeAndPersistSettings({
      defaultProvider: nextProvider,
      defaultModel: fallback,
    });
  };

  const handleModelChange = (next: string) => {
    setDefaultModel(next);
    mergeAndPersistSettings({ defaultModel: next });
  };

  const handleTemperatureChange = (value: string) => {
    if (value === "") {
      setDefaultTemperature("");
      mergeAndPersistSettings({ defaultTemperature: null });
      return;
    }

    const asNumber = Number(value);
    setDefaultTemperature(asNumber);
    mergeAndPersistSettings({ defaultTemperature: asNumber });
  };

  const handleMaxTokensChange = (value: string) => {
    if (value === "") {
      setDefaultMaxTokens("");
      mergeAndPersistSettings({ defaultMaxTokens: null });
      return;
    }

    const asNumber = Number(value);
    setDefaultMaxTokens(asNumber);
    mergeAndPersistSettings({ defaultMaxTokens: asNumber });
  };

  const handleClearSessions = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSIONS_STORAGE_KEY);
    }

    setLastActionMessage(
      "保存されているチャット履歴とセッション情報をすべて削除しました。",
    );
    setTimeout(() => setLastActionMessage(null), 3000);
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
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
              新しいチャットを開始する際の初期プロバイダやモデル、パラメータを設定します。
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
            <div className="space-y-2">
              <Label htmlFor="default-temperature">
                デフォルト温度（temperature）
              </Label>
              <Input
                id="default-temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={defaultTemperature}
                onChange={(event) => handleTemperatureChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                0 に近いほど決定的、値を大きくすると多様性が増します（0〜2 を推奨）。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-max-tokens">
                デフォルト最大トークン（max_tokens）
              </Label>
              <Input
                id="default-max-tokens"
                type="number"
                min={1}
                step={64}
                value={defaultMaxTokens}
                onChange={(event) => handleMaxTokensChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                応答の長さの上限です。未設定の場合は各プロバイダのデフォルトが利用されます。
              </p>
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
              <div className="animate-in fade-in slide-in-from-top-2 rounded-md bg-muted px-4 py-3 text-sm text-foreground">
                {lastActionMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

