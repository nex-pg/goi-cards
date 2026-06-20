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
    // IP/位置情報の匿名化（GDPR配慮）。全イベントに付与:
    //  - $ip を 0.0.0.0 に上書き → 実IPを保存しない
    //  - $geoip_disable → 都市/国などの位置推定をしない
    try {
      posthog.register({ $ip: '0.0.0.0', $geoip_disable: true });
    } catch {}
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

// プラン(Free/Pro)を全イベントに付与する super property として登録。
// → PostHog 側で「アクティブユーザーを Free/Pro で分解」「Pro のリテンション」などが取れる。
export function setUserPlan(isPro: boolean): void {
  try {
    posthog?.register({ is_pro: isPro, plan: isPro ? 'pro' : 'free' });
  } catch {}
}

// イベント名（docs/05 §3 のイベント設計）
export const Ev = {
  appOpened: 'app_opened', // 起動。DAU/WAU・リテンション・新規(初回)の起点
  tabViewed: 'tab_viewed', // {tab} どのタブ(機能)が見られたか＝利用/未利用の把握
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
