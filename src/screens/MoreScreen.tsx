// その他タブ: Proカード（開発用テストトグル）/ 表示モード / 分析オプトアウト / 免責 / 復元購入。
// 法務は最小構成（App Store にプライバシーポリシーURL＋Apple標準EULA）。アプリ内リンクは置かない。
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../store/store';
import { useTheme, type ThemeMode } from '../theme/theme';
import { useToast } from '../hooks/useToast';
import { usePurchases } from '../iap/purchases';
import { Icon } from '../components/Icon';
import { SegTabs, Switch, panel } from '../components/ui';

export function MoreScreen({ proHighlight }: { proHighlight?: boolean }) {
  const store = useStore();
  const { colors: c, mode, setMode } = useTheme();
  const toast = useToast();
  const purchases = usePurchases();
  const isPro = store.isPro; // 実効（entitlement or 開発トグル）
  const devPro = store.state.pro; // 開発用トグルの値

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

      {/*
        分析オプトアウトのUIは非表示（参考アプリに合わせ最小構成）。
        ON/OFF の仕組みはコードに残してあるので、再表示したい場合は
        store.state.analyticsOptOut / store.setAnalyticsOptOut(...) を使う Switch を
        ここに置けばよい（既定は false＝分析オン。Shell が analytics 側へ反映する）。
      */}

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
