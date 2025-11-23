import { NextResponse } from "next/server";

import { checkGeminiHealth } from "@/lib/llm/gemini";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

type ProviderHealthSummary = {
  hasApiKey: boolean;
  ok?: boolean;
  error?: string;
  implemented?: boolean;
};

export async function GET(): Promise<Response> {
  const startedAt = Date.now();

  const geminiHealth = await checkGeminiHealth();

  const providers: Record<string, ProviderHealthSummary> = {
    gemini: {
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      ok: geminiHealth.ok,
      error: geminiHealth.error,
    },
    openai: {
      hasApiKey: Boolean(OPENAI_API_KEY),
      implemented: false,
    },
    claude: {
      hasApiKey: Boolean(ANTHROPIC_API_KEY),
      implemented: false,
    },
  };

  const finishedAt = Date.now();

  // ベーシックな可観測性: プロバイダごとの状態と所要時間のみをログに出す
  // eslint-disable-next-line no-console
  console.info(
    "[llm-health] result",
    JSON.stringify({
      durationMs: finishedAt - startedAt,
      providers: {
        gemini: {
          hasApiKey: providers.gemini.hasApiKey,
          ok: providers.gemini.ok,
        },
        openai: {
          hasApiKey: providers.openai.hasApiKey,
          implemented: providers.openai.implemented,
        },
        claude: {
          hasApiKey: providers.claude.hasApiKey,
          implemented: providers.claude.implemented,
        },
      },
    }),
  );

  return NextResponse.json({ providers });
}


