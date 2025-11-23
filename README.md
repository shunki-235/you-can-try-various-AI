# マルチLLM対応チャット Web アプリ

このリポジトリは、`llm-multi-provider-requirements.md` で定義された要件に基づき、
**OpenAI / Gemini / Claude** など複数プロバイダの LLM を 1 つの UI から切り替えて利用できる
開発者向けチャットツールの Next.js プロジェクトです。

## 主な機能

- ✅ **マルチプロバイダ対応**: OpenAI、Gemini、Claude を同一UIから切り替え可能
- ✅ **ストリーミング対応**: リアルタイムでレスポンスを表示
- ✅ **セッション管理**: ブラウザローカルストレージで会話履歴を保存・管理
- ✅ **認証機能**: 共通パスワードによるアクセス制御
- ✅ **プロバイダヘルスチェック**: API Key の有効性を事前確認

## 技術スタック

- **フレームワーク**: Next.js 15（App Router, `src/app` 構成）
- **言語**: TypeScript 5（`strict` モード）
- **フロントエンド**: React 19
- **スタイリング**: Tailwind CSS 4
- **UIコンポーネント**: Radix UI（アクセシブルなプリミティブ）
- **パッケージマネージャ**: pnpm
- **テスト**: Vitest（単体テスト）、Playwright（E2Eテスト）
- **品質管理**: ESLint、TypeScript、Lighthouse CI

詳細な要件・設計は `./llm-multi-provider-requirements.md` を参照してください。

---

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

ルートディレクトリに `.env.local` を作成し、以下の環境変数を設定します：

```bash
# LLM プロバイダの API Key（使用するプロバイダのみ設定）
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...

# アプリ全体を保護する共通パスワード（必須）
APP_PASSWORD=your-shared-password
```

### 3. 開発サーバの起動

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` を開くとログイン画面が表示されます。
認証後、チャット画面（`/chat`）にリダイレクトされます。

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

## 認証とアクセス制御

このアプリは共通パスワードによる認証で保護されています。

- **ログイン**: `/login` ページで共通パスワードを入力
- **保護対象**: チャット画面、設定画面、LLM API エンドポイント
- **公開パス**: `/login`、`/api/health` などは認証不要

認証が必要なページに未認証でアクセスすると、自動的にログイン画面にリダイレクトされます。

---

## ディレクトリ構成

```text
.
├── llm-multi-provider-requirements.md  # 要件定義・設計ドキュメント
├── src/
│   ├── app/
│   │   ├── (main)/                     # 認証保護が必要なページグループ
│   │   │   ├── layout.tsx              # メインレイアウト
│   │   │   ├── chat/
│   │   │   │   └── page.tsx            # チャット画面（メイン機能）
│   │   │   └── settings/
│   │   │       └── page.tsx            # 設定画面
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts            # ヘルスチェック API
│   │   │   ├── llm/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── route.ts        # チャット API（非ストリーミング）
│   │   │   │   │   ├── stream/
│   │   │   │   │   │   └── route.ts    # ストリーミングチャット API
│   │   │   │   │   └── validation.ts  # リクエストバリデーション
│   │   │   │   └── health/
│   │   │   │       └── route.ts        # LLM プロバイダヘルスチェック
│   │   │   └── login/
│   │   │       └── route.ts            # ログイン API
│   │   ├── login/
│   │   │   └── page.tsx                # ログイン画面
│   │   ├── layout.tsx                  # ルートレイアウト
│   │   ├── page.tsx                    # ルートページ（/chat へリダイレクト）
│   │   └── globals.css                 # グローバルスタイル（Tailwind）
│   ├── components/
│   │   ├── ui/                         # Radix UI ベースのプリミティブコンポーネント
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   └── textarea.tsx
│   │   └── chat/                       # チャット関連コンポーネント
│   ├── lib/
│   │   ├── auth/
│   │   │   └── session.ts              # セッション管理（認証トークン検証）
│   │   ├── llm/
│   │   │   ├── clients.ts             # LLM クライアントファクトリ
│   │   │   ├── gemini.ts              # Gemini クライアント実装
│   │   │   └── providers.ts           # プロバイダ・モデル定義
│   │   └── utils.ts                   # ユーティリティ関数
│   ├── middleware.ts                   # Next.js ミドルウェア（認証チェック）
│   └── types/
│       └── llm.ts                     # LLM 関連の型定義
├── tests/
│   ├── unit/                          # Vitest 単体テスト
│   │   ├── api-llm-chat-route.test.ts
│   │   └── example.test.ts
│   └── e2e/                           # Playwright E2E テスト
│       └── example.spec.ts
├── public/                            # 静的アセット（画像、フォントなど）
├── eslint.config.mjs                  # ESLint 設定（Flat Config）
├── next.config.ts                     # Next.js 設定
├── tsconfig.json                      # TypeScript 設定
├── vitest.config.mts                  # Vitest 設定
├── playwright.config.ts               # Playwright 設定
├── postcss.config.mjs                 # PostCSS 設定（Tailwind v4）
└── lighthouserc.json                 # Lighthouse CI 設定
```

## 主要な実装詳細

### 認証システム

- **ミドルウェア**: `src/middleware.ts` で認証チェックを実施
- **セッション管理**: `src/lib/auth/session.ts` でトークン検証とセッション管理
- **ログイン**: `/api/login` でパスワード検証後、認証クッキーを発行

### LLM クライアント抽象化

- **統一インターフェース**: `src/lib/llm/clients.ts` でプロバイダ切り替え
- **実装済みプロバイダ**: Gemini（`src/lib/llm/gemini.ts`）
- **拡張可能**: 新しいプロバイダは `LLMClient` インターフェースを実装

### API エンドポイント

- `POST /api/llm/chat`: 非ストリーミングチャット
- `POST /api/llm/chat/stream`: ストリーミングチャット（Server-Sent Events）
- `GET /api/llm/health`: プロバイダごとの API Key 有効性チェック
- `POST /api/login`: 認証処理
- `GET /api/health`: アプリケーションヘルスチェック

### セッション管理

- **ストレージ**: ブラウザの `localStorage` を使用
- **データ構造**: セッションID、タイトル、作成日時、更新日時、メッセージ履歴
- **機能**: セッション作成、削除、切り替え、タイトル自動生成

---

## 使い方

### チャット機能

1. **ログイン**: 共通パスワードを入力してログイン
2. **プロバイダ選択**: ヘッダーから使用する LLM プロバイダを選択
3. **モデル選択**: プロバイダに応じたモデルを選択
4. **会話開始**: メッセージを入力して送信（Shift+Enter で改行）
5. **セッション管理**: サイドバーでセッションの作成・切り替え・削除が可能

### 設定画面

`/settings` でデフォルトのプロバイダやモデルを設定できます。

---

## 開発時の注意事項

### 環境変数

- `.env.local` は Git にコミットしないでください（`.gitignore` に含まれています）
- 本番環境では環境変数を適切に設定してください

### テスト

- 単体テスト: `pnpm test` で実行
- E2Eテスト: `pnpm e2e` で実行（開発サーバーが起動している必要があります）
- テストファイルは `tests/unit/` と `tests/e2e/` に配置

### コード品質

- TypeScript の `strict` モードを有効化
- ESLint でコード品質をチェック（`pnpm lint`）
- `any` 型の使用は避け、適切な型定義を使用

### プロバイダ追加

新しい LLM プロバイダを追加する場合：

1. `src/lib/llm/` に新しいクライアント実装を追加
2. `src/lib/llm/clients.ts` の `LLMClient` インターフェースを実装
3. `src/lib/llm/providers.ts` にプロバイダ情報を追加
4. 環境変数に API Key を追加

---

## トラブルシューティング

### ログインできない

- `.env.local` に `APP_PASSWORD` が正しく設定されているか確認
- ブラウザのクッキーが有効になっているか確認

### LLM が応答しない

- `.env.local` に対応するプロバイダの API Key が設定されているか確認
- `/api/llm/health` でプロバイダのヘルスチェックを実行
- ブラウザの開発者ツールでネットワークエラーを確認

### ビルドエラー

- `pnpm install` で依存関係を再インストール
- `pnpm typecheck` で型エラーを確認
- `pnpm lint` でコード品質を確認

---

