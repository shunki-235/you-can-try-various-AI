export type ChatProvider = "openai" | "gemini" | "claude";

/**
 * 画像生成LLMが返す画像1枚分の情報。
 * 現状は data URL 形式 または 外部URI を想定している。
 */
export interface ChatImage {
  /** ブラウザでそのまま <img src> に渡せるURL（data URL も含む） */
  url: string;
  /** 画像の説明（アクセシビリティ・ツールチップ用途） */
  alt?: string;
}

/**
 * チャット1メッセージ分の構造。
 * テキストに加えて、必要に応じて複数枚の画像を添付できる。
 */
export interface ChatMessage {
  /** メッセージの役割（システム / ユーザー / アシスタント） */
  role: "system" | "user" | "assistant";
  /** メインのテキスト本文 */
  content: string;
  /** アシスタントが生成した画像一覧（存在しない場合は undefined） */
  images?: ChatImage[];
}

/**
 * LLM チャット API に投げるリクエスト全体。
 */
export interface ChatRequest {
  /** 使用する LLM プロバイダ */
  provider: ChatProvider;
  /** モデルID（Gemini, OpenAI などプロバイダ固有の名前） */
  model: string;
  /** 会話履歴（過去のメッセージを含む） */
  messages: ChatMessage[];
  /** 生成温度（クリエイティビティ制御） */
  temperature?: number;
  /** 最大トークン数（レスポンス上限） */
  maxTokens?: number;
}

/**
 * LLM 側で計測されたトークン使用量。
 */
export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * LLM から返ってくるチャットレスポンス。
 * テキストと画像、使用トークン数などをまとめて扱う。
 */
export interface ChatResponse {
  message: ChatMessage;
  usage?: ChatUsage;
}

/**
 * 各プロバイダのクライアントが満たすべき最小インターフェース。
 */
export interface LLMClient {
  chat(req: ChatRequest): Promise<ChatResponse>;
}


