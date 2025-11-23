import { describe, expect, it, vi } from "vitest";

import type { ChatRequest } from "@/types/llm";
import { POST, __testUtils } from "@/app/api/llm/chat/route";

vi.mock("@/lib/llm/clients", () => {
  return {
    getLLMClient: () => ({
      // eslint-disable-next-line @typescript-eslint/require-await
      async chat(req: ChatRequest) {
        const lastMessage =
          req.messages.length > 0
            ? req.messages[req.messages.length - 1]
            : null;

        return {
          message: {
            role: "assistant",
            content: lastMessage ? `echo: ${lastMessage.content}` : "",
          },
          usage: {
            totalTokens: 42,
          },
        };
      },
    }),
    UnsupportedProviderError: class MockUnsupportedProviderError extends Error {
      provider: string;

      constructor(provider: string) {
        super(`Provider "${provider}" is not implemented yet.`);
        this.provider = provider;
      }
    },
  };
});

describe("api/llm/chat route", () => {
  describe("validation helpers", () => {
    it("rejects invalid chat request", () => {
      const { isChatRequest } = __testUtils;

      expect(isChatRequest(null)).toBe(false);
      expect(isChatRequest({})).toBe(false);
      expect(
        isChatRequest({
          provider: "gemini",
          model: "gemini-2.5-flash",
          messages: "not-an-array",
        }),
      ).toBe(false);
    });

    it("accepts valid chat request", () => {
      const { isChatRequest } = __testUtils;

      const valid: ChatRequest = {
        provider: "gemini",
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
        temperature: 0.7,
        maxTokens: 100,
      };

      expect(isChatRequest(valid)).toBe(true);
    });
  });

  describe("POST /api/llm/chat", () => {
    it("returns 400 when body is not valid JSON", async () => {
      // Requestのbodyを壊すためにtext/plainを送る
      const request = new Request("http://localhost/api/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "invalid-json",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as { error?: string };
      expect(json.error).toBe("Invalid JSON body");
    });

    it("returns 400 when payload does not match ChatRequest", async () => {
      const request = new Request("http://localhost/api/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foo: "bar",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as { error?: string };
      expect(json.error).toBe("Invalid chat request payload");
    });

    it("returns 200 and LLM response for valid request", async () => {
      const body: ChatRequest = {
        provider: "gemini",
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: "Ping",
          },
        ],
      };

      const request = new Request("http://localhost/api/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const json = (await response.json()) as {
        message: { role: string; content: string };
        usage?: { totalTokens?: number };
      };

      expect(json.message.role).toBe("assistant");
      expect(json.message.content).toBe("echo: Ping");
      expect(json.usage?.totalTokens).toBe(42);
    });
  });
});


