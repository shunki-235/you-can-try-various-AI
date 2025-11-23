import type { ChatMessage, ChatRequest, ChatProvider } from "@/types/llm";

const VALID_ROLES: ChatMessage["role"][] = ["system", "user", "assistant"];

const VALID_PROVIDERS: ChatProvider[] = ["openai", "gemini", "claude"];

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const v = value as { role?: unknown; content?: unknown };

  return (
    typeof v.content === "string" &&
    VALID_ROLES.includes(v.role as (typeof VALID_ROLES)[number])
  );
}

export function isChatRequest(value: unknown): value is ChatRequest {
  if (!value || typeof value !== "object") return false;

  const v = value as {
    provider?: unknown;
    model?: unknown;
    messages?: unknown;
    temperature?: unknown;
    maxTokens?: unknown;
  };

  if (!VALID_PROVIDERS.includes(v.provider as ChatProvider)) {
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


