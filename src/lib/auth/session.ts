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
  const secret = process.env.SESSION_SECRET || process.env.APP_PASSWORD;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET or APP_PASSWORD environment variable is required for secure session management"
    );
  }

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
 * ArrayBuffer / Uint8Array を 16進文字列に変換（Edge / Node 両対応）
 */
function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let hex = "";
  for (let i = 0; i < array.length; i++) {
    hex += array[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * 16進文字列を Uint8Array に変換（Edge / Node 両対応）
 */
function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const length = hex.length / 2;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error("Invalid hex string");
    }
    bytes[i] = byte;
  }

  return bytes;
}

/**
 * トークンに署名を追加
 */
async function signToken(payload: string): Promise<string> {
  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, data);

  // URL-safe な 16進文字列として署名をエンコード
  const signatureHex = toHex(signature);

  return `${payload}.${signatureHex}`;
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

    const [payload, signatureHex] = parts;
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // 16進文字列をデコード
    const signatureBytes = fromHex(signatureHex);

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
