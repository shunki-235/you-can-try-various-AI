import { GoogleGenAI } from "@google/genai";

import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  LLMClient,
} from "@/types/llm";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getApiKey(): string {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please configure it in your environment.",
    );
  }
  return GEMINI_API_KEY;
}

function buildPromptFromMessages(
  messages: ChatMessage[],
): Array<{ role: "user" | "model"; parts: { text: string }[] }> {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
}

function buildSystemInstruction(
  messages: ChatMessage[],
): { role: "system"; parts: [{ text: string }] } | undefined {
  const systemInstructionText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();

  return systemInstructionText.length > 0
    ? { role: "system", parts: [{ text: systemInstructionText }] }
    : undefined;
}

export class GeminiClient implements LLMClient {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string = getApiKey()) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    if (req.provider !== "gemini") {
      throw new Error(
        `GeminiClient can only handle provider "gemini" (received: "${req.provider}")`,
      );
    }

    const contents = buildPromptFromMessages(req.messages);
    const systemInstruction = buildSystemInstruction(req.messages);

    try {
      const response = await this.ai.models.generateContent({
        model: req.model,
        contents,
        config: {
          temperature: req.temperature,
          maxOutputTokens: req.maxTokens,
          systemInstruction,
        },
      });

      const totalTokens = response.usageMetadata?.totalTokenCount;

      return {
        message: {
          role: "assistant",
          content: response.text ?? "",
        },
        usage:
          typeof totalTokens === "number"
            ? {
                totalTokens,
              }
            : undefined,
      };
    } catch (error) {
      throw new Error(
        `Gemini API request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

let sharedClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!sharedClient) {
    sharedClient = new GeminiClient();
  }
  return sharedClient;
}

/**
 * Gemini のストリーミングレスポンスをテキストチャンクとして返すヘルパー。
 * 各チャンクはそのままクライアントにストリーム転送できる前提で設計する。
 */
export async function* streamGeminiChat(
  req: ChatRequest,
): AsyncGenerator<string, void, unknown> {
  if (req.provider !== "gemini") {
    throw new Error(
      `streamGeminiChat can only handle provider "gemini" (received: "${req.provider}")`,
    );
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const contents = buildPromptFromMessages(req.messages);
  const systemInstruction = buildSystemInstruction(req.messages);

  try {
    const response = await ai.models.generateContentStream({
      model: req.model,
      contents,
      config: {
        temperature: req.temperature,
        maxOutputTokens: req.maxTokens,
        systemInstruction,
      },
    });

    for await (const chunk of response) {
      const text = chunk.text ?? "";
      if (text.length > 0) {
        yield text;
      }
    }
  } catch (error) {
    throw new Error(
      `Gemini streaming API request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function checkGeminiHealth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: "ping" }],
        },
      ],
      config: {
        maxOutputTokens: 1,
      },
    });

    if (!response) {
      return {
        ok: false,
        error: "Empty response from Gemini",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unknown Gemini error",
    };
  }
}




