export type ChatProvider = "openai" | "gemini" | "claude";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  provider: ChatProvider;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: ChatUsage;
}

export interface LLMClient {
  chat(req: ChatRequest): Promise<ChatResponse>;
}


