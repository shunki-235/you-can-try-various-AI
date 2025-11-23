/**
 * シンプルなセッション管理
 *
 * - 共通パスワード方式前提のため、暗号学的な署名は行わない
 * - Edge Runtime / Node Runtime の両方で動作することを優先
 */

// セッション有効期限（秒） 12時間
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getAppPassword(): string | null {
  const password = process.env.APP_PASSWORD;
  if (!password || password.length === 0) {
    return null;
  }
  return password;
}

/**
 * 新しいセッショントークンを生成
 *
 * - 現状は APP_PASSWORD をそのままトークンとして利用する
 * - Cookie 側で HttpOnly / Secure / maxAge により保護する前提のシンプル設計
 */
export async function createSession(): Promise<string> {
  const appPassword = getAppPassword();
  if (!appPassword) {
    throw new Error(
      "APP_PASSWORD environment variable is required for session management",
    );
  }
  return appPassword;
}

/**
 * セッショントークンが有効かどうか判定
 *
 * - Cookie の値が APP_PASSWORD と一致しているかだけを確認する
 */
export async function isValidSession(
  token: string | undefined,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const appPassword = getAppPassword();
  if (!appPassword) {
    return false;
  }

  return token === appPassword;
}

/**
 * セッションを削除（現状はクッキー削除に依存するため no-op）
 */
export function deleteSession(_token: string): void {
  // クッキーを削除する実装側で対応する想定のため、ここでは何もしない
}

/**
 * 期限切れセッションのクリーンアップ（no-op）
 */
export function cleanupExpiredSessions(): number {
  // サーバー側でセッション状態を保持していないため、クリーンアップ対象は存在しない
  return 0;
}


