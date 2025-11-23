import { GoogleGenAI } from "@google/genai";

import type {
  ChatImage,
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

/**
 * ChatMessage の配列から、Gemini SDK が受け取れる
 * `contents` フォーマットへ変換するユーティリティ。
 * - system ロールは除外し、user / assistant のみを user/model にマッピングする。
 */
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

/**
 * メッセージ一覧から system ロールのみを抜き出し、
 * Gemini の systemInstruction 用テキストを生成する。
 */
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

/**
 * Gemini の generateContent レスポンスから、
 * - テキスト
 * - 画像（inlineData / fileData）
 * を安全に取り出して ChatImage[] として返す。
 *
 * SDK の型を直接参照せず、unknown から最低限必要な情報だけを抜き出すことで
 * 依存をゆるめている。
 */
function extractImagesFromGeminiResponse(
  response: unknown,
): { text: string; images: ChatImage[] } {
  const images: ChatImage[] = [];
  let text = "";

  if (!response || typeof response !== "object") {
    return { text, images };
  }

  const r = response as {
    text?: string;
    candidates?: unknown;
  };

  if (typeof r.text === "string" && r.text.length > 0) {
    text = r.text;
  }

  if (Array.isArray(r.candidates)) {
    for (const candidate of r.candidates) {
      if (!candidate || typeof candidate !== "object") continue;
      const c = candidate as { content?: unknown };
      const content = c.content;
      if (!content || typeof content !== "object") continue;
      const cc = content as { parts?: unknown };
      if (!Array.isArray(cc.parts)) continue;

      for (const part of cc.parts) {
        if (!part || typeof part !== "object") continue;
        const p = part as {
          text?: unknown;
          inlineData?: unknown;
          fileData?: unknown;
        };

        if (typeof p.text === "string" && text.length === 0) {
          text = p.text;
        }

        if (p.inlineData && typeof p.inlineData === "object") {
          const inline = p.inlineData as {
            data?: unknown;
            mimeType?: unknown;
          };
          const data =
            typeof inline.data === "string" ? inline.data : undefined;
          const mimeType =
            typeof inline.mimeType === "string"
              ? inline.mimeType
              : "image/png";

          if (data) {
            images.push({
              url: `data:${mimeType};base64,${data}`,
              alt: "Generated image",
            });
          }
        }

        if (p.fileData && typeof p.fileData === "object") {
          const file = p.fileData as {
            uri?: unknown;
            mimeType?: unknown;
          };
          const uri = typeof file.uri === "string" ? file.uri : undefined;

          if (uri) {
            images.push({
              url: uri,
              alt: "Generated image",
            });
          }
        }
      }
    }
  }

  return { text, images };
}

/**
 * Gemini 用の LLM クライアント実装。
 * - chat(): テキスト + 画像を含む ChatResponse を返す
 * - 内部で GoogleGenAI SDK を利用する
 */
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

      // 画像対応:
      // - 既存の response.text だけでなく candidates からもテキスト・画像を抽出する
      const { text, images } = extractImagesFromGeminiResponse(response);
      const content = text.length > 0 ? text : response.text ?? "";

      return {
        message: {
          role: "assistant",
          content,
          images: images.length > 0 ? images : undefined,
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
      model: "gemini-3-pro-preview",
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




