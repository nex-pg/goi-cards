// 永続化の薄いラッパ。docs/02 の推奨に従い react-native-mmkv を使用。
// MMKV は JSI ネイティブモジュールのため Expo Go では動かない（EAS Dev Client が必要）。
// 開発中に Expo Go でも UI を確認できるよう、初期化に失敗した場合はメモリ上の
// フォールバックに切り替える（この場合は永続化されない＝再起動で消える）。
//
// Expo Go には MMKV / Nitro のネイティブモジュールが含まれないため、static import だと
// モジュール読み込み時点で落ちる。遅延 require + try/catch で「ロード失敗」も握りつぶす。

interface KV {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

function createMemoryKV(): KV {
  const mem = new Map<string, string>();
  return {
    getString: (k) => mem.get(k),
    set: (k, v) => {
      mem.set(k, v);
    },
  };
}

let kv: KV;
export let persistent = true;

try {
  // 遅延 require: モジュールのロード自体が失敗しても捕捉できる（Expo Go 対策）。
  const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
  kv = createMMKV({ id: 'goiapp' });
} catch (e) {
  // ネイティブモジュール未ロード（Expo Go 等）。メモリフォールバック。
  persistent = false;
  kv = createMemoryKV();
  if (__DEV__) {
    console.warn(
      '[storage] MMKV を初期化できませんでした。メモリ上のフォールバックを使用します（永続化されません）。EAS Dev Client で実行してください。'
    );
  }
}

export const storage = kv;

export function readJSON<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch (e) {
    if (__DEV__) console.warn('[storage] 書き込み失敗', e);
  }
}
