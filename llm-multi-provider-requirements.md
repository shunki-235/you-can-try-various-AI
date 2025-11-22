## マルチLLM対応チャットWebアプリ 要件定義・設計（初版）

本ドキュメントは、ChatGPT（OpenAI）、Gemini（Google, nano/bakery系含むクラウドAPI）、Claude（Anthropic）の複数LLMを、API Keyを用いて切り替えながら利用できるWebアプリケーションの要件定義および基本設計をまとめたものです。
実装は Next.js 15 / React 19 / TypeScript を前提とします。

---

## 1. ゴール・コンセプト

- **ゴール**
  - OpenAI / Gemini / Claude など異なるベンダーのLLMを、**1つのUIから安全かつ柔軟に利用できる開発者向けチャットツール**を提供する。
  - 将来的にモデル追加（例: Ollama, LocalAI 等）がしやすいアーキテクチャにする。

- **非ゴール**
  - 商用SaaSとしての課金・ユーザー管理（認証/課金基盤など）は本フェーズでは対象外。
  - 複雑なプロンプトオーケストレーション・ツール実行・エージェント機能はMVPでは最小限。

---

## 2. 想定ユーザー・ユースケース

- **想定ユーザー**
  - LLM API を日常的に利用する開発者・プロンプトエンジニア
  - 各LLMの挙動差を比較したい研究者・検証担当者

- **主なユースケース**
  - 同じプロンプトを ChatGPT / Gemini / Claude で比較
  - モデルや各種パラメータ（温度など）を切り替えつつ試行錯誤
  - トークン使用量やレスポンス時間をざっくり確認

---

## 3. 機能要件（Functional Requirements）

### 3.1 チャットUI

- **F-1: チャット画面**
  - 入出力が見やすい2カラムまたは縦スクロール型のチャットUI
  - ユーザー入力欄、送信ボタン、Shift+Enterで改行
  - レスポンスの**ストリーミング表示**（OpenAI公式Node SDK等を利用）

- **F-2: セッション管理（MVPはクライアントローカル）**
  - ブラウザローカル（localStorage など）で会話履歴を保持
  - 過去セッション一覧から選択・削除
  - サーバー側DB永続化は将来拡張とし、本フェーズでは必須としない。

### 3.2 LLMプロバイダ切替・モデル選択

- **F-3: プロバイダ選択**
  - UI上で以下から選択可能
    - OpenAI（例: `gpt-4o`, `gpt-4.1-mini` など）
    - Gemini（例: `gemini-1.5-flash`, `gemini-1.5-pro` など）
    - Claude（例: `claude-3.5-sonnet` など）
  - 選択中プロバイダが明示されるように表示（ロゴ/ラベル）。

- **F-4: モデル・パラメータ設定**
  - プロバイダごとに代表的なモデル候補をプルダウンで選択
  - 共通パラメータ
    - 温度（temperature）
    - 最大トークン（max_tokens）※ベンダにより名称差を吸収
  - プロバイダ固有パラメータは、設計時点では最小限／将来拡張。

### 3.3 API Key 管理とセキュリティ

- **F-5: API Key 管理方法**
  - 各プロバイダの API Key は Next.js サーバー側の環境変数（`.env.local` など）で管理する。
  - 例: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` などを利用し、**UI上ではAPI Keyを表示・編集しない**。

- **F-6: API Key の保存ポリシー**
  - API Key は**サーバー環境変数のみ**に保存し、DBやブラウザの `localStorage` などには保存しない。
  - ログ出力時は、API Key や Authorization ヘッダをマスクまたは削除する。

- **F-7: Key バリデーション**
  - アプリケーション起動時、もしくは初回リクエスト時にバックエンド側で簡易ヘルスチェック（小さなプロンプト）を実施し、設定ミスを検知する。
  - エラー発生時は UI 上に「Key未設定/無効」の種別がわかるメッセージを表示し、詳細はサーバーログで確認できるようにする。

### 3.4 LLM 呼び出しAPI

- **F-8: 統一チャットAPI**
  - Next.js の Route Handler（`app/api/llm/chat/route.ts` を想定）で、以下のようなペイロードを受ける:
    - `provider`: `"openai" | "gemini" | "claude"`
    - `model`: 文字列
    - `messages`: Chat履歴（role + content）
    - `params`: 温度など
  - レスポンスは、各プロバイダのフォーマット差を吸収し、統一的な形で返却:
    - `messages`: 追加されたassistantメッセージ
    - `usage`: トークン数など（取得できる範囲でベストエフォート）

- **F-9: ストリーミング対応**
  - OpenAI Node SDK の `chat.completions.create({ stream: true })` または `stream()` ヘルパーを利用し、サーバーからクライアントへServer-Sent Events / fetchストリームで転送。
  - Gemini / Claude も可能な範囲でストリームAPIに追随し、同一のクライアント側インターフェースで扱う。

### 3.5 エラーハンドリング・リトライ

- **F-10: エラーメッセージ表示**
  - 認証エラー（401/403）、レート制限（429）、検閲エラー等をユーザーにわかりやすく表示。
  - サーバーログにはHTTPステータスと簡易メッセージのみ記録し、プロンプト・Key等の機微情報は記録しない。

- **F-11: リトライ**
  - 送信失敗時に「再実行」ボタンから同一プロンプトで再送可能。

### 3.6 認証・アクセス制御

- **F-12: 共通パスワードによるアクセス制限**
  - アプリ全体はクローズド利用を前提とし、**共通パスワード（例: `APP_PASSWORD`）によるシンプルなアクセス制御**を行う。
  - Next.js の `middleware.ts` で、認証済みクッキーをチェックし、未認証の場合はログイン画面へリダイレクトする。
  - 静的ファイルやAPIの一部（例: `/login`, `/api/health` など）は例外として認証なしでアクセス可能とする。

- **F-13: ログイン画面**
  - パスワード入力用のシンプルなログイン画面（1フィールド＋送信ボタン）を用意する。
  - 入力されたパスワードが環境変数 `APP_PASSWORD` の値と一致した場合に、HTTP Only + Secure なクッキー（例: `app_auth`）を発行し、その後トップページへ遷移させる。
  - パスワード誤り時は、汎用的なエラー文言（「認証に失敗しました」など）のみ表示し、正解に関するヒントは出さない。

---

## 4. 非機能要件（Non-Functional Requirements）

- **N-1: セキュリティ**
  - API Key はサーバーの環境変数（`.env.*`）のみに保存し、DBやブラウザストレージには保存しない。
  - アプリ全体へのアクセスは共通パスワード＋認証クッキーで保護し、URLを知っている第三者が勝手に利用できないようにする。
  - HTTPS 前提（開発中は localhost、公開時は TLS 必須）。
  - ログにAPI Keyやフルプロンプトを記録しない（必要であれば一部マスクしたサンプルのみ）。

- **N-2: パフォーマンス**
  - 初回ロードで200KB以内を目安（将来のコンポーネント分割を想定）。
  - ストリーミングレスポンスの初回トークン表示まで 2〜3秒以内を目標。

- **N-3: 可観測性**
  - 各リクエストに対して
    - プロバイダ名
    - モデル名
    - 成否
    - 所要時間
  - をサーバーログとして記録（ただしプロンプト/レスポンス本文は記録しない）。

- **N-4: 拡張性**
  - 追加のLLMプロバイダ（例: OpenAI互換API, ローカルモデル）を**アダプタ追加のみ**で実装できる構造（Strategyパターン相当）。

---

## 5. アーキテクチャ設計（概要）

### 5.1 全体構成

- **フロントエンド**
  - Next.js App Router（`src/app`）+ React 19
  - チャット画面、設定画面（デフォルトプロバイダ・モデル選択など）

- **バックエンド**
  - Next.js Route Handlers（`app/api/**/route.ts`）で BFF 層を実装
  - OpenAI / Gemini / Claude 各SDKまたはHTTPクライアントを呼び出す

- **データストア**
  - 本フェーズではサーバー永続化なし
  - クライアント側 `localStorage` にセッション一覧や簡易設定を保存

### 5.2 LLMクライアント抽象化

- **共通インターフェース（擬似）**

```ts
type ChatProvider = 'openai' | 'gemini' | 'claude';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  provider: ChatProvider;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface ChatResponse {
  message: ChatMessage;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

interface LLMClient {
  chat(req: ChatRequest): Promise<ChatResponse>;
  // chatStream(req: ChatRequest): AsyncIterable<Partial<ChatResponse>>; // 将来: ストリーミング用
}
```

- **アダプタ実装方針**
  - `OpenAIClient` : OpenAI Node SDK (`/openai/openai-node`) による `chat.completions.create` / `stream`
  - `GeminiClient`: Google AI SDK または REST API によるチャット呼び出し
  - `ClaudeClient`: Anthropic SDK または REST API によるチャット呼び出し
  - Route Handler では `provider` に応じて対応するクライアントをDIし、統一インターフェースで利用。

### 5.3 Next.js API レイヤ設計（概要）

- **エンドポイント例**
  - `POST /api/llm/chat`
    - Body: `ChatRequest` 相当
    - 処理:
      1. プロバイダ判定
      2. API Key 取得
         - サーバー環境変数（例: `process.env.OPENAI_API_KEY` 等）から取得
      3. 該当クライアントで LLM 呼び出し
      4. 統一フォーマット `ChatResponse` を返却

  - `POST /api/llm/chat/stream`（将来またはMVPで検討）
    - Server-Sent Events / fetch Streaming でトークン逐次送信。

### 5.4 認証・Middleware設計（共通パスワード方式）

- **認証の考え方**
  - すべての画面は「ログイン済み」であることを前提とし、**共通パスワードを知っている人だけがログイン可能**とする。
  - パスワードは環境変数 `APP_PASSWORD` に保存し、コード内にベタ書きしない。
  - 認証状態は HTTP Only + Secure なクッキー（例: `app_auth`）で管理する。

- **middleware の役割（擬似コード）**

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/health', '/favicon.ico'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 静的ファイルやログイン関連など、認証不要パス
  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('app_auth')?.value;

  // 認証済みクッキーが有効なら通す
  if (token && token === process.env.APP_PASSWORD) {
    return NextResponse.next();
  }

  // 未認証ならログインページへリダイレクト
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- **ログイン処理イメージ**
  - `/login` ページでフォーム送信 → `/api/login` もしくは Server Action でパスワード検証。
  - 正しければ `app_auth` クッキーを `process.env.APP_PASSWORD` でセットし、元のURL（`from` クエリ）にリダイレクト。
  - 誤りの場合はフォーム上にエラーメッセージ表示。

---

## 6. 画面設計（概要）

### 6.1 画面一覧

- **画面A: チャット画面（メイン）**
  - ヘッダー: アプリ名、プロバイダ選択、モデル選択
  - メイン: チャットログ（User / Assistant）
  - フッター: 入力欄、送信ボタン、トークン使用量表示エリア

- **画面B: 設定画面**
  - デフォルトプロバイダ / モデル選択
  - セッションデータのクリアボタン

### 6.2 UI/UX 要件

- **レスポンシブ対応**
  - PC / タブレット / スマホでの利用を想定。
  - スマホでは、セッション一覧はドロワーなどに格納。

- **アクセシビリティ**
  - キーボード操作のみで主要操作が可能（フォーカスリング、ショートカット）。
  - 色覚多様性を考慮したカラーパレット（Tailwindでテーマ化）。

---

## 7. API Key・コスト・リスクに関する検討事項

- **R-1: API Key 取り扱い**
  - クローズドサイトであっても、ブラウザで保持する場合は XSS 等により漏洩リスクがあるため、Content Security Policy 等で防御を強化。
  - `.env` で管理する共通Keyを利用する場合は、リポジトリにコミットしない / CIログに出さないなどの基本運用を徹底する。

- **R-2: コスト管理**
  - 本ツールは開発者本人および許可ユーザーが、自身の（または共有の）API契約を利用する前提のため、アプリ側課金は発生しない。
  - 誤爆プロンプトや巨大入力による想定外コストが発生しうるため、1リクエストあたりの maxTokens やメッセージ長に上限を設ける。

- **R-3: ベンダーロックイン回避**
  - LLMクライアントを共通インターフェース + アダプタ方式で実装し、個別SDKへの依存は境界層に閉じ込める。

---

## 8. 今後の拡張案（参考）

- プロンプトテンプレート機能（プロジェクト単位のテンプレ）
- RAG（ドキュメントアップロード / ベクター検索）との連携
- エクスポート機能（会話をMarkdown / JSONでダウンロード）
- チーム利用向けの認証・ロール管理

---

## 9. 実装フェーズに向けたタスクリスト（MVP想定）

1. Next.js プロジェクト初期化（または既存プロジェクト構成の確定）
2. 共通型定義・LLMクライアントインターフェース定義
3. OpenAI / Gemini / Claude 向けアダプタの最小実装
4. `POST /api/llm/chat` Route Handler 実装（非ストリーミング）
5. チャット画面・設定画面のUI実装
6. 共通パスワード＋middlewareによる認証・アクセス制御の実装
7. ストリーミング対応（OpenAI → 他プロバイダへ段階対応）
8. セキュリティヘッダ / CSP 等の基本設定


