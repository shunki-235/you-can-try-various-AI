import type { ChatProvider } from "@/types/llm";

export interface ProviderModelOption {
  id: string;
  label: string;
}

export interface ProviderOption {
  id: ChatProvider;
  label: string;
  models: ProviderModelOption[];
}

export const PROVIDERS: ProviderOption[] = [
  {
    id: "openai",
    label: "OpenAI（実装中）",
    models: [
      { id: "gpt-5.1", label: "GPT-5.1" },
      { id: "gpt-5-mini", label: "GPT-5-mini" },
      { id: "gpt-4.1", label: "GPT-4.1（旧世代）" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    models: [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash（高速/Nano Banana 系）",
      },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro（高性能）" },
      {
        id: "gemini-3-pro-preview",
        label: "Gemini 3 Pro Preview（最新・高性能・マルチモーダル/プレビュー）",
      },
      {
        id: "gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image Preview（画像マルチモーダル・プレビュー）",
      },
      {
        id: "gemini-2.5-flash-image",
        label: "Gemini 2.5 Flash Image（画像/Nano Banana）",
      },
    ],
  },
  {
    id: "claude",
    label: "Claude（実装中）",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5（推奨）" },
      {
        id: "claude-3-5-haiku-latest",
        label: "Claude 3.5 Haiku Latest（高速）",
      },
    ],
  },
];

export const DEFAULT_PROVIDER_ID: ChatProvider = "gemini";

export const DEFAULT_MODEL_BY_PROVIDER: Record<ChatProvider, string> = {
  openai: "gpt-5-mini",
  gemini: "gemini-3-pro-preview",
  claude: "claude-sonnet-4-5",
};


