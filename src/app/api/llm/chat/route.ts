import { NextResponse } from "next/server";

import type { ChatMessage, ChatRequest } from "@/types/llm";
import { getLLMClient, UnsupportedProviderError } from "@/lib/llm/clients";

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const v = value as { role?: unknown; content?: unknown };

  const validRoles = ["system", "user", "assistant"] as const;

  return (
    typeof v.content === "string" &&
    validRoles.includes(v.role as (typeof validRoles)[number])
  );
}

function isChatRequest(value: unknown): value is ChatRequest {
  if (!value || typeof value !== "object") return false;

  const v = value as {
    provider?: unknown;
    model?: unknown;
    messages?: unknown;
    temperature?: unknown;
    maxTokens?: unknown;
  };

  const validProviders = ["openai", "gemini", "claude"] as const;

  if (!validProviders.includes(v.provider as (typeof validProviders)[number])) {
    return false;
  }

  if (typeof v.model !== "string") {
    return false;
  }

  if (!Array.isArray(v.messages) || v.messages.some((m) => !isChatMessage(m))) {
    return false;
  }

  if (
    typeof v.temperature !== "undefined" &&
    typeof v.temperature !== "number"
  ) {
    return false;
  }

  if (
    typeof v.maxTokens !== "undefined" &&
    typeof v.maxTokens !== "number"
  ) {
    return false;
  }

  return true;
}

export async function POST(req: Request): Promise<Response> {
  let json: unknown;

  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      {
        status: 400,
      },
    );
  }

  if (!isChatRequest(json)) {
    return NextResponse.json(
      { error: "Invalid chat request payload" },
      {
        status: 400,
      },
    );
  }

  const body: ChatRequest = json;

  const startedAt = Date.now();

  try {
    const client = getLLMClient(body.provider);
    const result = await client.chat(body);

    const finishedAt = Date.now();

    // ベーシックな可観測性: プロンプト本文やKeyは含めずにログを残す
    // eslint-disable-next-line no-console
    console.info(
      "[llm-chat] success",
      JSON.stringify({
        provider: body.provider,
        model: body.model,
        durationMs: finishedAt - startedAt,
      }),
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const finishedAt = Date.now();

    if (error instanceof UnsupportedProviderError) {
      // eslint-disable-next-line no-console
      console.warn(
        "[llm-chat] unsupported provider",
        JSON.stringify({
          provider: error.provider,
          durationMs: finishedAt - startedAt,
        }),
      );

      return NextResponse.json(
        {
          error: "Selected provider is not supported yet.",
          provider: error.provider,
        },
        { status: 501 },
      );
    }

    // ここでは詳細メッセージはログにのみ残し、レスポンスは汎用メッセージにとどめる
    // eslint-disable-next-line no-console
    console.error(
      "[llm-chat] error",
      JSON.stringify({
        provider: body.provider,
        model: body.model,
        durationMs: finishedAt - startedAt,
        // エラー詳細はログにのみ保持
        error:
          error instanceof Error ? error.message : typeof error === "string"
            ? error
            : "Unknown error",
      }),
    );

    return NextResponse.json(
      {
        error: "LLM chat request failed.",
      },
      { status: 500 },
    );
  }
}

// テスト用にエクスポート
export const __testUtils = {
  isChatMessage,
  isChatRequest,
};


