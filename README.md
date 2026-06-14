# 語彙トレカード（goi-cards）

語彙力・言語化トレーニングアプリの本番実装（Expo + React Native + TypeScript）。
プロトタイプ（`../prototype/語彙トレ.html`）の挙動を正として移植した。完全モノクロ。

このディレクトリは `../HANDOFF.md` / `../docs/` の引き継ぎ資料にもとづく実装です。

---

## セットアップ & 実行

```bash
cd goi-cards
npm install

# 開発（Metro 起動）
npx expo start
```

### ⚠️ Expo Go と EAS Dev Client について

ネイティブモジュール（**MMKV / Reanimated / Gesture Handler / SVG / draggable-flatlist**）を使うため、
**フル機能の確認には EAS Development Build（Dev Client）が必要**です。Expo Go では動かない要素があります。

- **永続化（MMKV）**は Expo Go では初期化に失敗します。その場合 `src/store/storage.ts` が
  **メモリ上のフォールバック**へ自動で切り替わるため UI は確認できますが、**再起動で保存内容は消えます**。
- 永続化・課金・全ジェスチャを正しく確認するには Dev Client を使ってください。

```bash
# EAS Dev Client（iOS 実機 / シミュレータ）
npm install -g eas-cli
eas login
eas build --profile development --platform ios
# → 生成された .app / TestFlight を実機に入れ、`npx expo start --dev-client` で接続
```

### 動作検証済み

- `npx tsc --noEmit` … 型エラーなし
- `npx expo-doctor` … 21/21 パス
- `npx expo export --platform ios` … バンドル成功（全 import 解決・Reanimated worklet 変換 OK）

> 注: 実機での目視確認は未実施（この環境にシミュレータがないため）。Dev Client での確認を推奨。

---

## 実装済み（HANDOFF の M0〜M6 UI）

| マイルストーン | 内容 | 状態 |
|---|---|---|
| M0 土台 | 5タブ骨組み（カスタム Shell）/ モノクロのデザイントークン（ライト/ダーク）/ 共通部品（Toast+Undo, Sheet, ConfirmSheet, PromptSheet, FolderPicker, StatusBadge, WordRow, Icon） | ✅ |
| M1 データ層 | `words.combined.json`（1000語）を Map 化 + 型 / MMKV 永続化 / `migrate()`・`schemaVersion` / Undo 用 `buildSnapshot`・`restore` / `isPro`→`visibleWords` | ✅ |
| M2 問題 | 設定（分類/タグ/難易度の複数選択・デフォルト値・該当数・問題数ダイアル）/ カード（タップでめくり・左右スワイプ送り・3ボタン・進捗・履歴記録）/ 結果 | ✅ |
| M3 リスト系 | 共通 List（FlatList・2行1組・並び順・編集モード）/ 左スワイプ単品削除（Undo）/ バッジのタップ解除 / 複数選択・全選択・削除（確認+Undo）・保存（タグ付与）・D&D並べ替え / ブックマーク・履歴・わかる/わからない | ✅ |
| M4 フォルダ | フォルダ一覧（追加/改名/削除/並べ替え・デフォルト固定・上限100・名前30字）/ 保存先フォルダ選択シート / フォルダ名表示・ボタン | ✅ |
| M5 一覧 | 検索（30字）/ 3行フィルタ（複数選択・「すべて」ロジック・OR/AND）/ 見出順リスト / 行右のタグ解除 / 編集モード（全選択/保存/タグ解除・大量確認） | ✅ |
| M6 Pro | Proゲート（一覧）/ Pro案内ダイアログ（フォルダ追加）/ その他Proカード / **単一フック `useIsPro`** / `__DEV__` のみのテストトグル | ✅（課金SDKは未接続・下記） |

free/pro の出し分けは `store.visibleWords` を全画面の起点にしており、`useIsPro()` の1箇所だけ
RevenueCat に差し替えれば本番化できる構造です（`docs/02 §3`・`docs/03`）。

---

## 未実装 / 要対応（外部アカウント・バイナリが必要なもの）

`src` 内に該当箇所のコメント（TODO）を残しています。

1. **RevenueCat（課金）** — `docs/03`。`src/hooks/useIsPro.ts` を実 entitlement に差し替え、
   `react-native-purchases` を導入。購入/復元フロー（その他タブの「購入を復元」を実装に接続）。
   ※ Apple Developer / App Store Connect / RevenueCat のアカウントが必要。実機 Sandbox でのみテスト可。
2. **フォント同梱** — `docs/01`。現在は OS 標準の serif/sans にフォールバック。
   `expo-font` で Noto Serif JP / Noto Sans JP を `assets/fonts/` に同梱し、`src/theme/theme.tsx` の
   `TERM_FONT_SERIF` / `TERM_FONT_SANS` を実フォント名に変更。
3. **法務リンク** — `src/screens/MoreScreen.tsx` の `PRIVACY_URL` / `TERMS_URL` / `REPORT_MAIL` を
   実 URL / 問い合わせ先に差し替え（`docs/05`）。
4. **分析（PostHog・任意）** — `docs/05 §3` のイベント設計を埋め込む。
5. **EAS Build / Submit → TestFlight → 申請** — `docs/05`・`docs/06 M8`。アイコン/スプラッシュ、
   App Store Connect メタデータ、プライバシーラベル、年齢区分など。
6. **データの最終レビュー** — `docs/02`/`docs/05`。意味のオリジナル言い換えを Gemini 二重レビュー＋人手確認。

---

## ディレクトリ構成

```
src/
  assets/words.combined.json   単語マスター（同梱・読み取り専用 1000語）
  data/words.ts                マスター読込 + Map + 型 + 定数（CATEGORIES/LEVELS/上限）
  store/
    storage.ts                 MMKV ラッパ（Expo Go ではメモリにフォールバック）
    store.tsx                  ユーザーデータ Store（タグ/ブックマーク/履歴/並び/設定, migrate, Undo）
  theme/theme.tsx              モノクロのデザイントークン + ライト/ダーク + 見出し書体
  hooks/
    useIsPro.ts                Pro判定の単一の入口（RevenueCat 差し替えポイント）
    useToast.tsx               Undo対応トースト Provider
  components/                  Icon, ui（Sheet等）, WordRow, SwipeRow, StartBar, TabBar, ProGate
  screens/                     QuizScreen, ListScreen, BrowseScreen, FolderListScreen, MoreScreen, RunnerScreen
  Shell.tsx                    外殻（タブ切替・画面ルーティング・リスト起動の問題・Proゲート）
App.tsx                        Providers の組み立て
```

## プロト ↔ 本番の対応

| プロト（Web） | 本番（RN・本実装） |
|---|---|
| `localStorage` | `react-native-mmkv`（`storage.ts`） |
| pointer events（スワイプ） | `react-native-gesture-handler` + `react-native-reanimated` |
| DOM リスト | `FlatList` / `react-native-draggable-flatlist`（編集モードD&D） |
| `store.pro`（トグル） | `useIsPro()`（`__DEV__` トグル + RevenueCat 差し替え予定） |
| CSS 変数（色） | `theme/theme.tsx` のトークン |
| `WORDS`（60語サンプル） | `assets/words.combined.json`（1000語超） |
| ボトムシート（DOM） | `Modal` ベースの `Sheet`（`components/ui.tsx`） |

---

## 環境変数（任意。未設定なら自動で no-op）

`cp .env.example .env` して値を入れる（`.env` は git 管理外）。EAS ビルドでは `eas secret:create` で設定。

| 変数 | 用途 |
|---|---|
| `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_HOST` | 分析（PostHog）。未設定なら送信なし |
| `EXPO_PUBLIC_RC_IOS_KEY` | 課金（RevenueCat / iOS）。未設定なら購入UI非表示 |

`npm run licenses` で `src/assets/licenses.json`（OSSライセンス画面のデータ）を再生成。

---

## リリース手順チェックリスト（iOS）

> 前提: **Apple Developer Program 承認**が完了するまで、TestFlight / App Store Connect / 実機配布・課金テストは開始できない。

### フェーズ0–1：方針・素材（承認前にできる）
- [ ] 価格決定（¥500 買い切り）／プロダクトID（例 `pro_lifetime`）
- [ ] アプリアイコン 1024×1024 とスプラッシュを差し替え（現状 Expo デフォルト）
- [x] iPad 非対応（`app.json` `supportsTablet:false`）＝ iPad スクショ/検証 不要
- [x] 輸出コンプライアンス（`ios.config.usesNonExemptEncryption:false`）
- [ ] 単語データの最終レビュー（Gemini 二重チェック＋人手。docs/05）
- [ ] フォント同梱（Noto Serif/Sans JP）※任意

### フェーズ2：Mac でのローカル確認（承認前にできる）
- [ ] `npx expo run:ios`（シミュレータ）で全機能確認 ← 実質必須
- [ ] `npx expo run:ios --device`（実機）※課金テストは承認後に Sandbox で

### フェーズ3：外部サービス
- [ ] GitHub Pages 公開（`docs/privacy.html` / `terms.html`）→ 連絡先・施行日・管轄を記入
- [ ] サポートURL/問い合わせ先を用意（申請に必要）
- [ ] PostHog プロジェクト作成 → キーを設定（分析を入れる場合）
- [ ] RevenueCat: アプリ登録 / 共有シークレット / Entitlement `pro` / Offering（買い切り1本）/ APIキー

### フェーズ4：App Store Connect（承認後）
- [ ] アプリレコード作成（Bundle ID `com.goicards.app`）
- [ ] 有料App契約＋銀行/税情報の登録 ← これが無いと課金が動かない
- [ ] App内課金（非消耗型・¥500・名称/説明/審査スクショ）
- [ ] スクリーンショット（iPhone 6.9"/6.7" 1セット。iPad不要）
- [ ] プライバシー栄養ラベル（分析ありなら Usage Data/Analytics、Tracking=いいえ）
- [ ] 年齢区分・カテゴリ（教育）・説明文・キーワード

### フェーズ5：ビルド & TestFlight（承認後）
- [ ] `eas build -p ios --profile production` → `eas submit -p ios`
- [ ] TestFlight 内部テストで実機確認＋IAP Sandbox（購入/復元）

### フェーズ6：申請 & リリース
- [ ] 審査用メモ（Pro機能の説明／`__DEV__`トグルは本番非表示）
- [ ] 「審査に提出」（＝App Store申請）
- [ ] 承認後リリース
