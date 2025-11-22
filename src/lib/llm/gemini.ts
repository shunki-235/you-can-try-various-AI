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

    const systemInstructionText = req.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n")
      .trim();

    const systemInstruction =
      systemInstructionText.length > 0
        ? {
            role: "user",
            parts: [{ text: systemInstructionText }],
          }
        : undefined;

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
  }
}

let sharedClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!sharedClient) {
    sharedClient = new GeminiClient();
  }
  return sharedClient;
}


