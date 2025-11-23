import type { ChatProvider, LLMClient } from "@/types/llm";
import { getGeminiClient } from "@/lib/llm/gemini";

export class UnsupportedProviderError extends Error {
  readonly provider: ChatProvider;

  constructor(provider: ChatProvider) {
    super(`Provider "${provider}" is not implemented yet.`);
    this.name = "UnsupportedProviderError";
    this.provider = provider;
  }
}

export function getLLMClient(provider: ChatProvider): LLMClient {
  switch (provider) {
    case "gemini":
      return getGeminiClient();
    case "openai":
    case "claude":
      throw new UnsupportedProviderError(provider);
  }
}


