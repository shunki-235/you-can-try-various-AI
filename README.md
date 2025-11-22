# マルチLLM対応チャット Web アプリ

このリポジトリは、`llm-multi-provider-requirements.md` で定義された要件に基づき、
**OpenAI / Gemini / Claude** など複数プロバイダの LLM を 1 つの UI から切り替えて利用できる
開発者向けチャットツールの Next.js プロジェクトです。

- フレームワーク: Next.js 15（App Router, `src/app` 構成）
- 言語: TypeScript 5（`strict`）
- フロントエンド: React 19
- パッケージマネージャ: pnpm

詳細な要件・設計は `./llm-multi-provider-requirements.md` を参照してください。

---

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 開発サーバの起動

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` を開くとアプリを確認できます。
UI のエントリポイントは `src/app/page.tsx` です。

---

## 利用スクリプト

- `pnpm dev`
  開発サーバを起動します。

- `pnpm build`
  本番ビルドを実行します。

- `pnpm start`
  ビルド済みアプリを本番モードで起動します。

- `pnpm lint`
  ESLint による静的解析を実行します。

- `pnpm typecheck`
  TypeScript の型チェックを `tsc --noEmit` で実行します。

- `pnpm test`
  Vitest による単体テストを実行します（`tests/unit/**/*`）。

- `pnpm test:ui`
  Vitest UI を起動します。

- `pnpm e2e`
  Playwright による E2E テストを実行します（`tests/e2e/**/*`）。

- `pnpm lhci`
  `lighthouserc.json` の設定に基づき Lighthouse CI を実行します。

---

## 環境変数

ルートディレクトリに `.env.local` を作成し、各プロバイダの API Key とアプリ共通パスワードを設定します。
（値は例です。実際のキーを入力してください）

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...

# アプリ全体を保護する共通パスワード
APP_PASSWORD=your-shared-password
```

これらの値は Next.js サーバー側のみで利用し、ブラウザや DB に保存しない運用を前提としています。

---

## ディレクトリ構成（抜粋）

```text
.
├── llm-multi-provider-requirements.md  # 要件定義・設計ドキュメント
├── src
│   └── app
│       ├── layout.tsx                  # 共通レイアウト
│       ├── page.tsx                    # チャット画面（エントリポイント）
│       └── globals.css                 # グローバルスタイル（Tailwind 連携）
├── tests
│   ├── unit                            # Vitest 単体テスト
│   └── e2e                             # Playwright E2E テスト
├── public                              # 画像などの静的アセット
├── eslint.config.mjs                   # ESLint 設定
├── next.config.ts                      # Next.js 設定
├── tsconfig.json                       # TypeScript 設定
├── vitest.config.mts                   # Vitest 設定
├── playwright.config.ts                # Playwright 設定
└── lighthouserc.json                   # Lighthouse CI 設定
```
