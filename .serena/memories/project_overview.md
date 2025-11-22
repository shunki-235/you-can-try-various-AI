# you-can-try-various-AI / マルチLLMチャットアプリ概要

- **目的**: OpenAI / Gemini / Claude など複数の LLM を 1 つの UI から切り替えて試せる開発者向けチャット Web アプリ。
- **主要技術スタック**:
  - Next.js 15 (App Router) / React 19 / TypeScript 5
  - スタイリング: Tailwind CSS 4 + `src/app/globals.css`
  - テスト: Vitest 3 (`tests/unit`), Playwright 1.55 (`tests/e2e`)
  - Lint: ESLint 9 (Flat Config)
- **構成 (主要ディレクトリ)**:
  - `src/app`: App Router ルート (`layout.tsx`, `page.tsx`, `(main)/chat`, `(main)/settings` 他)
  - `src/types`: 共通型定義 (`llm.ts` など)
  - `src/lib`: ドメインロジックや設定 (`llm/providers.ts` など)
  - `src/components`: UI コンポーネント群 (例: `components/chat`)
  - `tests/unit`, `tests/e2e`: ユニット/E2E テスト
- **設計方針**:
  - LLM クライアントは共通インターフェース + アダプタ方式で拡張可能にする。
  - API Key や共通パスワードは環境変数でのみ管理し、クライアントに露出させない。
  - 最初のフェーズではチャット画面・設定画面のモック UI を実装し、その後 LLM API レイヤと認証（共通パスワード + middleware）を追加する。