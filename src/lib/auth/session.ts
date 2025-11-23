/**
 * Edge Runtime対応のセッショントークン管理
 * Web Crypto APIを使用してHMAC署名付きトークンを生成・検証
 */

// セッション有効期限（12時間）
const SESSION_MAX_AGE_MS = 60 * 60 * 12 * 1000;

/**
 * 署名キーを取得（環境変数から、なければAPP_PASSWORDを使用）
 */
async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET || process.env.APP_PASSWORD || "default-secret";

  // Web Crypto APIでHMACキーを生成
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Base64URLエンコード（Edge Runtime対応）
 */
function base64UrlEncode(bytes: ArrayBuffer): string {
  const uint8Array = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Base64URLデコード（Edge Runtime対応）
 */
function base64UrlDecode(base64: string): ArrayBuffer {
  const base64Normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  // Base64URLでは '=' パディングが削除されるため、復元が必要
  const paddingLength = (4 - (base64Normalized.length % 4)) % 4;
  const base64WithPadding = base64Normalized + "=".repeat(paddingLength);
  const binary = atob(base64WithPadding);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * トークンに署名を追加
 */
async function signToken(payload: string): Promise<string> {
  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, data);

  // Base64URLエンコード（URL-safe）
  const signatureBase64 = base64UrlEncode(signature);

  return `${payload}.${signatureBase64}`;
}

/**
 * トークンの署名を検証
 */
async function verifyToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return false;
    }

    const [payload, signature] = parts;
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // Base64URLデコード
    const signatureBytes = base64UrlDecode(signature);

    return await crypto.subtle.verify("HMAC", key, signatureBytes, data);
  } catch {
    // デコードエラーや検証エラーが発生した場合は無効なトークンとして扱う
    return false;
  }
}

/**
 * 新しいセッショントークンを生成
 * 形式: {timestamp}.{signature}
 */
export async function createSession(): Promise<string> {
  const timestamp = Date.now();
  const payload = timestamp.toString();
  return await signToken(payload);
}

/**
 * セッショントークンが有効かチェック（Edge Runtime対応）
 */
export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  // 署名を検証
  const isValid = await verifyToken(token);
  if (!isValid) {
    return false;
  }

  // 有効期限をチェック
  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const timestamp = parseInt(parts[0], 10);
  if (isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  if (now - timestamp > SESSION_MAX_AGE_MS) {
    return false;
  }

  return true;
}

/**
 * セッションを削除（Edge Runtimeでは不要だが、互換性のため残す）
 */
export function deleteSession(_token: string): void {
  // Edge Runtimeではメモリ管理ができないため、何もしない
  // 有効期限チェックで自動的に無効化される
}

/**
 * 期限切れセッションをクリーンアップ（Edge Runtimeでは不要）
 */
export function cleanupExpiredSessions(): number {
  // Edge Runtimeではメモリ管理ができないため、0を返す
  return 0;
}
