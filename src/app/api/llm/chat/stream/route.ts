import type { ChatRequest } from "@/types/llm";
import { isChatRequest } from "@/app/api/llm/chat/validation";
import { streamGeminiChat } from "@/lib/llm/gemini";

export async function POST(req: Request): Promise<Response> {
  let json: unknown;

  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (!isChatRequest(json)) {
    return new Response(
      JSON.stringify({ error: "Invalid chat request payload" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const body: ChatRequest = json;

  if (body.provider !== "gemini") {
    return new Response(
      JSON.stringify({
        error: "Streaming is currently supported only for provider 'gemini'.",
      }),
      {
        status: 501,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const chunk of streamGeminiChat(body)) {
          controller.enqueue(encoder.encode(chunk));
        }

        const finishedAt = Date.now();
        // ベーシックな可観測性: 本文やKeyは含めずにログを残す
        // eslint-disable-next-line no-console
        console.info(
          "[llm-chat-stream] success",
          JSON.stringify({
            provider: body.provider,
            model: body.model,
            durationMs: finishedAt - startedAt,
          }),
        );

        controller.close();
      } catch (error) {
        const finishedAt = Date.now();
        // eslint-disable-next-line no-console
        console.error(
          "[llm-chat-stream] error",
          JSON.stringify({
            provider: body.provider,
            model: body.model,
            durationMs: finishedAt - startedAt,
            error:
              error instanceof Error
                ? error.message
                : typeof error === "string"
                  ? error
                  : "Unknown error",
          }),
        );

        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}


