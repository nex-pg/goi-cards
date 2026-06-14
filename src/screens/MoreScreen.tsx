// その他タブ: Proカード（開発用テストトグル）/ 表示モード / 免責 / 法務リンク / 復元購入。
// prototype/shell.jsx の MoreScreen を移植。docs/03・docs/05 参照。
import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../store/store';
import { useTheme, type ThemeMode } from '../theme/theme';
import { useToast } from '../hooks/useToast';
import { usePurchases } from '../iap/purchases';
import { Icon } from '../components/Icon';
import { SegTabs, Switch, panel } from '../components/ui';

// 申請時に GitHub Pages の正式URLへ（docs/ 配下の privacy.html / terms.html を公開）。
const PRIVACY_URL = 'https://nex-pg.github.io/goi-cards/privacy.html';
const TERMS_URL = 'https://nex-pg.github.io/goi-cards/terms.html';

export function MoreScreen({ proHighlight }: { proHighlight?: boolean }) {
  const store = useStore();
  const { colors: c, mode, setMode } = useTheme();
  const toast = useToast();
  const purchases = usePurchases();
  const isPro = store.isPro; // 実効（entitlement or 開発トグル）
  const devPro = store.state.pro; // 開発用トグルの値

  const open = (url: string) => Linking.openURL(url).catch(() => toast('リンクを開けませんでした'));

  const restore = async () => {
    if (!purchases.available) {
      toast('購入の復元は本番ビルドで有効になります');
      return;
    }
    const { restored } = await purchases.restore();
    toast(restored ? 'Pro を復元しました' : '復元できる購入が見つかりませんでした');
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink, marginVertical: 4, marginBottom: 18 }}>その他</Text>

      {/* Proカード */}
      <View
        style={[
          panel(c),
          { overflow: 'hidden', marginBottom: 18, borderColor: proHighlight ? c.ink : c.line, borderWidth: proHighlight ? 2 : 1 },
        ]}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <Icon name="star" size={20} filled color={c.ink} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>語彙トレカード Pro</Text>
            {isPro && (
              <View style={{ marginLeft: 'auto', backgroundColor: c.ink, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.paper }}>有効</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 13, color: c.sub, lineHeight: 23 }}>
            ・<Text style={{ color: c.ink }}>一覧機能</Text>（辞書ブラウズ・検索・タグ/分類/難易度の絞り込み）{'\n'}
            ・<Text style={{ color: c.ink }}>ブックマークの複数フォルダ管理</Text>（最大100）{'\n'}
            ・<Text style={{ color: c.ink }}>ダークモード</Text>（表示モードの切替）{'\n'}
            ・<Text style={{ color: c.ink }}>Pro限定の単語を利用可能</Text>
          </Text>
        </View>

        {/* 購入ボタン（未Pro かつ 課金が使える環境のときだけ表示） */}
        {!isPro && purchases.available && (
          <Pressable
            onPress={async () => {
              const r = await purchases.purchasePro();
              if (r === 'ok') toast('Pro を有効にしました');
              else if (r === 'error') toast('購入に失敗しました。時間をおいて再度お試しください');
              else if (r === 'unavailable') toast('現在購入できません');
              // cancelled はトーストしない
            }}
            style={{
              borderTopWidth: 1,
              borderTopColor: c.line,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Proにアップグレード</Text>
            {purchases.priceString && (
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{purchases.priceString}</Text>
            )}
          </Pressable>
        )}

        {/* 開発用テストトグル（__DEV__ のときのみ表示）。本番は RevenueCat の entitlement が真実（docs/03）。 */}
        {__DEV__ && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: c.line,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 13,
            }}
          >
            <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.ink }}>
              Proを有効にする
              <Text style={{ fontSize: 11, color: c.sub, fontWeight: '500' }}>（開発用）</Text>
            </Text>
            <Switch on={devPro} onChange={(v) => store.setPro(v)} />
          </View>
        )}

        {/* 購入を復元（Apple審査で必須） */}
        <Pressable
          onPress={restore}
          style={{
            borderTopWidth: 1,
            borderTopColor: c.line,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.ink }}>購入を復元</Text>
        </Pressable>
      </View>

      {/* 表示モード（ダークは Pro 機能。非Proでは選択不可＝ライト固定） */}
      <View style={[panel(c), { overflow: 'hidden' }]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>表示モード</Text>
            <SegTabs<ThemeMode>
              value={isPro ? mode : 'light'}
              disabled={!isPro}
              options={[
                { key: 'light', label: 'ライト' },
                { key: 'dark', label: 'ダーク' },
              ]}
              onChange={setMode}
            />
          </View>
          {!isPro && (
            <Text style={{ fontSize: 11.5, color: c.sub, marginTop: 8 }}>
              ダークモードは Pro 機能です
            </Text>
          )}
        </View>
      </View>

      {/* プライバシー（分析オプトアウト） */}
      <View style={[panel(c), { overflow: 'hidden', marginTop: 18 }]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>利用状況の分析を許可</Text>
            <Switch on={!store.state.analyticsOptOut} onChange={(v) => store.setAnalyticsOptOut(!v)} />
          </View>
          <Text style={{ fontSize: 11.5, color: c.sub, marginTop: 8, lineHeight: 18 }}>
            アプリ改善のため、匿名の利用状況（どの画面・機能を使ったか）を送信します。広告や個人の特定、他社アプリをまたぐ追跡は行いません。オフにすると送信を停止します。
          </Text>
        </View>
      </View>

      {/* 法務リンク */}
      <View style={[panel(c), { overflow: 'hidden', marginTop: 18 }]}>
        <LinkRow label="プライバシーポリシー" onPress={() => open(PRIVACY_URL)} />
        <LinkRow label="利用規約" onPress={() => open(TERMS_URL)} isLast />
      </View>

      {/* 免責表示 */}
      <View style={[panel(c), { overflow: 'hidden', marginTop: 18 }]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink, marginBottom: 8 }}>免責事項</Text>
          <Text style={{ fontSize: 12, color: c.sub, lineHeight: 22 }}>
            本アプリの語義・読み・分類・難易度は、学習用に簡略化した参考情報です。正確性・完全性を保証するものではありません。正式な定義は辞書等でご確認ください。
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function LinkRow({ label, onPress, isLast }: { label: string; onPress: () => void; isLast?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: c.line,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{label}</Text>
      <Icon name="chevR" size={18} color={c.sub} />
    </Pressable>
  );
}
