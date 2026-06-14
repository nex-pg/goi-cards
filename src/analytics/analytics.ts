// 自社アプリ内の利用分析（PostHog）。docs/05 §3。
// - IDFA（広告ID）は使わない（PostHog RN はデフォルトで収集しない／こちらでも有効化しない）。
// - 個人特定はせず匿名IDで集計。
// - APIキー(EXPO_PUBLIC_POSTHOG_KEY)が無ければ no-op。Expo Go でロード失敗しても握りつぶす。
// - App Store Connect のプライバシーラベルで "Usage Data / Analytics" を申告すること（ATTとは別物）。
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// SDK は遅延ロードのため any で扱う（型解決・Expo Go 未ロードの両対応）
let posthog: any = null;
let optedOut = false;

export function initAnalytics(): void {
  if (posthog || !KEY) return;
  try {
    const PostHog = require('posthog-react-native').default;
    // 自動収集は最小限に。アプリ起動だけでは何も送らず、明示的な capture() のみ送信する。
    posthog = new PostHog(KEY, {
      host: HOST,
      captureNativeAppLifecycleEvents: false,
      // セッションリプレイ等は使わない（デフォルト無効だが明示）
    });
    // 既にオプトアウトされている場合は SDK 側にも反映
    if (optedOut) {
      try {
        posthog.optOut?.();
      } catch {}
    }
  } catch (e) {
    if (__DEV__) console.warn('[analytics] 初期化に失敗（未導入/ExpoGo等）', e);
  }
}

// 任意のオプトアウト（設定に置くなら呼ぶ）。
export function setAnalyticsOptOut(v: boolean): void {
  optedOut = v;
  try {
    if (v) posthog?.optOut?.();
    else posthog?.optIn?.();
  } catch {}
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!posthog || optedOut) return;
  try {
    posthog.capture(event, props);
  } catch {}
}

// イベント名（docs/05 §3 のイベント設計）
export const Ev = {
  quizStarted: 'quiz_started', // {source, cats?, tags?, levels?, count, mode?}
  quizFinished: 'quiz_finished', // {total, known}
  cardRevealed: 'card_revealed',
  tagSet: 'tag_set', // {status}
  bookmarkToggled: 'bookmark_toggled',
  folderCreated: 'folder_created',
  proGateShown: 'pro_gate_shown', // {source}
  proPurchaseStarted: 'pro_purchase_started',
  proPurchased: 'pro_purchased',
  restoreClicked: 'restore_clicked',
} as const;
