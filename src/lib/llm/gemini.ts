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
): Array<{ role: ChatMessage["role"]; parts: { text: string }[] }> {
  return messages.map((message) => ({
    role: message.role,
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

    const response = await this.ai.models.generateContent({
      model: req.model,
      contents,
      config: {
        temperature: req.temperature,
        maxOutputTokens: req.maxTokens,
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


