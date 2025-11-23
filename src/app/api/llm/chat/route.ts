import { NextResponse } from "next/server";

import type { ChatRequest } from "@/types/llm";
import { getLLMClient, UnsupportedProviderError } from "@/lib/llm/clients";
import { isChatRequest } from "@/app/api/llm/chat/validation";

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

